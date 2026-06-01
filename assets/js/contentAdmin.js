(function () {
  const config = window.MHRA_ADMIN_CONFIG || {};
  const TABLE = config.table;
  const BUCKET = config.bucket;
  const PAGE_TITLE = config.title || "Admin";

  let quill = null;
  let editingId = null;

  async function getCurrentUserId() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  }

  async function uploadGalleryFiles(files) {
    if (!files || !files.length) return [];
    const urls = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabaseClient.storage.from(BUCKET).upload(path, file);
      if (error) throw error;
      const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function loadList(lang) {
    const tbody = document.querySelector("#admin-table tbody");
    if (!tbody) return;

    const { data, error } = await supabaseClient
      .from(TABLE)
      .select("id, title, language, published, created_at")
      .eq("language", lang)
      .order("created_at", { ascending: false });

    if (error) {
      tbody.innerHTML = `<tr><td colspan="5">Error: ${escapeHtml(error.message)}</td></tr>`;
      return;
    }

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="5">No posts yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data
      .map(
        (row) => `
      <tr>
        <td>${escapeHtml(row.title)}</td>
        <td>${escapeHtml(row.language)}</td>
        <td>${row.published ? "Yes" : "Draft"}</td>
        <td>${formatContentDate(row.created_at, "en")}</td>
        <td class="admin-table__actions">
          <button type="button" class="btn btn--outline btn--sm" data-edit-id="${row.id}">Edit</button>
          <button type="button" class="btn btn--outline btn--sm" data-delete-id="${row.id}">Delete</button>
        </td>
      </tr>`
      )
      .join("");
  }

  async function loadForEdit(id) {
    const { data, error } = await supabaseClient.from(TABLE).select("*").eq("id", id).single();
    if (error) {
      alert(error.message);
      return;
    }
    editingId = id;
    const form = document.getElementById("admin-form");
    if (!form) return;
    form.title.value = data.title || "";
    form.subtitle.value = data.subtitle || "";
    form.language.value = data.language || "mk";
    form.published.checked = !!data.published;
    if (form.event_date) form.event_date.value = data.event_date || "";
    if (form.location) form.location.value = data.location || "";
    if (form.year) form.year.value = data.year || "";
    setEditorHtml(quill, data.body || "");
    document.getElementById("form-mode-label").textContent = "Edit post #" + id;
  }

  async function deleteRow(id) {
    if (!confirm("Delete this item permanently?")) return;
    const { error } = await supabaseClient.from(TABLE).delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    const lang = document.getElementById("admin-language-filter")?.value || "mk";
    loadList(lang);
  }

  function resetForm() {
    editingId = null;
    const form = document.getElementById("admin-form");
    if (form) form.reset();
    setEditorHtml(quill, "");
    document.getElementById("form-mode-label").textContent = "Create new";
    const files = document.getElementById("admin-files");
    if (files) files.value = "";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!TABLE || !BUCKET) return;

    await requireAdminSession();

    const titleEl = document.getElementById("admin-page-title");
    if (titleEl) titleEl.textContent = PAGE_TITLE;

    quill = initRichEditor("admin-editor", {
      bucket: "content-media",
      hiddenInput: "admin-body-html",
      placeholder: "Write article content…",
    });

    const filter = document.getElementById("admin-language-filter");
    if (filter) {
      filter.addEventListener("change", () => loadList(filter.value));
      loadList(filter.value || "mk");
    }

    document.getElementById("admin-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userId = await getCurrentUserId();
      if (!userId) return;

      const form = e.target;
      const fd = new FormData(form);
      const bodyHtml = getEditorHtml(quill);
      if (!bodyHtml || bodyHtml === "<p><br></p>") {
        alert("Body is required");
        return;
      }

      try {
        const imageUrls = await uploadGalleryFiles(document.getElementById("admin-files")?.files);
        let images = imageUrls;

        if (editingId) {
          const { data: existingRow } = await supabaseClient
            .from(TABLE)
            .select("images")
            .eq("id", editingId)
            .single();
          images = [...(existingRow?.images || []), ...imageUrls];
        }

        const payload = {
          author_id: userId,
          language: fd.get("language"),
          title: fd.get("title"),
          subtitle: fd.get("subtitle") || null,
          body: bodyHtml,
          body_format: "html",
          images,
          published: fd.get("published") === "on",
        };

        if (form.event_date) payload.event_date = fd.get("event_date") || null;
        if (form.location) payload.location = fd.get("location") || null;
        if (form.year) payload.year = fd.get("year") ? Number(fd.get("year")) : null;

        let error;
        if (editingId) {
          ({ error } = await supabaseClient.from(TABLE).update(payload).eq("id", editingId));
        } else {
          ({ error } = await supabaseClient.from(TABLE).insert(payload));
        }

        if (error) throw error;
        alert(editingId ? "Updated" : "Saved");
        resetForm();
        loadList(payload.language);
      } catch (err) {
        alert(err.message || "Save failed");
      }
    });

    document.getElementById("admin-reset-btn")?.addEventListener("click", resetForm);

    document.addEventListener("click", (ev) => {
      const editId = ev.target.getAttribute("data-edit-id");
      const deleteId = ev.target.getAttribute("data-delete-id");
      if (editId) loadForEdit(Number(editId));
      if (deleteId) deleteRow(Number(deleteId));
    });

    document.getElementById("admin-signout")?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await signOut();
      window.location.href = "login.html";
    });
  });
})();
