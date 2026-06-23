const blogGridEl = document.getElementById("blog-grid");
const blogEmptyEl = document.getElementById("blog-empty");
const authorBtn = document.getElementById("author-btn");
const createSection = document.getElementById("create-post-section");
const createForm = document.getElementById("create-post-form");
const createTitleInput = document.getElementById("post-title");
const createBodyHidden = document.getElementById("post-body-html");
const createImageInput = document.getElementById("post-image");
const createStatusEl = document.getElementById("create-post-status");
const editSection = document.getElementById("edit-post-section");
const formHeadingEl = document.getElementById("post-form-heading");
const submitBtnEl = document.getElementById("post-submit-btn");
const cancelEditBtnEl = document.getElementById("post-cancel-edit-btn");

let blogQuill = null;
let currentUserId = null;
let postsCache = [];
let editingPostId = null;
let blogCoverPreviewObjectUrl = null;

function t(key) {
  const lang = getPageLang();
  const map = {
    login: { mk: "Најава", en: "Log in" },
    logout: { mk: "Одјава", en: "Log out" },
    register: { mk: "Регистрација", en: "Sign up" },
    readMore: { mk: "Прочитај повеќе", en: "Read more" },
    edit: { mk: "Уреди", en: "Edit" },
    publish: { mk: "Објави блог", en: "Publish post" },
    saveEdit: { mk: "Зачувај промени", en: "Save changes" },
    cancelEdit: { mk: "Откажи", en: "Cancel" },
    createHeading: { mk: "Креирај нов блог", en: "Create a new post" },
    editHeading: { mk: "Уреди блог", en: "Edit post" },
    editingMode: { mk: "Режим на уредување", en: "Editing mode" },
    empty: { mk: "Нема објавени блогови.", en: "No blog posts yet." },
    error: { mk: "Грешка при вчитување.", en: "Failed to load posts." },
  };
  return map[key]?.[lang] || map[key]?.mk || key;
}

function setEditorModeUI(isEditing) {
  if (formHeadingEl) {
    formHeadingEl.textContent = isEditing ? t("editHeading") : t("createHeading");
  }
  if (submitBtnEl) {
    submitBtnEl.textContent = isEditing ? t("saveEdit") : t("publish");
  }
  if (cancelEditBtnEl) {
    cancelEditBtnEl.style.display = isEditing ? "inline-flex" : "none";
    cancelEditBtnEl.textContent = t("cancelEdit");
  }
  if (editSection) {
    editSection.style.display = isEditing ? "block" : "none";
    editSection.textContent = isEditing ? t("editingMode") : "";
  }
}

function revokeBlogCoverPreviewUrl() {
  if (blogCoverPreviewObjectUrl) {
    URL.revokeObjectURL(blogCoverPreviewObjectUrl);
    blogCoverPreviewObjectUrl = null;
  }
}

function renderBlogCoverPreview(imageUrl, file) {
  const el = document.getElementById("post-cover-preview");
  if (!el) return;

  revokeBlogCoverPreviewUrl();
  let previewSrc = imageUrl || null;
  if (file) {
    blogCoverPreviewObjectUrl = URL.createObjectURL(file);
    previewSrc = blogCoverPreviewObjectUrl;
  }

  if (!previewSrc) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }

  el.hidden = false;
  el.innerHTML = `
    <figure class="admin-cover-preview__figure">
      <img src="${escapeHtml(previewSrc)}" alt="" loading="lazy">
      <figcaption>${file ? (getPageLang() === "mk" ? "Нова насловна слика" : "New cover image") : (getPageLang() === "mk" ? "Тековна насловна слика" : "Current cover image")}</figcaption>
    </figure>`;
}

function cancelEdit() {
  editingPostId = null;
  if (createForm) createForm.reset();
  if (blogQuill) setEditorHtml(blogQuill, "");
  revokeBlogCoverPreviewUrl();
  renderBlogCoverPreview(null, null);
  setEditorModeUI(false);
  setStatus("", false);
  if (window.history.replaceState) {
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState({}, "", url.pathname + url.search);
  }
}
function setStatus(msg, isError) {
  if (!createStatusEl) return;
  createStatusEl.textContent = msg || "";
  createStatusEl.style.color = isError ? "crimson" : "";
}

