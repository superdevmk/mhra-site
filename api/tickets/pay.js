import { getSupabaseAdmin } from "../lib/supabase.js";
import { getCpayConfig, getSiteUrl } from "../lib/config.js";
import { sanitizeOrder } from "../lib/orders.js";

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

function browserDataFromRequest(req, body) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (forwarded ? forwarded.split(",")[0] : req.socket?.remoteAddress || "127.0.0.1").trim();
  return {
    Browser_IP: body.browserIp || ip,
    User_Agent: body.userAgent || req.headers["user-agent"] || "Mozilla/5.0",
    Browser_AcceptHeaders: body.acceptHeaders || "text/html,application/json",
    Browser_JavaScript: true,
    ScreenHeight: body.screenHeight || 900,
    ScreenWidth: body.screenWidth || 1440,
    Browser_ScreenColorDepth: body.colorDepth || 24,
    Browser_Timezone: body.timezone ?? -60,
    Browser_Language: body.browserLanguage || "mk-MK",
    Browser_JavaApplets: false,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const body = readBody(req);
  if (!body?.orderId) return json(res, 400, { error: "orderId is required" });

  try {
    const supabase = getSupabaseAdmin();
    const { data: order, error } = await supabase
      .from("ticket_orders")
      .select("*")
      .eq("id", body.orderId)
      .maybeSingle();

    if (error) throw error;
    if (!order) return json(res, 404, { error: "Order not found" });
    if (order.status === "paid") {
      return json(res, 200, { next: "success", order: sanitizeOrder(order) });
    }

    const lang = order.language === "en" ? "en" : "mk";
    const base = getSiteUrl(req);
    const successUrl = `${base}/${lang}/ticket-success.html?ref=${encodeURIComponent(order.details2)}`;
    const failUrl = `${base}/${lang}/ticket-failed.html?ref=${encodeURIComponent(order.details2)}`;
    const cancelUrl = `${base}/${lang}/ticket-cancelled.html?ref=${encodeURIComponent(order.details2)}`;

    if (order.payment_method === "bank_transfer") {
      await supabase
        .from("ticket_orders")
        .update({ status: "pending", notes: "Awaiting bank transfer" })
        .eq("id", order.id);

      return json(res, 200, {
        next: "bank_transfer",
        order: sanitizeOrder(order),
        redirect: `${base}/${lang}/ticket-bank.html?ref=${encodeURIComponent(order.details2)}`,
      });
    }

    const cpay = getCpayConfig();

    if (cpay.mode === "mock" || !cpay.isLive) {
      const { data: paidOrder, error: payErr } = await supabase
        .from("ticket_orders")
        .update({
          status: "paid",
          cpay_status: "Send_OK",
          paid_at: new Date().toISOString(),
          notes: "Mock payment (CPAY_MODE=mock)",
        })
        .eq("id", order.id)
        .select("*")
        .single();
      if (payErr) throw payErr;

      return json(res, 200, {
        next: "success",
        mode: "mock",
        message: "Test payment completed. Switch CPAY_MODE=live when bank credentials arrive.",
        order: sanitizeOrder(paidOrder),
        redirect: successUrl,
      });
    }

    if (!cpay.isConfigured) {
      return json(res, 503, {
        error: "cPay credentials missing",
        hint: "Set CPAY_MERCHANT_TIN, CPAY_MERCHANT_PASSWORD, and RSA keys in Vercel environment variables.",
      });
    }

    await supabase.from("ticket_orders").update({ status: "processing" }).eq("id", order.id);

    return json(res, 501, {
      error: "Live cPay hookup pending",
      hint: "Credentials detected. Complete ReceiveEncodedMessage in api/lib/cpay/crypto.js and redeploy.",
      orderId: order.id,
      successUrl,
      failUrl,
      cancelUrl,
    });
  } catch (err) {
    console.error("pay", err);
    return json(res, 500, { error: err.message || "Payment could not start" });
  }
}
