(function () {
  const TRACK_SELECTOR = "[data-events-track]";
  const TABLE = "hr_events";
  const PLACEHOLDER_IMG = "../assets/img/H.png"; // nese je ne /en ose /mk do e rregullojme poshte
  const LINK = "events.html";
  const MIN_ITEMS = 10; // sa gjysme-rrethe minimum do shfaqen

  function getLang() {
    const htmlLang = document.documentElement.lang || "mk";
    return htmlLang.toLowerCase().startsWith("en") ? "en" : "mk";
  }

  function fixAssetPath(rel) {
    // nese je ne /mk ose /en: ../assets/...
    // nese je ne root: assets/...
    const inSubFolder = location.pathname.includes("/mk/") || location.pathname.includes("/en/");
    if (inSubFolder) return rel.startsWith("../") ? rel : `../${rel}`;
    return rel.replace("../", "");
  }

  function monthShort(d, lang) {
    try {
      return d.toLocaleString(lang === "mk" ? "mk-MK" : "en-GB", { month: "short" });
    } catch {
      return String(d.getMonth() + 1);
    }
  }

  function pillHtml({ href, bg, type, title, month, day, isPlaceholder }) {
    const styleBg = `background-image:url('${bg}')`;
    if (isPlaceholder) {
      // pa mbishkrim fare
      return `<a href="${href}" class="event-pill" style="${styleBg}"></a>`;
    }

    return `
      <a href="${href}" class="event-pill" style="${styleBg}">
        <div class="event-pill__overlay">
          <div class="event-pill__info">
            ${type ? `<div class="event-pill__type">${type}</div>` : ""}
            ${title ? `<div class="event-pill__title">${title}</div>` : ""}
          </div>
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
    if (!track || typeof supabaseClient === "undefined") return;

    const lang = getLang();

    const { data, error } = await supabaseClient
      .from(TABLE)
      .select("id,title,subtitle,images,event_date,created_at,published,location")
      .eq("language", lang)
      .eq("published", true)
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(20);

    if (error) {
      console.error("Carousel hr_events error:", error);
      return;
    }

    const rows = (data || []).filter(Boolean);

    // build items
    const items = rows.map((e) => {
      const dateStr = e.event_date || e.created_at;
      const d = dateStr ? new Date(dateStr) : null;

      const bg = (e.images && e.images.length ? e.images[0] : null) || fixAssetPath(PLACEHOLDER_IMG);

      return pillHtml({
        href: LINK,
        bg,
        type: e.subtitle || "",       // ose vendos e.location / category nese e ke
        title: e.title || "",
        month: d ? monthShort(d, lang) : "",
        day: d ? String(d.getDate()).padStart(2, "0") : "",
        isPlaceholder: false,
      });
    });

    // add placeholders if needed
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

    // IMPORTANT for smooth loop: duplicate once
    const html = items.join("") + items.join("");
    track.innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", load);
})();
