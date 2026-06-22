document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("ticket-checkout-form");
  if (!form) return;

  const cfg = await MhraTickets.fetchTicketConfig();
  const L = MhraTickets.lang();
  const pr = cfg.pricing;
  const statusEl = document.getElementById("ticket-checkout-status");
  const summaryEl = document.getElementById("ticket-order-summary");
  const qtyInput = document.getElementById("ticket-quantity");
  const typeInput = document.getElementById("ticket-type");
  const payCardBtn = document.getElementById("ticket-pay-card");
  const payBankBtn = document.getElementById("ticket-pay-bank");

  const activeType = pr.earlyBirdActive ? "early_bird" : "regular";
  if (typeInput) {
    typeInput.value = activeType;
    if (!pr.earlyBirdActive) {
      const earlyOpt = typeInput.querySelector('option[value="early_bird"]');
      if (earlyOpt) earlyOpt.disabled = true;
    }
  }

  function currentUnitPrice() {
    const type = typeInput?.value || activeType;
    return type === "early_bird" ? pr.earlyBirdMkd : pr.regularMkd;
  }

  function updateSummary() {
    const qty = Math.max(1, Math.min(20, parseInt(qtyInput?.value, 10) || 1));
    if (qtyInput) qtyInput.value = String(qty);
    const total = currentUnitPrice() * qty;
    if (!summaryEl) return;
    summaryEl.innerHTML = MhraTickets.t({
      mk: `<div class="ticket-summary__row"><span>Тип</span><strong>${MhraTickets.ticketTypeLabel(typeInput?.value || activeType)}</strong></div>
        <div class="ticket-summary__row"><span>Количина</span><strong>${qty}</strong></div>
        <div class="ticket-summary__row"><span>Цена</span><strong>${MhraTickets.formatMkd(currentUnitPrice())}</strong></div>
        <div class="ticket-summary__row ticket-summary__row--total"><span>Вкупно</span><strong>${MhraTickets.formatMkd(total)}</strong></div>`,
      en: `<div class="ticket-summary__row"><span>Type</span><strong>${MhraTickets.ticketTypeLabel(typeInput?.value || activeType)}</strong></div>
        <div class="ticket-summary__row"><span>Quantity</span><strong>${qty}</strong></div>
        <div class="ticket-summary__row"><span>Price</span><strong>${MhraTickets.formatMkd(currentUnitPrice())}</strong></div>
        <div class="ticket-summary__row ticket-summary__row--total"><span>Total</span><strong>${MhraTickets.formatMkd(total)}</strong></div>`,
    });
  }

  [qtyInput, typeInput].forEach((el) => el?.addEventListener("input", updateSummary));
  updateSummary();

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("ticket-status--error", !!isError);
  }

  function formPayload(paymentMethod) {
    const fd = new FormData(form);
    return {
      language: L,
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      telephone: fd.get("telephone"),
      address: fd.get("address"),
      city: fd.get("city"),
      zip: fd.get("zip"),
      company: fd.get("company"),
      quantity: fd.get("quantity"),
      ticketType: typeInput?.value || activeType,
      paymentMethod,
      countryCode: "807",
    };
  }

  async function submitCheckout(paymentMethod) {
    if (!form.reportValidity()) return;
    setStatus(
      MhraTickets.t({ mk: "Се обработува…", en: "Processing…" }),
      false
    );
    payCardBtn && (payCardBtn.disabled = true);
    payBankBtn && (payBankBtn.disabled = true);

    try {
      const createRes = await fetch(MhraTickets.apiUrl("/tickets/create-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formPayload(paymentMethod)),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Order failed");

      const payRes = await fetch(MhraTickets.apiUrl("/tickets/pay"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: createData.order.id,
          userAgent: navigator.userAgent,
          screenHeight: window.screen.height,
          screenWidth: window.screen.width,
          colorDepth: window.screen.colorDepth,
          timezone: new Date().getTimezoneOffset(),
          browserLanguage: navigator.language || "mk-MK",
          acceptHeaders: "text/html,application/json",
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || payData.hint || "Payment failed");

      if (payData.redirect) {
        window.location.href = payData.redirect;
        return;
      }
      if (payData.next === "success") {
        window.location.href =
          payData.redirect ||
          `ticket-success.html?ref=${encodeURIComponent(createData.order.details2)}`;
        return;
      }
      throw new Error(payData.hint || "Unexpected payment response");
    } catch (err) {
      setStatus(err.message, true);
      payCardBtn && (payCardBtn.disabled = false);
      payBankBtn && (payBankBtn.disabled = false);
    }
  }

  payCardBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    submitCheckout("card");
  });
  payBankBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    submitCheckout("bank_transfer");
  });

  form.addEventListener("submit", (e) => e.preventDefault());
});
