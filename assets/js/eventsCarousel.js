(function () {
  const TRACK_SELECTOR = "[data-events-track]";
  const TABLE = "hr_events";
  const PLACEHOLDER_IMG = "assets/img/H.png"; // pa ../ (ne e rregullojmë me fixAssetPath)
  const LINK = "events.html";
  const MIN_ITEMS = 10; // minimum sa gjysme-rrethe shfaqen

  function getLang() {
    const htmlLang = document.documentElement.lang || "mk";
    return htmlLang.toLowerCase().startsWith("en") ? "en" : "mk";
  }

  function inSubFolder() {
    return location.pathname.includes("/mk/") || location.pathname.includes("/en/");
  }

  function fixAssetPath(rel) {
    // rel p.sh: assets/img/H.png
    // në /mk ose /en -> ../assets/...
    // në root -> assets/...
    if (inSubFolder()) return rel.startsWith("../") ? rel : `../${rel}`;
    return rel.replace("../", "");
  }

  function monthShort(d, lang) {
    const mk = ["ЈАН", "ФЕВ", "МАР", "АПР", "МАЈ", "ЈУН", "ЈУЛ", "АВГ", "СЕП", "ОКТ", "НОЕ", "ДЕК"];
    const en = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return (lang === "mk" ? mk : en)[d.getMonth()] || "";
  }

 function pillHtml({ href, bg, title, month, day, isPlaceholder }) {
  if (isPlaceholder) {
    return `
      <a href="${href}" class="event-pill">
        <img class="event-pill__img" src="${bg}" alt="" loading="lazy">
      </a>
    `;
  }

  return `
    <a href="${href}" class="event-pill">
      <img class="event-pill__img" src="${bg}" alt="" loading="lazy">

      <div class="event-pill__overlay">
        ${title ? `<div class="event-pill__title">${title}</div>` : ""}

        <div class="event-pill__date">
          <span class="event-pill__month">${month}</span>
          <span class="event-pill__day">${day}</span>
        </div>
      </div>
    </a>
  `;
}


  async function load() {
    const track = document.querySelector(TRACK_SELECTOR);
    if (!track) return;

    if (typeof supabaseClient === "undefined") {
      console.warn("supabaseClient is not defined. Kontrollo renditjen e script tags.");
      return;
    }

    const lang = getLang();

    const { data, error } = await supabaseClient
      .from(TABLE)
      .select("id,title,subtitle,images,event_date,created_at,published,location,language")
      .eq("language", lang)
      .eq("published", true)
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Carousel hr_events error:", error);
      return;
    }

    const rows = (data || []).filter(Boolean);

    const items = rows.map((e) => {
      const dateStr = e.event_date || e.created_at;
      const d = dateStr ? new Date(dateStr) : null;

      const bg =
        (e.images && e.images.length ? e.images[0] : null) ||
        fixAssetPath(PLACEHOLDER_IMG);

      return pillHtml({
        href: LINK,
        bg,
        type: e.subtitle || "", // ose e.location nëse don
        title: e.title || "",
        month: d ? monthShort(d, lang) : "",
        day: d ? String(d.getDate()).padStart(2, "0") : "",
        isPlaceholder: false,
      });
    });

    // placeholders deri MIN_ITEMS
    const needed = Math.max(MIN_ITEMS - items.length, 0);
    for (let i = 0; i < needed; i++) {
      items.push(
        pillHtml({
          href: LINK,
          bg: fixAssetPath(PLACEHOLDER_IMG),
          isPlaceholder: true,
        })
      );
    }

    // dupliko për loop të qetë
    track.innerHTML = items.join("") + items.join("");
  }

  document.addEventListener("DOMContentLoaded", load);
})();
