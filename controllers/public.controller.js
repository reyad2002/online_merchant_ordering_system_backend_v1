import { supabaseAdmin } from "../db_connection.js";

/** Get stored table QR code by table id (public, no auth). */
export async function getTableQrcodeByTableId(req, res) {
  const { tableId } = req.params;
  const { data, error } = await supabaseAdmin
    .from("tables_qrcode")
    .select("*")
    .eq("table_id", tableId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "QR code not found for this table" });
  res.json(data);
}

export async function getMenu(req, res) {
  const { merchantId, tableCode } = req.query;
  if (!merchantId)
    return res.status(400).json({ error: "merchantId required" });
  const { data: menu } = await supabaseAdmin
    .from("menue")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("is_active", true)
    .limit(1)
    .single();
  if (!menu) return res.status(404).json({ error: "Menu not found" });
  let branch_id = null;
  let table_id = null;
  if (tableCode) {
    const { data: tbl } = await supabaseAdmin
      .from("table")
      .select("id, branch_id")
      .eq("qr_code", tableCode)
      .eq("is_active", true)
      .single();
    if (tbl) {
      table_id = tbl.id;
      branch_id = tbl.branch_id;
    }
  }
  const { data: categories } = await supabaseAdmin
    .from("category")
    .select("*")
    .eq("menue_id", menu.id)
    .eq("is_active", true)
    .order("sort_order");
  const result = {
    merchant_id: merchantId,
    branch_id,
    table_id,
    menu,
    categories: [],
  };
  if (!categories?.length) return res.json(result);
  for (const cat of categories) {
    const { data: items } = await supabaseAdmin
      .from("item")
      .select("*")
      .eq("category_id", cat.id)
      .eq("status", "active");
    const itemsWithDetails = [];
    for (const it of items || []) {
      const { data: variants } = await supabaseAdmin
        .from("item_variant")
        .select("*")
        .eq("item_id", it.id);
      const { data: imgLinks } = await supabaseAdmin
        .from("item_modifier_group")
        .select("*")
        .eq("item_id", it.id);
      const modifier_groups = [];
      if (imgLinks?.length) {
        for (const rule of imgLinks) {
          const { data: group } = await supabaseAdmin
            .from("modifier_group")
            .select("*")
            .eq("id", rule.modifier_group_id)
            .single();
          const { data: mods } = await supabaseAdmin
            .from("modifiers")
            .select("*")
            .eq("modifier_group_id", rule.modifier_group_id);
          modifier_groups.push({
            group: group || {},
            rule: { min_select: rule.min_select, max_select: rule.max_select },
            modifiers: mods || [],
          });
        }
      }
      itemsWithDetails.push({
        ...it,
        variants: variants || [],
        modifier_groups,
      });
    }
    result.categories.push({ ...cat, items: itemsWithDetails });
  }
  res.json(result);
}

export async function validateCart(req, res) {
  const { merchant_id, branch_id, table_id, items } = req.body || {};
  if (
    !merchant_id ||
    !branch_id ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res
      .status(400)
      .json({ error: "merchant_id, branch_id, and items required" });
  }
  const { data: branch } = await supabaseAdmin
    .from("branch")
    .select("merchant_id")
    .eq("id", branch_id)
    .single();
  if (!branch || branch.merchant_id !== merchant_id) {
    return res
      .status(400)
      .json({ error: "branch_id must belong to the given merchant_id" });
  }
  const errors = [];
  const line_items = [];
  let subtotal = 0;
  for (const line of items) {
    const { item_id, variant_id, quantity, modifiers } = line;
    const q = Number(quantity);
    if (!item_id || !Number.isFinite(q) || q < 1 || q > 100) {
      errors.push("Each item must have item_id and quantity between 1 and 100");
      continue;
    }
    const quantityValid = Math.min(100, Math.max(1, Math.floor(q)));
    const { data: item } = await supabaseAdmin
      .from("item")
      .select("*")
      .eq("id", item_id)
      .single();
    if (!item || item.merchant_id !== merchant_id) {
      errors.push(`Item ${item_id} not found`);
      continue;
    }
    if (item.status !== "active") {
      errors.push(`Item ${item.name_en} is not available`);
      continue;
    }
    if (Number(item.base_price) < 0) {
      errors.push(`Item ${item.name_en} has invalid price`);
      continue;
    }
    let unit_price = Number(item.base_price);
    if (variant_id) {
      const { data: variant } = await supabaseAdmin
        .from("item_variant")
        .select("*")
        .eq("id", variant_id)
        .eq("item_id", item_id)
        .single();
      if (!variant) {
        errors.push(`Variant ${variant_id} not found for item`);
        continue;
      }
      if (Number(variant.price) < 0) {
        errors.push(`Variant has invalid price for item ${item.name_en}`);
        continue;
      }
      unit_price = Number(variant.price);
    }
    const { data: imgLinks } = await supabaseAdmin
      .from("item_modifier_group")
      .select("*")
      .eq("item_id", item_id);
    const selectedModIds = (modifiers || []).map((m) => m.modifier_id);
    for (const rule of imgLinks || []) {
      const { data: mods } = await supabaseAdmin
        .from("modifiers")
        .select("id")
        .eq("modifier_group_id", rule.modifier_group_id);
      const inGroup = (mods || []).filter((m) => selectedModIds.includes(m.id));
      if (inGroup.length < rule.min_select) {
        errors.push(
          `Item ${item.name_en}: select at least ${rule.min_select} from modifier group`,
        );
      }
      if (inGroup.length > rule.max_select) {
        errors.push(
          `Item ${item.name_en}: select at most ${rule.max_select} from modifier group`,
        );
      }
    }
    let line_total = unit_price * quantityValid;
    let hasModError = false;
    const modSelections = modifiers || [];
    for (const sel of modSelections) {
      const { data: mod } = await supabaseAdmin
        .from("modifiers")
        .select("id, price")
        .eq("id", sel.modifier_id)
        .single();
      if (mod) {
        const modPrice = Number(mod.price);
        if (modPrice < 0) {
          errors.push(`Modifier has invalid price`);
          hasModError = true;
          break;
        }
        const selQty = Math.min(100, Math.max(1, Math.floor(Number(sel.quantity) || 1)));
        line_total += modPrice * selQty * quantityValid;
      }
    }
    if (hasModError) continue;
    subtotal += line_total;
    line_items.push({
      item_id,
      variant_id: variant_id || null,
      unit_price,
      qty: quantityValid,
      line_total,
    });
  }
  const is_valid = errors.length === 0;
  res.json({
    is_valid,
    errors,
    totals: { subtotal, total: subtotal },
    line_items,
  });
}
