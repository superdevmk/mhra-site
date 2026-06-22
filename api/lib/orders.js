export function generateDetails2() {
  const timePart = Date.now().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const randPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return ("M" + timePart + randPart).replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

export function toCpayAmount(mkdWhole) {
  const n = Math.round(Number(mkdWhole));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid amount");
  return n * 100;
}

export function buildDetails1(ticketType, lang) {
  const label =
    ticketType === "early_bird"
      ? lang === "en"
        ? "Early Bird MHRA 2026"
        : "Early Bird MHRA 2026"
      : lang === "en"
        ? "MHRA Conference 2026"
        : "MHRA Konf 2026";
  return label.slice(0, 32);
}

export function resolveTicketType(pricing) {
  return pricing.earlyBirdActive ? "early_bird" : "regular";
}

export function unitPriceForType(ticketType, pricing) {
  return ticketType === "early_bird" ? pricing.earlyBirdMkd : pricing.regularMkd;
}

export function sanitizeOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    details2: order.details2,
    ticketType: order.ticket_type,
    quantity: order.quantity,
    unitAmountMkd: order.unit_amount_mkd,
    totalAmountMkd: order.total_amount_mkd,
    currency: order.currency,
    paymentMethod: order.payment_method,
    status: order.status,
    eventName: order.event_name,
    eventDate: order.event_date,
    firstName: order.first_name,
    lastName: order.last_name,
    email: order.email,
    createdAt: order.created_at,
  };
}
