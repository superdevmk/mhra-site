export function getEventConfig() {
  return {
    id: "mhra-conf-2026",
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
  };
}

export function getPricingConfig() {
  const earlyBirdMkd = Number(process.env.MHRA_TICKET_EARLY_BIRD_MKD || 4500);
  const regularMkd = Number(process.env.MHRA_TICKET_REGULAR_MKD || 6000);
  const earlyBirdUntil = process.env.MHRA_TICKET_EARLY_BIRD_UNTIL || "2026-09-01";

  const today = new Date().toISOString().slice(0, 10);
  const earlyBirdActive = today <= earlyBirdUntil;

  return {
    earlyBirdMkd,
    regularMkd,
    earlyBirdUntil,
    earlyBirdActive,
    currency: "MKD",
  };
}

export function getBankConfig() {
  return {
    recipient: process.env.MHRA_BANK_RECIPIENT || "Macedonian Human Resources Association (MHRA)",
    bankName: process.env.MHRA_BANK_NAME || "",
    iban: process.env.MHRA_BANK_IBAN || "",
    swift: process.env.MHRA_BANK_SWIFT || "",
    configured: Boolean(process.env.MHRA_BANK_IBAN),
  };
}

export function getCpayConfig() {
  const mode = (process.env.CPAY_MODE || "mock").toLowerCase();
  return {
    mode,
    isLive: mode === "live",
    isConfigured: Boolean(
      process.env.CPAY_MERCHANT_TIN &&
        process.env.CPAY_MERCHANT_PASSWORD &&
        process.env.CPAY_CLIENT_PRIVATE_KEY_PEM &&
        process.env.CPAY_SERVER_PUBLIC_KEY_PEM
    ),
    merchantTin: process.env.CPAY_MERCHANT_TIN || "",
    merchantName: process.env.CPAY_MERCHANT_NAME || "MHRA",
    apiBase: "https://www.cpay.com.mk/service/paymentsAPI",
  };
}

export function getSiteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  const proto = req?.headers?.["x-forwarded-proto"] || "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export function getPublicTicketConfig() {
  const event = getEventConfig();
  const pricing = getPricingConfig();
  const bank = getBankConfig();
  const cpay = getCpayConfig();

  return {
    event,
    pricing: {
      earlyBirdMkd: pricing.earlyBirdMkd,
      regularMkd: pricing.regularMkd,
      earlyBirdUntil: pricing.earlyBirdUntil,
      earlyBirdActive: pricing.earlyBirdActive,
      currency: pricing.currency,
    },
    bank: {
      recipient: bank.recipient,
      bankName: bank.bankName || null,
      iban: bank.iban || null,
      swift: bank.swift || null,
      configured: bank.configured,
    },
    payment: {
      mode: cpay.mode,
      cardEnabled: cpay.isLive ? cpay.isConfigured : true,
      bankTransferEnabled: true,
    },
  };
}
