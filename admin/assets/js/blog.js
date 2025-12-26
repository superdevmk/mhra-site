// assets/js/blog.js
// Блог: јавни постови + креирање и бришење за автори

// Elemente nga DOM-i
const blogGridEl = document.getElementById("blog-grid");
const blogEmptyEl = document.getElementById("blog-empty");

const authorBtn = document.getElementById("author-btn");
const createSection = document.getElementById("create-post-section");
const createForm = document.getElementById("create-post-form");
const createTitleInput = document.getElementById("post-title");
const createBodyInput = document.getElementById("post-body");
const createImageInput = document.getElementById("post-image");
const createStatusEl = document.getElementById("create-post-status");

// Modal
const modalEl = document.getElementById("blog-modal");
const modalTitleEl = document.getElementById("blog-modal-title");
const modalAuthorEl = document.getElementById("blog-modal-author");
const modalDateEl = document.getElementById("blog-modal-date");
const modalBodyEl = document.getElementById("blog-modal-body");
const modalImageEl = document.getElementById("blog-modal-image");
const modalDeleteBtn = document.getElementById("blog-modal-delete");
const modalCloseBtn = modalEl ? modalEl.querySelector(".blog-modal__close") : null;
const modalBackdrop = modalEl ? modalEl.querySelector(".blog-modal__backdrop") : null;

