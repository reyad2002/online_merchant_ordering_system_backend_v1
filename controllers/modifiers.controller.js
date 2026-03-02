import { supabaseAdmin } from "../db_connection.js";

const GROUP_UPDATE = ["name_ar", "name_en"];
const MODIFIER_UPDATE = ["name_ar", "name_en", "price"];
const ITEM_MODIFIER_GROUP_UPDATE = ["min_select", "max_select"];

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

// ----- Modifier groups -----
export async function createGroup(req, res) {
  const { name_ar, name_en } = req.body || {};
  if (!name_ar || !name_en) return res.status(400).json({ error: "name_ar and name_en required" });
  const { data, error } = await supabaseAdmin
    .from("modifier_group")
    .insert({ merchant_id: req.user.merchant_id, name_ar, name_en })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
}

export async function listGroups(req, res) {
  const { data, error } = await supabaseAdmin
    .from("modifier_group")
    .select("*")
    .eq("merchant_id", req.user.merchant_id)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
}

export async function updateGroup(req, res) {
  const { groupId } = req.params;
  const updates = pick(req.body || {}, GROUP_UPDATE);
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields to update" });
  const { data, error } = await supabaseAdmin
    .from("modifier_group")
    .update(updates)
    .eq("id", groupId)
    .eq("merchant_id", req.user.merchant_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Modifier group not found" });
  res.json(data);
}

export async function removeGroup(req, res) {
  const { groupId } = req.params;
  const { error } = await supabaseAdmin
    .from("modifier_group")
    .delete()
    .eq("id", groupId)
    .eq("merchant_id", req.user.merchant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
}

// ----- Modifiers by group -----
export async function createModifier(req, res) {
  const { groupId } = req.params;
  const { name_ar, name_en, price } = req.body || {};
  if (!name_ar || !name_en || price === undefined) {
    return res.status(400).json({ error: "name_ar, name_en, and price required" });
  }
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: "price must be zero or positive" });
  }
  const { data: grp } = await supabaseAdmin.from("modifier_group").select("merchant_id").eq("id", groupId).single();
  if (!grp || grp.merchant_id !== req.user.merchant_id) {
    return res.status(404).json({ error: "Modifier group not found" });
  }
  const { data, error } = await supabaseAdmin
    .from("modifiers")
    .insert({
      merchant_id: grp.merchant_id,
      modifier_group_id: groupId,
      name_ar,
      name_en,
      price: priceNum,
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
}

export async function listModifiers(req, res) {
  const { groupId } = req.params;
  const { data, error } = await supabaseAdmin
    .from("modifiers")
    .select("*")
    .eq("modifier_group_id", groupId)
    .order("created_at");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
}

export async function updateModifier(req, res) {
  const { modifierId } = req.params;
  const updates = pick(req.body || {}, MODIFIER_UPDATE);
  if (updates.price !== undefined) {
    const p = Number(updates.price);
    if (!Number.isFinite(p) || p < 0)
      return res.status(400).json({ error: "price must be zero or positive" });
    updates.price = p;
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields to update" });
  const { data, error } = await supabaseAdmin
    .from("modifiers")
    .update(updates)
    .eq("id", modifierId)
    .eq("merchant_id", req.user.merchant_id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Modifier not found" });
  res.json(data);
}

export async function removeModifier(req, res) {
  const { modifierId } = req.params;
  const { error } = await supabaseAdmin
    .from("modifiers")
    .delete()
    .eq("id", modifierId)
    .eq("merchant_id", req.user.merchant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
}

// ----- Item modifier group (attach/detach) -----
export async function attachToItem(req, res) {
  const { itemId } = req.params;
  const { modifier_group_id, min_select, max_select } = req.body || {};
  if (!modifier_group_id || min_select === undefined || max_select === undefined) {
    return res.status(400).json({ error: "modifier_group_id, min_select, max_select required" });
  }
  const { data: item } = await supabaseAdmin.from("item").select("merchant_id").eq("id", itemId).single();
  if (!item || item.merchant_id !== req.user.merchant_id) {
    return res.status(404).json({ error: "Item not found" });
  }
  const { data, error } = await supabaseAdmin
    .from("item_modifier_group")
    .insert({
      item_id: itemId,
      modifier_group_id,
      min_select: Number(min_select),
      max_select: Number(max_select),
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
}

export async function listByItem(req, res) {
  const { itemId } = req.params;
  const { data, error } = await supabaseAdmin
    .from("item_modifier_group")
    .select("*")
    .eq("item_id", itemId);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
}

export async function updateItemModifierGroup(req, res) {
  const { itemId, groupId } = req.params;
  const updates = pick(req.body || {}, ITEM_MODIFIER_GROUP_UPDATE);
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields to update" });
  const { data, error } = await supabaseAdmin
    .from("item_modifier_group")
    .update(updates)
    .eq("item_id", itemId)
    .eq("modifier_group_id", groupId)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Link not found" });
  res.json(data);
}

export async function detachFromItem(req, res) {
  const { itemId, groupId } = req.params;
  const { error } = await supabaseAdmin
    .from("item_modifier_group")
    .delete()
    .eq("item_id", itemId)
    .eq("modifier_group_id", groupId);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
}
