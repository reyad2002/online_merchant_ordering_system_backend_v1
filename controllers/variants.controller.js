import { supabaseAdmin } from "../db_connection.js";

const ALLOWED_UPDATE = ["name_ar", "name_en", "price"];

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export async function create(req, res) {
  const { itemId } = req.params;
  const { name_ar, name_en, price } = req.body || {};
  if (!name_ar || !name_en || price === undefined) {
    return res.status(400).json({ error: "name_ar, name_en, and price required" });
  }
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: "price must be zero or positive" });
  }
  const { data: item } = await supabaseAdmin.from("item").select("merchant_id").eq("id", itemId).single();
  if (!item || item.merchant_id !== req.user.merchant_id) {
    return res.status(404).json({ error: "Item not found" });
  }
  const { data, error } = await supabaseAdmin
    .from("item_variant")
    .insert({
      merchant_id: item.merchant_id,
      item_id: itemId,
      name_ar,
      name_en,
      price: priceNum,
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
}

export async function listByItem(req, res) {
  const { itemId } = req.params;
  const { data: item } = await supabaseAdmin.from("item").select("id").eq("id", itemId).eq("merchant_id", req.user.merchant_id).single();
  if (!item) return res.status(404).json({ error: "Item not found" });
  const { data, error } = await supabaseAdmin
    .from("item_variant")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
}

export async function update(req, res) {
  const { variantId } = req.params;
  const updates = pick(req.body || {}, ALLOWED_UPDATE);
  if (updates.price !== undefined) {
    const p = Number(updates.price);
    if (!Number.isFinite(p) || p < 0)
      return res.status(400).json({ error: "price must be zero or positive" });
    updates.price = p;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields to update" });
  const { data, error } = await supabaseAdmin
    .from("item_variant")
    .update(updates)
    .eq("id", variantId)
    .eq("merchant_id", req.user.merchant_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Variant not found" });
  res.json(data);
}

export async function remove(req, res) {
  const { variantId } = req.params;
  const { error } = await supabaseAdmin
    .from("item_variant")
    .delete()
    .eq("id", variantId)
    .eq("merchant_id", req.user.merchant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
}
