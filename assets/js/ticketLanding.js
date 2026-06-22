document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("ticket-landing-root");
  if (!root) return;

  const cfg = await MhraTickets.fetchTicketConfig();
  const L = MhraTickets.lang();
  const ev = cfg.event;
  const pr = cfg.pricing;

  document.getElementById("ticket-event-title").textContent =
    L === "en" ? ev.nameEn : ev.nameMk;
  document.getElementById("ticket-event-theme").textContent =
    L === "en" ? ev.themeEn : ev.themeMk;
  document.getElementById("ticket-event-date").textContent =
    L === "en" ? ev.dateLabelEn : ev.dateLabelMk;
  document.getElementById("ticket-event-location").textContent =
    L === "en" ? ev.locationEn : ev.locationMk;

  const priceEl = document.getElementById("ticket-price-line");
  if (priceEl) {
    if (pr.earlyBirdActive) {
      priceEl.innerHTML = MhraTickets.t({
        mk: `<strong>Early Bird:</strong> ${MhraTickets.formatMkd(pr.earlyBirdMkd)} <span class="ticket-muted">(до ${pr.earlyBirdUntil})</span><br><span class="ticket-muted">Потоа: ${MhraTickets.formatMkd(pr.regularMkd)}</span>`,
        en: `<strong>Early Bird:</strong> ${MhraTickets.formatMkd(pr.earlyBirdMkd)} <span class="ticket-muted">(until ${pr.earlyBirdUntil})</span><br><span class="ticket-muted">Then: ${MhraTickets.formatMkd(pr.regularMkd)}</span>`,
      });
    } else {
      priceEl.textContent = MhraTickets.formatMkd(pr.regularMkd);
    }
  }

  const modeEl = document.getElementById("ticket-payment-mode");
  if (modeEl && cfg.payment.mode === "mock") {
    modeEl.hidden = false;
    modeEl.textContent = MhraTickets.t({
      mk: "Тест режим: плаќањето со картичка е симулирано додека не пристигнат податоците од банката.",
      en: "Test mode: card payment is simulated until bank credentials are configured.",
    });
  }
});
