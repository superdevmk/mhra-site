const INFO_TABLE = "informative_posts";
const INFO_BUCKET = "informative-assets";

const form = document.getElementById("info-form");
const filesInput = document.getElementById("info-files");
const tableBody = document.querySelector("#info-table tbody");
const filterSelect = document.getElementById("info-language-filter");

// helper: merr user-in për author_id
async function getCurrentUserId() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data?.user) {
    console.error("No user", error);
    alert("You must be logged in to use admin.");
    return null;
  }
  return data.user.id;
}

// upload i një file-i në storage -> public URL
async function uploadSingleFile(file) {
  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const path = `${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(INFO_BUCKET)
    .upload(path, file);

  if (uploadError) {
    console.error("Upload error", uploadError);
    throw uploadError;
  }

  const { data } = supabaseClient.storage
    .from(INFO_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

async function uploadAllFiles() {
  if (!filesInput || !filesInput.files.length) return [];

  const files = Array.from(filesInput.files);
  const urls = [];

  for (const file of files) {
    const url = await uploadSingleFile(file);
    urls.push(url);
  }

  return urls;
}

// load lista e posteve në tabelë
async function loadInformativeAdmin(lang = "mk") {
  if (!tableBody) return;

  const { data, error } = await supabaseClient
    .from(INFO_TABLE)
    .select("*")
    .eq("language", lang)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching informative posts", error);
    tableBody.innerHTML =
      "<tr><td colspan='3'>Error loading posts</td></tr>";
    return;
  }

  if (!data.length) {
    tableBody.innerHTML =
      "<tr><td colspan='3'>No posts yet.</td></tr>";
    return;
  }

  tableBody.innerHTML = data
    .map(
      (p) => `
      <tr>
        <td>${p.title}</td>
        <td>${p.language}</td>
        <td>${new Date(p.created_at).toLocaleDateString()}</td>
      </tr>
    `
    )
    .join("");
}

// ndërrim gjuhe në filter
if (filterSelect) {
  filterSelect.addEventListener("change", () => {
    loadInformativeAdmin(filterSelect.value);
  });
}

// submit i formës
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const authorId = await getCurrentUserId();
    if (!authorId) return;

    const formData = new FormData(form);

    try {
      // 1) upload files në storage
      const imageUrls = await uploadAllFiles();

      // 2) përgatit payload për DB
      const payload = {
        author_id: authorId,
        language: formData.get("language"),
        title: formData.get("title"),
        subtitle: formData.get("subtitle") || null,
        body: formData.get("body"),
        images: imageUrls,
        published: formData.get("published") === "on",
      };

      // 3) insert në informative_posts
      const { error } = await supabaseClient
        .from(INFO_TABLE)
        .insert(payload);

      if (error) {
        console.error("Error inserting informative post", error);
        alert("Error saving post");
        return;
      }

      alert("Post saved");
      const lang = payload.language;
      form.reset();
      form.language.value = lang;
      if (filesInput) filesInput.value = "";
      loadInformativeAdmin(lang);
    } catch (err) {
      console.error(err);
      alert("Error uploading files");
    }
  });
}

// init
document.addEventListener("DOMContentLoaded", () => {
  if (filterSelect) {
    loadInformativeAdmin(filterSelect.value || "mk");
  }
});
