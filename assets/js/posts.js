async function fetchPosts({ language, publishedOnly } = {}) {
  const extended =
    "id, title, body, body_format, excerpt, image_url, language, published, created_at, author_id, slug";
  const legacy = "id, title, body, image_url, created_at, author_id";

  async function run(select) {
    let q = supabaseClient.from("posts").select(select).order("created_at", { ascending: false });
    if (language && select.includes("language")) q = q.eq("language", language);
    if (publishedOnly && select.includes("published")) q = q.eq("published", true);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  try {
    return await run(extended);
  } catch (err) {
    if (err?.code === "42703" || /column/i.test(err?.message || "")) {
      const rows = await run(legacy);
      return rows.map((r) => ({
        ...r,
        language: language || getPageLang(),
        published: true,
        body_format: "plain",
      }));
    }
    throw err;
  }
}

async function createPost({ title, body, bodyFormat, language, imageFile, excerpt, published }) {
  const session = await getSession();
  if (!session) throw new Error("Not logged in");

  const userId = session.user.id;
  let imageUrl = null;

  if (imageFile) {
    const fileExt = imageFile.name.split(".").pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage
      .from("blog-images")
      .upload(filePath, imageFile);
    if (uploadError) throw uploadError;
    const { data: publicData } = supabaseClient.storage.from("blog-images").getPublicUrl(filePath);
    imageUrl = publicData.publicUrl;
  }

  const lang = language || getPageLang();
  const slug = slugify(title) + "-" + Date.now().toString(36);

  const payload = {
    title,
    body,
    image_url: imageUrl,
    author_id: userId,
  };

  const extended = {
    body_format: bodyFormat || "html",
    excerpt: excerpt || bodyPlainPreview(body, bodyFormat || "html", 160),
    language: lang,
    published: published !== false,
    published_at: published !== false ? new Date().toISOString() : null,
    slug,
  };

  let { data, error } = await supabaseClient.from("posts").insert([{ ...payload, ...extended }]).select().single();
  if (error && (error.code === "42703" || /column/i.test(error.message || ""))) {
    ({ data, error } = await supabaseClient.from("posts").insert([payload]).select().single());
  }
  if (error) throw error;
  return data;
}

async function updatePost(postId, { title, body, bodyFormat, imageFile, excerpt, published }) {
  const session = await getSession();
  if (!session) throw new Error("Not logged in");

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (body !== undefined) {
    updates.body = body;
    updates.body_format = bodyFormat || "html";
  }
  if (excerpt !== undefined) updates.excerpt = excerpt;
  if (published !== undefined) {
    updates.published = published;
    updates.published_at = published ? new Date().toISOString() : null;
  }

  if (imageFile) {
    const fileExt = imageFile.name.split(".").pop();
    const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage
      .from("blog-images")
      .upload(filePath, imageFile);
    if (uploadError) throw uploadError;
    const { data: publicData } = supabaseClient.storage.from("blog-images").getPublicUrl(filePath);
    updates.image_url = publicData.publicUrl;
  }

  const core = {};
  if (title !== undefined) core.title = title;
  if (body !== undefined) core.body = body;
  if (updates.image_url) core.image_url = updates.image_url;

  let { data, error } = await supabaseClient.from("posts").update({ ...core, ...updates }).eq("id", postId).select().single();
  if (error && (error.code === "42703" || /column/i.test(error.message || ""))) {
    ({ data, error } = await supabaseClient.from("posts").update(core).eq("id", postId).select().single());
  }
  if (error) throw error;
  return data;
}

async function deletePost(postId) {
  const session = await getSession();
  if (!session) throw new Error("Not logged in");

  const { error } = await supabaseClient.from("posts").delete().eq("id", postId);
  if (error) throw error;
  return true;
}
