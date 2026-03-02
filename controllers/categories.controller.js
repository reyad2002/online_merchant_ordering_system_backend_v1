import { supabaseAdmin } from "../db_connection.js";

const ALLOWED_UPDATE = [
  "name_ar",
  "name_en",
  "description_ar",
  "description_en",
  "sort_order",
  "img_url_1",
  "is_active",
];

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export async function reorder(req, res) {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "items array with category_id and sort_order required" });
  }
  for (const it of items) {
    const { category_id, sort_order } = it;
    if (!category_id || typeof sort_order !== "number") continue;
    await supabaseAdmin
      .from("category")
      .update({ sort_order })
      .eq("id", category_id)
      .eq("merchant_id", req.user.merchant_id);
  }
  res.json({ ok: true });
}

export async function update(req, res) {
  const { categoryId } = req.params;
  const updates = pick(req.body || {}, ALLOWED_UPDATE);
  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: "No valid fields to update" });
  const { data, error } = await supabaseAdmin
    .from("category")
    .update(updates)
    .eq("id", categoryId)
    .eq("merchant_id", req.user.merchant_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Category not found" });
  res.json(data);
}

export async function remove(req, res) {
  const { categoryId } = req.params;
  const { error } = await supabaseAdmin
    .from("category")
    .delete()
    .eq("id", categoryId)
    .eq("merchant_id", req.user.merchant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
}
