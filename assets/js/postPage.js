(function () {
  const root = document.getElementById("article-root");
  if (!root) return;

  function t(key) {
    const lang = getPageLang();
    const map = {
      loading: { mk: "Се вчитува…", en: "Loading…" },
      notFound: { mk: "Содржината не е пронајдена.", en: "Content not found." },
      back: { mk: "Назад", en: "Back" },
      gallery: { mk: "Галерија", en: "Gallery" },
      edit: { mk: "Уреди", en: "Edit" },
      delete: { mk: "Избриши", en: "Delete" },
      deleteConfirm: {
        mk: "Избриши ја објавата?",
        en: "Delete this post?",
      },
    };
    return map[key]?.[lang] || map[key]?.mk || key;
  }

  function showError() {
    root.innerHTML = `
      <div class="article-page article-page--empty">
        <p class="article-page__message">${escapeHtml(t("notFound"))}</p>
        <a class="btn btn--outline" href="index.html">${escapeHtml(t("back"))}</a>
      </div>`;
  }

  function buildMetaLine(post, table, lang) {
    const parts = [];
    if (post.location) parts.push(post.location);
    if (post.year) parts.push(String(post.year));
    if (table === "posts") {
      if (post.created_at) parts.push(formatContentDate(post.created_at, lang));
    } else {
      const date = pickPostDate(post);
      if (date) parts.push(formatContentDate(date, lang));
    }
    return parts.filter(Boolean).join(" · ");
  }

  function heroAndGallery(post, table) {
    if (table === "posts") {
      return {
        hero: post.image_url || null,
        gallery: [],
      };
    }
    const imgs = Array.isArray(post.images) ? post.images.filter(Boolean) : [];
    if (!imgs.length) return { hero: null, gallery: [] };
    return { hero: imgs[0], gallery: imgs.slice(1) };
  }

  function renderGallery(images, lang) {
    if (!images.length) return "";
    return `
      <section class="article-gallery" aria-label="${escapeHtml(t("gallery"))}">
        <h2 class="article-gallery__title">${escapeHtml(t("gallery"))}</h2>
        <div class="article-gallery__grid">
          ${images
            .map(
              (url) =>
                `<figure class="article-gallery__item"><img src="${escapeHtml(url)}" alt="" loading="lazy"></figure>`
            )
            .join("")}
        </div>
      </section>`;
  }

  async function renderOwnerActions(post, table) {
    if (table !== "posts") return "";
    const session = await getSession();
    if (!session || session.user.id !== post.author_id) return "";
    return `
      <div class="article-actions">
        <a class="btn btn--outline" href="blog.html?edit=${post.id}">${escapeHtml(t("edit"))}</a>
        <button type="button" class="btn btn--danger" id="article-delete-btn">${escapeHtml(t("delete"))}</button>
      </div>`;
  }

  async function renderPost(post, table) {
    const lang = getPageLang();
    const back = getPostBackLink(table, lang);
    const { hero, gallery } = heroAndGallery(post, table);
    const meta = buildMetaLine(post, table, lang);
    const bodyHtml = renderBodyHtml(post.body, post.body_format);
    const ownerActions = await renderOwnerActions(post, table);

    document.title = `${post.title || "MHRA"} | MHRA`;

    root.innerHTML = `
      <article class="article-page">
        <nav class="article-page__nav">
          <a class="article-page__back" href="${escapeHtml(back.url)}">
            <span aria-hidden="true">←</span> ${escapeHtml(back.label)}
          </a>
        </nav>
        <header class="article-header">
          ${meta ? `<p class="article-header__meta">${escapeHtml(meta)}</p>` : ""}
          <h1 class="article-header__title">${escapeHtml(post.title || "")}</h1>
          ${post.subtitle ? `<p class="article-header__subtitle">${escapeHtml(post.subtitle)}</p>` : ""}
        </header>
        ${
          hero
            ? `<figure class="article-hero"><img src="${escapeHtml(hero)}" alt="${escapeHtml(post.title || "")}" loading="eager"></figure>`
            : ""
        }
        <div class="article-body content-body">${bodyHtml}</div>
        ${renderGallery(gallery, lang)}
        ${ownerActions}
      </article>`;

    const delBtn = document.getElementById("article-delete-btn");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!confirm(t("deleteConfirm"))) return;
        try {
          await deletePost(post.id);
          window.location.href = "blog.html";
        } catch (err) {
          alert(err.message);
        }
      });
    }
  }

  async function loadPost() {
    root.innerHTML = `<div class="article-page article-page--loading"><p>${escapeHtml(t("loading"))}</p></div>`;

    const params = new URLSearchParams(window.location.search);
    const table = params.get("t") || params.get("type");
    const id = params.get("id");

    if (!table || !id || !POST_TABLES.includes(table)) {
      showError();
      return;
    }

    const { data, error } = await supabaseClient
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      showError();
      return;
    }

    if (table === "posts") {
      const session = await getSession();
      const isOwner = session && session.user.id === data.author_id;
      if (!data.published && !isOwner) {
        showError();
        return;
      }
    } else if (!data.published) {
      showError();
      return;
    }

    await renderPost(data, table);
  }

  document.addEventListener("DOMContentLoaded", loadPost);
})();
