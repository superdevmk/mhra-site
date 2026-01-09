/* assets/js/contentPublic.js
   Public loader + modal for: yearly_conferences + hr_events
   Requires:
   - <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   - ../assets/js/supabaseClient.js  (must expose: supabaseClient)
*/

function getLang() {
  const htmlLang = document.documentElement.lang || "mk";
  return htmlLang.toLowerCase().startsWith("en") ? "en" : "mk";
}

function formatDate(dateString, lang) {
  if (!dateString) return "";
  const d = new Date(dateString);
  try {
    return d.toLocaleDateString(lang === "mk" ? "mk-MK" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function pickDate(post, lang) {
  const ds =
    post.event_date ||
    post.conference_date ||
    post.start_date ||
    post.date ||
    post.created_at;
  return formatDate(ds, lang);
}

const modalState = { posts: [], current: null, idx: 0 };

function renderContentCard(post, lang) {
  const btnLabel = lang === "mk" ? "Види повеќе" : "Read more";
  const date = pickDate(post, lang);
  const meta = [post.location, date].filter(Boolean).join(" · ");

  const img =
    post.images && post.images.length
      ? `<img src="${post.images[0]}" alt="" style="width:100%;height:180px;object-fit:cover;border-radius:16px;">`
      : "";

  return `
    <article style="background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.06)">
      ${img}
      <div style="margin-top:12px;color:#6b7280;font-size:12px">${meta}</div>
      <h3 style="margin:8px 0 6px;font-size:18px">${post.title || ""}</h3>
      ${post.subtitle ? `<div style="color:#6b7280;margin-bottom:10px">${post.subtitle}</div>` : ""}
      <button class="btn btn--outline js-open-modal" data-id="${post.id}" type="button">${btnLabel}</button>
    </article>
  `;
}

function openModal(post) {
  modalState.current = post;
  modalState.idx = 0;

  const modal = document.getElementById("content-modal");
  if (!modal) return;

  const titleEl = modal.querySelector("#content-modal-title");
  const subEl = modal.querySelector("#content-modal-subtitle");
  const bodyEl = modal.querySelector("#content-modal-body");

  if (titleEl) titleEl.textContent = post.title || "";
  if (subEl) subEl.textContent = post.subtitle || "";
  if (bodyEl) bodyEl.innerHTML = (post.body || "").replace(/\n/g, "<br/>");

  const images = post.images || [];
  const gallery = modal.querySelector(".info-modal__gallery");
  const track = modal.querySelector("#info-modal-track");
  const prevBtn = modal.querySelector("[data-info-prev]");
  const nextBtn = modal.querySelector("[data-info-next]");

  if (gallery && track) {
    if (images.length) {
      gallery.dataset.hasImages = "true";
      track.innerHTML = images
        .map(
          (url) =>
            `<div class="info-modal__slide"><img src="${url}" alt="" loading="lazy"></div>`
        )
        .join("");

      const showArrows = images.length > 1;
      if (prevBtn) prevBtn.style.display = showArrows ? "flex" : "none";
      if (nextBtn) nextBtn.style.display = showArrows ? "flex" : "none";

      track.style.transform = "translateX(0%)";
    } else {
      gallery.dataset.hasImages = "false";
      track.innerHTML = "";
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
    }
  }

  modal.classList.add("info-modal--open");
  document.body.classList.add("modal-open");
}

function closeModal() {
  const modal = document.getElementById("content-modal");
  if (!modal) return;
  modal.classList.remove("info-modal--open");
  document.body.classList.remove("modal-open");
}

function nextImg() {
  const images = modalState.current?.images || [];
  if (images.length < 2) return;
  modalState.idx = (modalState.idx + 1) % images.length;
  const track = document.querySelector("#info-modal-track");
  if (track) track.style.transform = `translateX(-${modalState.idx * 100}%)`;
}

function prevImg() {
  const images = modalState.current?.images || [];
  if (images.length < 2) return;
  modalState.idx = (modalState.idx - 1 + images.length) % images.length;
  const track = document.querySelector("#info-modal-track");
  if (track) track.style.transform = `translateX(-${modalState.idx * 100}%)`;
}

function bindContentModal(posts) {
  modalState.posts = posts || [];

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-open-modal");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const post = modalState.posts.find((p) => Number(p.id) === id);
    if (post) openModal(post);
  });

  const modal = document.getElementById("content-modal");
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    if (
      e.target.matches("[data-info-modal-close]") ||
      e.target.classList.contains("info-modal__backdrop")
    ) {
      closeModal();
    }
  });

  const nextBtn = modal.querySelector("[data-info-next]");
  const prevBtn = modal.querySelector("[data-info-prev]");
  if (nextBtn) nextBtn.addEventListener("click", nextImg);
  if (prevBtn) prevBtn.addEventListener("click", prevImg);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

async function loadSection(table, selector) {
  const container = document.querySelector(selector);
  if (!container) return;

  const lang = getLang();

  const { data, error } = await supabaseClient
    .from(table)
    .select("*")
    .eq("language", lang)
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load error:", table, error);
    return;
  }

  container.innerHTML = (data || []).map((p) => renderContentCard(p, lang)).join("");
  bindContentModal(data || []);
}

document.addEventListener("DOMContentLoaded", () => {
  // only runs where containers exist
  loadSection("yearly_conferences", "[data-yearly-conferences]");
  loadSection("hr_events", "[data-hr-events]");
});