function updateAuthUI(session) {
  currentUserId = session ? session.user.id : null;
  if (authorBtn) {
    if (session) {
      authorBtn.textContent = t("logout");
      authorBtn.href = "#";
      authorBtn.onclick = async (e) => {
        e.preventDefault();
        await signOut();
        window.location.reload();
      };
    } else {
      authorBtn.textContent = t("login");
      authorBtn.href = "login.html";
      authorBtn.onclick = null;
    }
  }
  if (createSection) createSection.style.display = session ? "block" : "none";
  if (!editingPostId) setEditorModeUI(false);
}

async function loadPosts() {
  if (!blogGridEl || !blogEmptyEl) return;
  try {
    const lang = getPageLang();
    postsCache = await fetchPosts({ language: lang, publishedOnly: true });

    if (!postsCache.length) {
      blogGridEl.innerHTML = "";
      blogEmptyEl.style.display = "block";
      blogEmptyEl.textContent = t("empty");
      return;
    }

    blogEmptyEl.style.display = "none";
    blogGridEl.innerHTML = postsCache.map(renderBlogCard).join("");
  } catch (err) {
    console.error(err);
    blogEmptyEl.style.display = "block";
    blogEmptyEl.textContent = t("error");
  }
}

function renderBlogCard(post) {
  const preview = post.excerpt || bodyPlainPreview(post.body, post.body_format, 180);
  const url = postPageUrl("posts", post.id);
  const img = post.image_url
    ? `<img class="card__image" src="${escapeHtml(post.image_url)}" alt="" loading="lazy">`
    : "";
  const canEdit = currentUserId && currentUserId === post.author_id;

  return `
    <article class="card card--blog">
      <a class="card__link" href="${escapeHtml(url)}">
        ${img}
        <h3 class="card__title">${escapeHtml(post.title)}</h3>
        <p class="card__meta">${formatContentDate(post.created_at, getPageLang())}</p>
        <p class="card__text card__text--clamp">${escapeHtml(preview)}</p>
      </a>
      <div class="card__actions">
        <a class="btn btn--outline" href="${escapeHtml(url)}">${t("readMore")}</a>
        ${canEdit ? `<button type="button" class="btn btn--outline btn--sm" data-blog-edit="${post.id}">${t("edit")}</button>` : ""}
      </div>
    </article>`;
}

function startEditPost(id) {
  const post = postsCache.find((p) => Number(p.id) === Number(id));
  if (!post || !blogQuill) return;
  editingPostId = id;
  createTitleInput.value = post.title;
  setEditorHtml(blogQuill, post.body);
  if (createBodyHidden) createBodyHidden.value = post.body;
  if (createImageInput) createImageInput.value = "";
  renderBlogCoverPreview(post.image_url, null);
  setEditorModeUI(true);
  createSection.scrollIntoView({ behavior: "smooth" });
  setStatus(t("editingMode"), false);
}

async function handleCreateSubmit(e) {
  e.preventDefault();
  const title = createTitleInput.value.trim();
  const body = getEditorHtml(blogQuill);
  const imageFile = createImageInput?.files?.[0];

  if (!title || !body || body === "<p><br></p>") {
    setStatus(getPageLang() === "mk" ? "Наслов и содржина се задолителни." : "Title and body required.", true);
    return;
  }

  setStatus(getPageLang() === "mk" ? "Се зачувува…" : "Saving…", false);

  try {
    if (editingPostId) {
      await updatePost(editingPostId, { title, body, bodyFormat: "html", imageFile });
    } else {
      await createPost({ title, body, bodyFormat: "html", language: getPageLang(), imageFile });
    }
    cancelEdit();
    setStatus(getPageLang() === "mk" ? "Зачувано." : "Saved.", false);
    await loadPosts();
  } catch (err) {
    setStatus(err.message, true);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  blogQuill = initRichEditor("blog-editor", {
    bucket: "blog-images",
    hiddenInput: "post-body-html",
    placeholder: getPageLang() === "mk" ? "Напиши блог…" : "Write your post…",
  });

  if (createForm) createForm.addEventListener("submit", handleCreateSubmit);
  if (cancelEditBtnEl) cancelEditBtnEl.addEventListener("click", cancelEdit);
  createImageInput?.addEventListener("change", () => {
    renderBlogCoverPreview(null, createImageInput.files?.[0] || null);
  });

  setEditorModeUI(false);

  document.addEventListener("click", (ev) => {
    const editId = ev.target.getAttribute("data-blog-edit");
    if (editId) startEditPost(Number(editId));
  });

  await updateAuthUI(await getSession());
  await loadPosts();

  const editParam = new URLSearchParams(window.location.search).get("edit");
  if (editParam) startEditPost(Number(editParam));

  supabaseClient.auth.onAuthStateChange((_e, session) => updateAuthUI(session));
});
