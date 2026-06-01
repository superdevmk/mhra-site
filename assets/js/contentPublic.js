function pickDate(post, lang) {
  const ds = post.event_date || post.conference_date || post.start_date || post.date || post.created_at;
  return formatContentDate(ds, lang);
}

function renderContentCard(post, lang) {
  const btnLabel = lang === "mk" ? "Види повеќе" : "Read more";
  const table = post._table || "content";
  const url = postPageUrl(table, post.id);
  const meta = [post.location, pickDate(post, lang)].filter(Boolean).join(" · ");

  const img =
    post.images && post.images.length
      ? `<img src="${escapeHtml(post.images[0])}" alt="" class="content-card__img" loading="lazy">`
      : "";

  return `
    <article class="content-card">
      <a class="content-card__link" href="${escapeHtml(url)}">
        ${img}
        <div class="content-card__meta">${escapeHtml(meta)}</div>
        <h3 class="content-card__title">${escapeHtml(post.title || "")}</h3>
        ${post.subtitle ? `<p class="content-card__subtitle">${escapeHtml(post.subtitle)}</p>` : ""}
      </a>
      <a class="btn btn--outline" href="${escapeHtml(url)}">${btnLabel}</a>
    </article>`;
}

async function loadSection(table, selector, opts) {
  const container = document.querySelector(selector);
  if (!container) return;

  const lang = getPageLang();
  const limit = opts?.limit || null;

  let q = supabaseClient
    .from(table)
    .select("*")
    .eq("language", lang)
    .eq("published", true)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error) {
    console.error("Load error:", table, error);
    return;
  }

  const rows = (data || []).map((r) => ({ ...r, _table: table }));
  container.innerHTML = rows.map((p) => renderContentCard(p, lang)).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  loadSection("yearly_conferences", "[data-yearly-conferences]");
  loadSection("hr_events", "[data-hr-events]");
  loadSection("yearly_conferences", "[data-yearly-home]", { limit: 20 });
});
