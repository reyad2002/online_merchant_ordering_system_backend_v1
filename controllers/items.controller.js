import { supabaseAdmin } from "../db_connection.js";

const ITEM_STATUSES = ["active", "hidden", "out_of_stock"];
const ALLOWED_UPDATE = [
  "name_ar",
  "name_en",
  "base_price",
  "description_ar",
  "description_en",
  "status",
];

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export async function create(req, res) {
  const { categoryId } = req.params;
  const {
    name_ar,
    name_en,
    base_price,
    description_ar,
    description_en,
    status,
  } = req.body || {};
  if (!name_ar || !name_en || base_price === undefined) {
    return res
      .status(400)
      .json({ error: "name_ar, name_en, and base_price required" });
  }
  const priceNum = Number(base_price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: "base_price must be zero or positive" });
  }
  const { data: cat } = await supabaseAdmin
    .from("category")
    .select("merchant_id")
    .eq("id", categoryId)
    .single();
  if (!cat || cat.merchant_id !== req.user.merchant_id) {
    return res.status(404).json({ error: "Category not found" });
  }
  const { data, error } = await supabaseAdmin
    .from("item")
    .insert({
      merchant_id: cat.merchant_id,
      category_id: categoryId,
      name_ar,
      name_en,
      base_price: priceNum,
      description_ar: description_ar ?? null,
      description_en: description_en ?? null,
      status: status && ITEM_STATUSES.includes(status) ? status : "active",
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
}

export async function listByCategory(req, res) {
  const { categoryId } = req.params;
  const { data, error } = await supabaseAdmin
    .from("item")
    .select("*")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function getOne(req, res) {
  const { itemId } = req.params;
  const { data: item, error: itemError } = await supabaseAdmin
    .from("item")
    .select("*")
    .eq("id", itemId)
    .eq("merchant_id", req.user.merchant_id)
    .single();
  if (itemError || !item)
    return res.status(404).json({ error: "Item not found" });
  const { data: variants } = await supabaseAdmin
    .from("item_variant")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at");
  const { data: linkRows } = await supabaseAdmin
    .from("item_modifier_group")
    .select("*")
    .eq("item_id", itemId);
  const modifier_groups = [];
  if (linkRows?.length) {
    for (const rule of linkRows) {
      const gid = rule.modifier_group_id;
      const { data: group } = await supabaseAdmin
        .from("modifier_group")
        .select("*")
        .eq("id", gid)
        .single();
      const { data: modifiers } = await supabaseAdmin
        .from("modifiers")
        .select("*")
        .eq("modifier_group_id", gid);
      modifier_groups.push({
        group: group || { id: gid },
        rule: {
          id: rule.id,
          min_select: rule.min_select,
          max_select: rule.max_select,
        },
        modifiers: modifiers || [],
      });
    }
  }
  res.json({
    ...item,
    variants: variants || [],
    modifier_groups,
  });
}

export async function update(req, res) {
  const { itemId } = req.params;
  const body = req.body || {};
  const updates = pick(body, ALLOWED_UPDATE);
  if (body.status && !ITEM_STATUSES.includes(body.status))
    return res.status(400).json({ error: "Invalid status" });
  if (updates.base_price !== undefined) {
    const p = Number(updates.base_price);
    if (!Number.isFinite(p) || p < 0)
      return res.status(400).json({ error: "base_price must be zero or positive" });
    updates.base_price = p;
  }
  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: "No valid fields to update" });
  const { data, error } = await supabaseAdmin
    .from("item")
    .update(updates)
    .eq("id", itemId)
    .eq("merchant_id", req.user.merchant_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Item not found" });
  res.json(data);
}

export async function updateStatus(req, res) {
  const { itemId } = req.params;
  const { status } = req.body || {};
  if (!status || !ITEM_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: "status must be active, hidden, or out_of_stock" });
  }
  const { data, error } = await supabaseAdmin
    .from("item")
    .update({ status })
    .eq("id", itemId)
    .eq("merchant_id", req.user.merchant_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Item not found" });
  res.json(data);
}

export async function remove(req, res) {
  const { itemId } = req.params;
  const { error } = await supabaseAdmin
    .from("item")
    .delete()
    .eq("id", itemId)
    .eq("merchant_id", req.user.merchant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
}
