document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("ticket-result-root");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") || document.getElementById("ticket-status-ref")?.value?.trim();
  const emailParam = params.get("email");
  const emailInput = document.getElementById("ticket-status-email");
  const refInput = document.getElementById("ticket-status-ref");
  if (refInput && params.get("ref")) refInput.value = params.get("ref");
  const lookupBtn = document.getElementById("ticket-status-lookup");
  const detailsEl = document.getElementById("ticket-result-details");

  async function loadOrder(email) {
    if (!email) return;
    const res = await fetch(
      `${MhraTickets.apiUrl("/tickets/status")}?ref=${encodeURIComponent(ref)}&email=${encodeURIComponent(email)}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Not found");
    return data.order;
  }

  function renderOrder(order) {
    if (!detailsEl || !order) return;
    detailsEl.hidden = false;
    detailsEl.innerHTML = `
      <dl class="ticket-result-dl">
        <dt>${MhraTickets.t({ mk: "Референца", en: "Reference" })}</dt><dd><code>${escapeHtml(order.details2)}</code></dd>
        <dt>${MhraTickets.t({ mk: "Настан", en: "Event" })}</dt><dd>${escapeHtml(order.eventName)}</dd>
        <dt>${MhraTickets.t({ mk: "Износ", en: "Amount" })}</dt><dd>${escapeHtml(MhraTickets.formatMkd(order.totalAmountMkd))}</dd>
        <dt>${MhraTickets.t({ mk: "Статус", en: "Status" })}</dt><dd><span class="ticket-badge ticket-badge--${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></dd>
      </dl>`;
  }

  if (emailParam) {
    try {
      const order = await loadOrder(emailParam);
      renderOrder(order);
    } catch {
      /* optional lookup */
    }
  }

  lookupBtn?.addEventListener("click", async () => {
    const email = emailInput?.value?.trim();
    const refVal = params.get("ref") || document.getElementById("ticket-status-ref")?.value?.trim();
    if (!email || !refVal) {
      alert(MhraTickets.t({ mk: "Внесете e-mail и референца.", en: "Enter email and reference." }));
      return;
    }
    try {
      const res = await fetch(
        `${MhraTickets.apiUrl("/tickets/status")}?ref=${encodeURIComponent(refVal)}&email=${encodeURIComponent(email)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      renderOrder(data.order);
    } catch (err) {
      alert(err.message);
    }
  });

  const cfg = await MhraTickets.fetchTicketConfig();
  const bankEl = document.getElementById("ticket-bank-details");
  if (bankEl && cfg.bank) {
    const b = cfg.bank;
    bankEl.innerHTML = `
      <p><strong>${escapeHtml(b.recipient)}</strong></p>
      ${b.bankName ? `<p>${MhraTickets.t({ mk: "Банка", en: "Bank" })}: ${escapeHtml(b.bankName)}</p>` : ""}
      ${b.iban ? `<p>IBAN: <code>${escapeHtml(b.iban)}</code></p>` : `<p class="ticket-muted">${MhraTickets.t({ mk: "IBAN ќе биде објавен наскоро.", en: "IBAN will be published soon." })}</p>`}
      ${b.swift ? `<p>SWIFT: <code>${escapeHtml(b.swift)}</code></p>` : ""}
      <p>${MhraTickets.t({ mk: "Намена на плаќање", en: "Payment purpose" })}: <code>Early Bird ${escapeHtml(ref)}</code></p>`;
  }
});