let currentUserId = null;
let postsCache = [];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function setCreateStatus(msg, isError = false) {
  if (!createStatusEl) return;
  createStatusEl.textContent = msg || "";
  createStatusEl.style.color = isError ? "crimson" : "";
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("mk-MK", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

async function getCurrentSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error("auth.getSession error:", error);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error("getCurrentSession error:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
// AUTH UI (login/logout + forma për krijim)
// ─────────────────────────────────────────────

function updateAuthUI(session) {
  currentUserId = session ? session.user.id : null;

  // butoni lart djathtas
  if (authorBtn) {
    if (session) {
      authorBtn.textContent = "Одјава";
      authorBtn.href = "#";
      authorBtn.onclick = async (e) => {
        e.preventDefault();
        try {
          await supabaseClient.auth.signOut();
          window.location.reload();
        } catch (err) {
          alert(err.message || "Настана грешка при одјава.");
        }
      };
    } else {
      authorBtn.textContent = "Најава за автор";
      authorBtn.href = "login.html";
      authorBtn.onclick = null;
    }
  }

  // forma Create post – vetëm kur je i loguar
  if (createSection) {
    createSection.style.display = session ? "block" : "none";
  }
}

async function refreshAuthUI() {
  const session = await getCurrentSession();
  updateAuthUI(session);
}

// ─────────────────────────────────────────────
// POSTS – marrje dhe render
// ─────────────────────────────────────────────

async function loadPosts() {
  try {
    // përdor funksionin nga posts.js
    const posts = await fetchPosts();
    postsCache = posts || [];

    if (!postsCache.length) {
      blogGridEl.innerHTML = "";
      blogEmptyEl.style.display = "block";
      return;
    }

    blogEmptyEl.style.display = "none";
    renderPosts(postsCache);
  } catch (err) {
    console.error("loadPosts error:", err);
    blogEmptyEl.style.display = "block";
    blogEmptyEl.textContent = "Настана грешка при вчитување на блоговите.";
  }
}

function renderPosts(posts) {
  if (!blogGridEl) return;
  blogGridEl.innerHTML = "";

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "card card--blog";

    // foto (nëse ka)
    if (post.image_url) {
      const img = document.createElement("img");
      img.className = "card__image";
      img.src = post.image_url;
      img.alt = post.title || "";
      card.appendChild(img);
    }

    const titleEl = document.createElement("h3");
    titleEl.className = "card__title";
    titleEl.textContent = post.title || "";

    const metaEl = document.createElement("p");
    metaEl.className = "card__meta";
    metaEl.textContent = formatDate(post.created_at);

    const bodyEl = document.createElement("p");
    bodyEl.className = "card__text card__text--clamp";
    const body = post.body || "";
    const preview = body.length > 200 ? body.slice(0, 200) + "..." : body;
    bodyEl.textContent = preview;

    const readBtn = document.createElement("button");
    readBtn.type = "button";
    readBtn.className = "btn btn--outline blog-read-btn";
    readBtn.textContent = "Прочитај повеќе";
    readBtn.addEventListener("click", () => openPostModal(post));

    card.appendChild(titleEl);
    card.appendChild(metaEl);
    card.appendChild(bodyEl);
    card.appendChild(readBtn);

    blogGridEl.appendChild(card);
  });
}

// ─────────────────────────────────────────────
// MODAL – open/close post (version i thjeshtë)
// ─────────────────────────────────────────────

function openPostModal(post) {
  if (!modalEl) {
    console.warn("blog-modal nuk u gjet në DOM");
    return;
  }

  // Titull
  modalTitleEl.textContent = post.title || "";

  // Autor (thjesht ID e shkurtuar)
  modalAuthorEl.textContent = post.author_id
    ? "Автор: " + post.author_id.slice(0, 8)
    : "";

  // Datë
  modalDateEl.textContent = formatDate(post.created_at);

  // Teksti (markdown nëse ekziston marked)
  const rawBody = post.body || "";
  if (window.marked && typeof window.marked.parse === "function") {
    modalBodyEl.innerHTML = window.marked.parse(rawBody);
  } else {
    modalBodyEl.textContent = rawBody;
  }

  // Foto në modal
  if (modalImageEl) {
    if (post.image_url) {
      modalImageEl.src = post.image_url;
      modalImageEl.alt = post.title || "";
      modalImageEl.style.display = "block";
    } else {
      modalImageEl.style.display = "none";
    }
  }

  // Butoni Delete – vetëm për autorin
  if (modalDeleteBtn) {
    if (currentUserId && currentUserId === post.author_id) {
      modalDeleteBtn.style.display = "inline-block";
      modalDeleteBtn.onclick = async () => {
        if (!confirm("Дали сте сигурни дека сакате да го избришете блогот?")) {
          return;
        }
        try {
          await deletePost(post.id); // nga posts.js
          closePostModal();
          await loadPosts();
        } catch (err) {
          console.error(err);
          alert(err.message || "Настана грешка при бришење.");
        }
      };
    } else {
      modalDeleteBtn.style.display = "none";
      modalDeleteBtn.onclick = null;
    }
  }

  // KËTU E HAPIM – shumë thjeshtë
  modalEl.style.display = "block";
  modalEl.setAttribute("aria-hidden", "false");
}

function closePostModal() {
  if (!modalEl) return;
  modalEl.style.display = "none";
  modalEl.setAttribute("aria-hidden", "true");
}

function initModalEvents() {
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closePostModal);
  }
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", closePostModal);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePostModal();
  });
}


// ─────────────────────────────────────────────
// CREATE POST FORM
// ─────────────────────────────────────────────

async function handleCreateSubmit(e) {
  e.preventDefault();

  const title = createTitleInput.value.trim();
  const body = createBodyInput.value.trim();
  const imageFile = createImageInput && createImageInput.files[0];

  if (!title || !body) {
    setCreateStatus("Насловот и содржината се задолжителни.", true);
    return;
  }

  setCreateStatus("Се креира блог...", false);

  try {
    await createPost({ title, body, imageFile }); // nga posts.js
    setCreateStatus("Блогот е креиран успешно.", false);
    createForm.reset();
    await loadPosts();
  } catch (err) {
    console.error(err);
    setCreateStatus(
      err.message || "Настана грешка при креирање на блог.",
      true
    );
  }
}

function initCreateForm() {
  if (!createForm) return;
  createForm.addEventListener("submit", handleCreateSubmit);
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  initModalEvents();
  initCreateForm();

  await refreshAuthUI();
  await loadPosts();

  // kur ndryshon auth (login/logout) → rifresko UI
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session);
  });
});
