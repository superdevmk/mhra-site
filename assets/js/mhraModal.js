(function () {
  const registry = new Map();
  let galleryIndex = 0;
  let currentKey = null;
  let initialized = false;

  const MODAL_HTML = `
<div id="mhra-modal" class="mhra-modal" aria-hidden="true" role="dialog" aria-modal="true">
  <div class="mhra-modal__backdrop" data-mhra-modal-close></div>
  <div class="mhra-modal__dialog">
    <button type="button" class="mhra-modal__close" data-mhra-modal-close aria-label="Close">&times;</button>
    <div class="mhra-modal__cover-wrap" hidden>
      <img class="mhra-modal__cover" id="mhra-modal-cover" alt="" loading="lazy" />
    </div>
    <div class="mhra-modal__gallery" data-has-images="false">
      <button type="button" class="mhra-modal__arrow mhra-modal__arrow--left" data-mhra-prev aria-label="Previous">&lsaquo;</button>
      <div class="mhra-modal__viewport">
        <div class="mhra-modal__track" id="mhra-modal-track"></div>
      </div>
      <button type="button" class="mhra-modal__arrow mhra-modal__arrow--right" data-mhra-next aria-label="Next">&rsaquo;</button>
    </div>
    <div class="mhra-modal__content">
      <p class="mhra-modal__meta" id="mhra-modal-meta"></p>
      <h2 class="mhra-modal__title" id="mhra-modal-title"></h2>
      <p class="mhra-modal__subtitle" id="mhra-modal-subtitle"></p>
      <div class="mhra-modal__body content-body" id="mhra-modal-body"></div>
      <div class="mhra-modal__footer" id="mhra-modal-footer"></div>
    </div>
  </div>
</div>`;

  function ensureModal() {
    if (document.getElementById("mhra-modal")) return;
    document.body.insertAdjacentHTML("beforeend", MODAL_HTML);
  }

  function els() {
    return {
      modal: document.getElementById("mhra-modal"),
      title: document.getElementById("mhra-modal-title"),
      subtitle: document.getElementById("mhra-modal-subtitle"),
      meta: document.getElementById("mhra-modal-meta"),
      body: document.getElementById("mhra-modal-body"),
      footer: document.getElementById("mhra-modal-footer"),
      coverWrap: document.querySelector(".mhra-modal__cover-wrap"),
      cover: document.getElementById("mhra-modal-cover"),
      gallery: document.querySelector(".mhra-modal__gallery"),
      track: document.getElementById("mhra-modal-track"),
      prev: document.querySelector("[data-mhra-prev]"),
      next: document.querySelector("[data-mhra-next]"),
    };
  }

  function galleryImages(item) {
    const imgs = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
    if (item.image_url && !imgs.includes(item.image_url)) {
      return [item.image_url, ...imgs];
    }
    return imgs;
  }

  function updateGallery() {
    const e = els();
    const item = registry.get(currentKey);
    if (!item || !e.track) return;
    const images = galleryImages(item);
    if (!images.length) return;
    e.track.style.transform = `translateX(-${galleryIndex * 100}%)`;
    if (e.prev) e.prev.style.display = images.length > 1 ? "flex" : "none";
    if (e.next) e.next.style.display = images.length > 1 ? "flex" : "none";
  }

  function open(key, options) {
    ensureModal();
    const item = registry.get(key);
    if (!item) return;

    currentKey = key;
    galleryIndex = 0;
    const e = els();
    const lang = getPageLang();
    const opts = options || {};

    if (e.title) e.title.textContent = item.title || "";
    if (e.subtitle) {
      e.subtitle.textContent = item.subtitle || "";
      e.subtitle.hidden = !item.subtitle;
    }
    if (e.meta) {
      const parts = [];
      if (item.location) parts.push(item.location);
      if (item.event_date) parts.push(formatContentDate(item.event_date, lang));
      else if (item.created_at) parts.push(formatContentDate(item.created_at, lang));
      e.meta.textContent = parts.join(" · ");
      e.meta.hidden = !parts.length;
    }
    if (e.body) {
      e.body.innerHTML = renderBodyHtml(item.body, item.body_format);
    }

    const images = galleryImages(item);
    const heroUrl = item.image_url || images[0] || null;

    if (e.coverWrap && e.cover) {
      if (heroUrl && images.length <= 1) {
        e.cover.src = heroUrl;
        e.cover.alt = item.title || "";
        e.coverWrap.hidden = false;
      } else {
        e.coverWrap.hidden = true;
        e.cover.removeAttribute("src");
      }
    }

    if (e.gallery && e.track) {
      const galleryUrls = images.length > 1 ? images : images.length === 1 && !item.image_url ? images : [];
      if (galleryUrls.length > 0) {
        e.gallery.dataset.hasImages = "true";
        e.track.innerHTML = galleryUrls
          .map(
            (url) =>
              `<div class="mhra-modal__slide"><img src="${escapeHtml(url)}" alt="" loading="lazy"></div>`
          )
          .join("");
        updateGallery();
      } else {
        e.gallery.dataset.hasImages = "false";
        e.track.innerHTML = "";
      }
    }

    if (e.footer) {
      e.footer.innerHTML = opts.footerHtml || "";
    }

    e.modal.classList.add("mhra-modal--open");
    e.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function close() {
    const e = els();
    if (!e.modal) return;
    e.modal.classList.remove("mhra-modal--open");
    e.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    currentKey = null;
  }

  function register(key, item) {
    registry.set(key, item);
  }

  function registerMany(items, table) {
    (items || []).forEach((item) => {
      register(`${table}:${item.id}`, item);
    });
  }

  function bindOnce() {
    if (initialized) return;
    initialized = true;
    ensureModal();

    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-read-more]");
      if (!btn) return;
      const key = btn.getAttribute("data-read-more");
      if (key && key.startsWith("posts:")) return;
      ev.preventDefault();
      open(key);
    });

    document.addEventListener("click", (ev) => {
      if (ev.target.matches("[data-mhra-modal-close]") || ev.target.classList.contains("mhra-modal__backdrop")) {
        close();
      }
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") close();
    });

    document.addEventListener("click", (ev) => {
      if (ev.target.matches("[data-mhra-prev]")) {
        const item = registry.get(currentKey);
        const n = galleryImages(item).length;
        if (n > 1) {
          galleryIndex = (galleryIndex - 1 + n) % n;
          updateGallery();
        }
      }
      if (ev.target.matches("[data-mhra-next]")) {
        const item = registry.get(currentKey);
        const n = galleryImages(item).length;
        if (n > 1) {
          galleryIndex = (galleryIndex + 1) % n;
          updateGallery();
        }
      }
    });
  }

  window.MhraModal = {
    init: bindOnce,
    register,
    registerMany,
    open,
    close,
  };

  document.addEventListener("DOMContentLoaded", bindOnce);
})();
