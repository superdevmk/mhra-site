// assets/js/posts.js
// Операции за блог постови (Supabase: posts + Storage за слики)

/**
 * Ги враќа сите постови (најновите први).
 */
async function fetchPosts() {
  const { data, error } = await supabaseClient
    .from("posts")
    .select("id, title, body, image_url, created_at, author_id")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Креира нов пост.
 * Ако има селектирано слика, прво ја качува во Supabase Storage (bucket: blog-images)
 * и ја снима јавната URL во колоната image_url.
 */
async function createPost({ title, body, imageFile }) {
  const session = await getSession();
  if (!session) {
    throw new Error("Не сте најавени.");
  }

  const userId = session.user.id;
  let imageUrl = null;

  if (imageFile) {
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("blog-images")
      .upload(filePath, imageFile);

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabaseClient.storage
      .from("blog-images")
      .getPublicUrl(filePath);

    imageUrl = publicData.publicUrl;
  }

  const { data, error } = await supabaseClient
    .from("posts")
    .insert([
      {
        title,
        body,
        image_url: imageUrl,
        author_id: userId,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Го брише постот со дадено id.
 * RLS во Supabase треба да дозволи DELETE само за авторот.
 */
async function deletePost(postId) {
  const session = await getSession();
  if (!session) {
    throw new Error("Не сте најавени.");
  }

  const { error } = await supabaseClient
    .from("posts")
    .delete()
    .eq("id", postId);

  if (error) throw error;
  return true;
}
