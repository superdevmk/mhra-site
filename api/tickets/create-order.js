import { getSupabaseAdmin } from "../lib/supabase.js";
import {
  getEventConfig,
  getPricingConfig,
  getPublicTicketConfig,
} from "../lib/config.js";
import {
  buildDetails1,
  generateDetails2,
  resolveTicketType,
  sanitizeOrder,
  toCpayAmount,
  unitPriceForType,
} from "../lib/orders.js";

function json(res, status, body) {
  res.status(status).json(body);
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

function validateOrderInput(body) {
  const errors = [];
  const firstName = (body.firstName || "").trim();
  const lastName = (body.lastName || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const telephone = (body.telephone || "").replace(/\s+/g, "");
  const address = (body.address || "").trim();
  const city = (body.city || "").trim();
  const zip = (body.zip || "").trim();
  const company = (body.company || "").trim() || null;
  const language = body.language === "en" ? "en" : "mk";
  const paymentMethod = body.paymentMethod === "bank_transfer" ? "bank_transfer" : "card";
  let quantity = parseInt(body.quantity, 10);
  if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;
  if (quantity > 20) quantity = 20;

  if (!firstName) errors.push("firstName");
  if (!lastName) errors.push("lastName");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email");
  if (!telephone || telephone.length < 8) errors.push("telephone");
  if (!address) errors.push("address");
  if (!city) errors.push("city");
  if (!zip) errors.push("zip");

  if (errors.length) return { errors };

  return {
    firstName,
    lastName,
    email,
    telephone,
    address,
    city,
    zip,
    company,
    language,
    paymentMethod,
    quantity,
    countryCode: (body.countryCode || "807").toString().slice(0, 3),
    ticketTypeRequested: body.ticketType === "regular" ? "regular" : "early_bird",
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const body = readBody(req);
  if (!body) return json(res, 400, { error: "Invalid JSON body" });

  const input = validateOrderInput(body);
  if (input.errors) return json(res, 400, { error: "Validation failed", fields: input.errors });

  try {
    const supabase = getSupabaseAdmin();
    const event = getEventConfig();
    const pricing = getPricingConfig();
    const activeType = resolveTicketType(pricing);
    const ticketType =
      input.ticketTypeRequested === "early_bird" && activeType === "early_bird"
        ? "early_bird"
        : "regular";
    const unitMkd = unitPriceForType(ticketType, pricing);
    const totalMkd = unitMkd * input.quantity;
    const totalCpay = toCpayAmount(totalMkd);
    const details2 = generateDetails2();
    const details1 = buildDetails1(ticketType, input.language);
    const eventName = input.language === "en" ? event.nameEn : event.nameMk;

    const row = {
      details2,
      details1,
      language: input.language,
      ticket_type: ticketType,
      quantity: input.quantity,
      unit_amount_mkd: unitMkd,
      total_amount_mkd: totalMkd,
      total_amount_cpay: totalCpay,
      currency: "MKD",
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      telephone: input.telephone,
      address: input.address,
      city: input.city,
      zip: input.zip,
      country_code: input.countryCode,
      company: input.company,
      payment_method: input.paymentMethod,
      status: "pending",
      event_name: eventName,
      event_date: event.date,
    };

    const { data, error } = await supabase.from("ticket_orders").insert(row).select("*").single();
    if (error) throw error;

    return json(res, 201, {
      order: sanitizeOrder(data),
      config: getPublicTicketConfig(),
    });
  } catch (err) {
    console.error("create-order", err);
    return json(res, 500, { error: err.message || "Could not create order" });
  }
}
