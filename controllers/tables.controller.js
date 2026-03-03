import QRCode from "qrcode";
import { supabaseAdmin } from "../db_connection.js";

const ALLOWED_UPDATE = ["number", "seats", "is_active", "qr_code"];

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export async function update(req, res) {
  const { tableId } = req.params;
  const updates = pick(req.body || {}, ALLOWED_UPDATE);
  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: "No valid fields to update" });
  const { data, error } = await supabaseAdmin
    .from("table")
    .update(updates)
    .eq("id", tableId)
    .eq("merchant_id", req.user.merchant_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Table not found" });
  res.json(data);
}

export async function remove(req, res) {
  const { tableId } = req.params;
  // حذف البيانات المرتبطة (tables_qrcode) قبل حذف الطاولة
  await supabaseAdmin
    .from("tables_qrcode")
    .delete()
    .eq("table_id", tableId);
  const { error } = await supabaseAdmin
    .from("table")
    .delete()
    .eq("id", tableId)
    .eq("merchant_id", req.user.merchant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
}

export async function getQr(req, res) {
  const { tableId } = req.params;
  const { data: row, error } = await supabaseAdmin
    .from("table")
    .select("qr_code, branch_id, merchant_id")
    .eq("id", tableId)
    .single();
  if (error || !row) return res.status(404).json({ error: "Table not found" });
  const baseUrl = process.env.MENU_FRONTEND_URL || "https://online-merchant-ordering-system-fro.vercel.app";
  const qr_url = `${baseUrl}/menu?merchantId=${row.merchant_id}&tableCode=${encodeURIComponent(row.qr_code || "")}`;
  let qr_svg = null;
  try {
    qr_svg = await QRCode.toString(qr_url, { type: "svg", margin: 2, width: 256 });
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate QR code", details: err.message });
  }
  const { data: existing } = await supabaseAdmin
    .from("tables_qrcode")
    .select("id")
    .eq("table_id", tableId)
    .maybeSingle();
  if (existing) {
    await supabaseAdmin
      .from("tables_qrcode")
      .update({ qr_svg })
      .eq("table_id", tableId);
  } else {
    await supabaseAdmin
      .from("tables_qrcode")
      .insert({ table_id: tableId, qr_svg });
  }
  res.json({
    qr_url,
    qr_svg,
    table_code: row.qr_code,
    branch_id: row.branch_id,
  });
}

export async function getStoredQr(req, res) {
  const { tableId } = req.params;
  const { data, error } = await supabaseAdmin
    .from("tables_qrcode")
    .select("*")
    .eq("table_id", tableId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "QR code not found for this table. Generate it first via GET /tables/:tableId/qr" });
  res.json(data);
}
