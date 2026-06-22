import { getSupabaseAdmin } from "../lib/supabase.js";
import { sanitizeOrder } from "../lib/orders.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ref = (req.query.ref || "").toString().trim();
  const email = (req.query.email || "").toString().trim().toLowerCase();

  if (!ref || ref.length > 10) return res.status(400).json({ error: "Invalid ref" });
  if (!email) return res.status(400).json({ error: "email is required" });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("ticket_orders")
      .select("*")
      .eq("details2", ref)
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Order not found" });

    return res.status(200).json({ order: sanitizeOrder(data) });
  } catch (err) {
    console.error("status", err);
    return res.status(500).json({ error: err.message || "Could not load order" });
  }
}
