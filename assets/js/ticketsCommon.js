(function (global) {
  const FALLBACK = {
    event: {
      nameMk: "18. меѓународна конференција на МАЧР",
      nameEn: "18th International MHRA Conference",
      themeMk: "Под HR шапката: Моделирање промена во вредност",
      themeEn: "Under the HR Hat: Modeling Change to Value",
      date: "2026-10-21",
      dateLabelMk: "21 октомври 2026",
      dateLabelEn: "21 October 2026",
      locationMk: "Скопје, Северна Македонија",
      locationEn: "Skopje, North Macedonia",
      contactEmail: "contact@mhra.mk",
    },
    pricing: {
      earlyBirdMkd: 4500,
      regularMkd: 6000,
      earlyBirdUntil: "2026-09-01",
      earlyBirdActive: true,
      currency: "MKD",
    },
    bank: {
      recipient: "Macedonian Human Resources Association (MHRA)",
      bankName: null,
      iban: null,
      swift: null,
      configured: false,
    },
    payment: { mode: "mock", cardEnabled: true, bankTransferEnabled: true },
  };

  function lang() {
    return getPageLang();
  }

  function t(map) {
    return map[lang()] || map.mk;
  }

  function apiUrl(path) {
    return `${window.location.origin}/api${path}`;
  }

  async function fetchTicketConfig() {
    try {
      const res = await fetch(apiUrl("/tickets/config"));
      if (!res.ok) throw new Error("config fetch failed");
      return await res.json();
    } catch {
      return FALLBACK;
    }
  }

  function formatMkd(amount) {
    return `${Number(amount).toLocaleString(lang() === "mk" ? "mk-MK" : "en-GB")} MKD`;
  }

  function ticketTypeLabel(type) {
    if (type === "early_bird") return t({ mk: "Early Bird", en: "Early Bird" });
    return t({ mk: "Редовна", en: "Regular" });
  }

  global.MhraTickets = {
    FALLBACK,
    lang,
    t,
    apiUrl,
    fetchTicketConfig,
    formatMkd,
    ticketTypeLabel,
  };
})(window);
