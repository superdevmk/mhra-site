const INFO_TABLE = "informative_posts";

const infoState = {
  posts: [],
  currentPost: null,
  currentImageIndex: 0,
};

function getLang() {
  const htmlLang = document.documentElement.lang || "mk";
  return htmlLang.toLowerCase().startsWith("en") ? "en" : "mk";
}

function formatDate(dateString, lang) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const opts = { year: "numeric", month: "short", day: "numeric" };
  try {
    return d.toLocaleDateString(
      lang === "mk" ? "mk-MK" : "en-GB",
      opts
    );
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function renderInfoCard(post, lang) {
  const btnLabel = lang === "mk" ? "Прочитај повеќе" : "Read more";
  const date = formatDate(post.created_at, lang);

  const img =
    post.images && post.images.length
      ? `<img src="${post.images[0]}" alt="" style="width:100%;height:180px;object-fit:cover;border-radius:16px;">`
      : "";

  return `
    <article style="background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.06)">
      ${img}
      <div style="margin-top:12px;color:#6b7280;font-size:12px">${date}</div>
      <h3 style="margin:8px 0 6px;font-size:18px">${post.title || ""}</h3>
      ${post.subtitle ? `<div style="color:#6b7280;margin-bottom:10px">${post.subtitle}</div>` : ""}
      <button class="btn btn--outline info-card__more" data-info-id="${post.id}" type="button">
        ${btnLabel}
      </button>
    </article>
  `;
}


async function fetchInformativePosts(lang) {
  const q = supabaseClient
    .from("informative_posts")
    .select("*")
    .eq("language", lang)
    .order("created_at", { ascending: false });

  const { data, error } = await q;

  console.log("INFO fetch lang=", lang, "error=", error, "rows=", data?.length, data);

  if (error) return [];
  return data || [];
}


function openInfoModal(post) {
  infoState.currentPost = post;
  infoState.currentImageIndex = 0;

  const modal = document.getElementById("info-modal");
  if (!modal) return;

  const titleEl = document.getElementById("info-modal-title");
  const subtitleEl = document.getElementById("info-modal-subtitle");
  const bodyEl = document.getElementById("info-modal-body");
  const track = document.getElementById("info-modal-track");
  const gallery = modal.querySelector(".info-modal__gallery");

  if (titleEl) titleEl.textContent = post.title;
  if (subtitleEl) subtitleEl.textContent = post.subtitle || "";
  if (bodyEl) {
    const safeBody = (post.body || "").replace(/\n/g, "<br/>");
    bodyEl.innerHTML = safeBody;
  }

  const images = post.images || [];
  if (images.length && track && gallery) {
    gallery.dataset.hasImages = "true";
    track.innerHTML = images
      .map(
        (url) => `
        <div class="info-modal__slide">
          <img src="${url}" alt="${post.title}" loading="lazy" />
        </div>`
      )
      .join("");
    updateInfoGallery();
  } else if (gallery) {
    gallery.dataset.hasImages = "false";
    if (track) track.innerHTML = "";
  }

  modal.classList.add("info-modal--open");
  document.body.classList.add("modal-open");
}

function closeInfoModal() {
  const modal = document.getElementById("info-modal");
  if (!modal) return;
  modal.classList.remove("info-modal--open");
  document.body.classList.remove("modal-open");
}

function updateInfoGallery() {
  const track = document.getElementById("info-modal-track");
  const images = infoState.currentPost?.images || [];
  if (!track || !images.length) return;
  const i = infoState.currentImageIndex;
  track.style.transform = `translateX(-${i * 100}%)`;
}

function nextInfoImage() {
  const images = infoState.currentPost?.images || [];
  if (!images.length) return;
  infoState.currentImageIndex =
    (infoState.currentImageIndex + 1) % images.length;
  updateInfoGallery();
}

function prevInfoImage() {
  const images = infoState.currentPost?.images || [];
  if (!images.length) return;
  infoState.currentImageIndex =
    (infoState.currentImageIndex - 1 + images.length) % images.length;
  updateInfoGallery();
}

function attachInfoEvents() {
  const modal = document.getElementById("info-modal");
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    if (
      e.target.matches("[data-info-modal-close]") ||
      e.target === modal.querySelector(".info-modal__backdrop")
    ) {
      closeInfoModal();
    }
  });

  const nextBtn = modal.querySelector("[data-info-next]");
  const prevBtn = modal.querySelector("[data-info-prev]");
  if (nextBtn) nextBtn.addEventListener("click", nextInfoImage);
  if (prevBtn) prevBtn.addEventListener("click", prevInfoImage);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeInfoModal();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".info-card__more");
    if (!btn) return;
    const id = Number(btn.dataset.infoId);
    const post = infoState.posts.find((p) => p.id === id);
    if (post) {
      e.preventDefault();
      openInfoModal(post);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const lang = getLang();
  const homeContainer = document.querySelector("[data-info-list-home]");
  const pageContainer = document.querySelector("[data-info-list-page]");

  if (!homeContainer && !pageContainer) return;

  const posts = await fetchInformativePosts(lang);
  infoState.posts = posts;

  if (homeContainer) {
    const homePosts = posts.slice(0, 3);
    homeContainer.innerHTML = homePosts
      .map((p) => renderInfoCard(p, lang))
      .join("");
  }

  if (pageContainer) {
    pageContainer.innerHTML = posts
      .map((p) => renderInfoCard(p, lang))
      .join("");
  }

  attachInfoEvents();
  
});

