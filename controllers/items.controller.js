import { supabaseAdmin } from "../db_connection.js";
import { uploadToR2, getKeyFromUrl, deleteFromR2 } from "../lib/r2Upload.js";
import { v4 as uuidv4 } from "uuid";
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
  const { data: items, error } = await supabaseAdmin
    .from("item")
    .select("*")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  if (!items?.length) return res.json([]);

  const itemIds = items.map((i) => i.id);
  const { data: imagesRows } = await supabaseAdmin
    .from("item_images")
    .select("item_id, img_url_1, img_url_2")
    .in("item_id", itemIds);

  const imagesByItemId = {};
  for (const row of imagesRows || []) {
    imagesByItemId[row.item_id] = {
      img_url_1: row.img_url_1 ?? null,
      img_url_2: row.img_url_2 ?? null,
    };
  }

  const result = items.map((item) => ({
    ...item,
    images: imagesByItemId[item.id] ?? { img_url_1: null, img_url_2: null },
  }));
  res.json(result);
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
  const { data: itemImages } = await supabaseAdmin
    .from("item_images")
    .select("img_url_1, img_url_2")
    .eq("item_id", itemId)
    .maybeSingle();
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
    images: itemImages
      ? {
          img_url_1: itemImages.img_url_1 ?? null,
          img_url_2: itemImages.img_url_2 ?? null,
        }
      : { img_url_1: null, img_url_2: null },
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
  const { data: item } = await supabaseAdmin
    .from("item")
    .select("id")
    .eq("id", itemId)
    .eq("merchant_id", req.user.merchant_id)
    .single();
  if (!item)
    return res.status(404).json({ error: "Item not found" });

  const { data: itemImages } = await supabaseAdmin
    .from("item_images")
    .select("img_url_1, img_url_2")
    .eq("item_id", itemId)
    .maybeSingle();

  if (itemImages) {
    const keys = [
      getKeyFromUrl(itemImages.img_url_1),
      getKeyFromUrl(itemImages.img_url_2),
    ].filter(Boolean);
    for (const key of keys) {
      try {
        await deleteFromR2(key);
      } catch (_) {
        // still delete from DB even if R2 delete fails
      }
    }
  }

  await supabaseAdmin
    .from("item_images")
    .delete()
    .eq("item_id", itemId);
  const { error } = await supabaseAdmin
    .from("item")
    .delete()
    .eq("id", itemId)
    .eq("merchant_id", req.user.merchant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
}

function getExtension(mimetype) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimetype] || "jpg";
}

export async function uploadItemImages(req, res) {
  const { itemId } = req.params;
  const files = req.files || {};
  const image1 = files.image1?.[0];
  const image2 = files.image2?.[0];

  if (!image1 && !image2) {
    return res
      .status(400)
      .json({ error: "At least one image required (image1 or image2)" });
  }

  const { data: item, error: itemError } = await supabaseAdmin
    .from("item")
    .select("id")
    .eq("id", itemId)
    .eq("merchant_id", req.user.merchant_id)
    .single();
  if (itemError || !item)
    return res.status(404).json({ error: "Item not found" });

  const urls = { img_url_1: null, img_url_2: null };

  try {
    if (image1) {
      const ext = getExtension(image1.mimetype);
      const key = `items/${itemId}/${uuidv4()}.${ext}`;
      urls.img_url_1 = await uploadToR2(
        image1.buffer,
        key,
        image1.mimetype
      );
    }
    if (image2) {
      const ext = getExtension(image2.mimetype);
      const key = `items/${itemId}/${uuidv4()}.${ext}`;
      urls.img_url_2 = await uploadToR2(
        image2.buffer,
        key,
        image2.mimetype
      );
    }
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Upload failed", details: err.message });
  }

  const { data: existing } = await supabaseAdmin
    .from("item_images")
    .select("id")
    .eq("item_id", itemId)
    .maybeSingle();

  if (existing) {
    const update = {};
    if (urls.img_url_1 != null) update.img_url_1 = urls.img_url_1;
    if (urls.img_url_2 != null) update.img_url_2 = urls.img_url_2;
    if (Object.keys(update).length === 0) {
      return res.json({ images: urls });
    }
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("item_images")
      .update(update)
      .eq("item_id", itemId)
      .select()
      .single();
    if (updateError)
      return res.status(400).json({ error: updateError.message });
    return res.json({ images: updated });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("item_images")
    .insert({
      item_id: itemId,
      img_url_1: urls.img_url_1,
      img_url_2: urls.img_url_2,
    })
    .select()
    .single();
  if (insertError) return res.status(400).json({ error: insertError.message });
  res.status(201).json({ images: inserted });
}

const CLEAR_KEYS = ["image1", "image2"];

export async function clearItemImage(req, res) {
  const { itemId } = req.params;
  let clear = req.body?.clear;
  if (clear == null) {
    return res
      .status(400)
      .json({ error: "Body must include 'clear': 'image1' | 'image2' | ['image1','image2']" });
  }
  if (!Array.isArray(clear)) clear = [clear];
  const toClear = clear.filter((c) => CLEAR_KEYS.includes(c));
  if (toClear.length === 0) {
    return res.status(400).json({ error: "clear must be 'image1' and/or 'image2'" });
  }

  const { data: item, error: itemError } = await supabaseAdmin
    .from("item")
    .select("id")
    .eq("id", itemId)
    .eq("merchant_id", req.user.merchant_id)
    .single();
  if (itemError || !item)
    return res.status(404).json({ error: "Item not found" });

  const { data: existing } = await supabaseAdmin
    .from("item_images")
    .select("id, img_url_1, img_url_2")
    .eq("item_id", itemId)
    .maybeSingle();

  const update = {};
  if (toClear.includes("image1")) update.img_url_1 = null;
  if (toClear.includes("image2")) update.img_url_2 = null;

  if (existing) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("item_images")
      .update(update)
      .eq("item_id", itemId)
      .select()
      .single();
    if (updateError) return res.status(400).json({ error: updateError.message });
    return res.json({ images: updated });
  }

  res.json({
    images: { item_id: itemId, img_url_1: null, img_url_2: null },
  });
}
