function getPageLang() {
  const htmlLang = document.documentElement.lang || "mk";
  return htmlLang.toLowerCase().startsWith("en") ? "en" : "mk";
}

function formatContentDate(dateString, lang) {
  if (!dateString) return "";
  const d = new Date(dateString);
  try {
    return d.toLocaleDateString(lang === "mk" ? "mk-MK" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString.slice(0, 10);
  }
}

function slugify(text) {
  return (text || "post")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function assetPath(relativePath) {
  const inSub =
    location.pathname.includes("/mk/") || location.pathname.includes("/en/") ||
    location.pathname.includes("/admin/");
  const clean = relativePath.replace(/^\.\.\//, "");
  return inSub ? `../${clean}` : clean;
}

const POST_TABLES = ["informative_posts", "hr_events", "yearly_conferences", "posts"];

function postPageUrl(table, id) {
  return `post.html?t=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`;
}

function getPostBackLink(table, lang) {
  const map = {
    informative_posts: {
      url: "about.html",
      mk: "Информативни содржини",
      en: "Informative content",
    },
    hr_events: { url: "events.html", mk: "HR настани", en: "HR Events" },
    yearly_conferences: {
      url: "galleries.html",
      mk: "Годишна конференција",
      en: "Yearly Conferences",
    },
    posts: { url: "blog.html", mk: "Блог", en: "Blog" },
  };
  const m = map[table];
  if (!m) return { url: "index.html", label: lang === "mk" ? "Почетна" : "Home" };
  return { url: m.url, label: m[lang] || m.mk };
}

function pickPostDate(post) {
  return post.event_date || post.published_at || post.created_at;
}
