function renderInfoCard(post, lang) {
  const btnLabel = lang === "mk" ? "Прочитај повеќе" : "Read more";
  const date = formatContentDate(post.created_at, lang);
  const url = postPageUrl("informative_posts", post.id);

  const img =
    post.images && post.images.length
      ? `<img src="${escapeHtml(post.images[0])}" alt="" class="content-card__img" loading="lazy">`
      : "";

  return `
    <article class="content-card">
      <a class="content-card__link" href="${escapeHtml(url)}">
        ${img}
        <div class="content-card__meta">${escapeHtml(date)}</div>
        <h3 class="content-card__title">${escapeHtml(post.title || "")}</h3>
        ${post.subtitle ? `<p class="content-card__subtitle">${escapeHtml(post.subtitle)}</p>` : ""}
      </a>
      <a class="btn btn--outline" href="${escapeHtml(url)}">${btnLabel}</a>
    </article>`;
}

async function fetchInformativePosts(lang) {
  const { data, error } = await supabaseClient
    .from("informative_posts")
    .select("*")
    .eq("language", lang)
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("informative_posts error:", error);
    return [];
  }
  return data || [];
}

document.addEventListener("DOMContentLoaded", async () => {
  const lang = getPageLang();
  const homeContainer = document.querySelector("[data-info-list-home]");
  const pageContainer = document.querySelector("[data-info-list-page]");
  if (!homeContainer && !pageContainer) return;

  const posts = await fetchInformativePosts(lang);

  if (homeContainer) {
    homeContainer.innerHTML = posts.slice(0, 12).map((p) => renderInfoCard(p, lang)).join("");
  }
  if (pageContainer) {
    pageContainer.innerHTML = posts.map((p) => renderInfoCard(p, lang)).join("");
  }
});
