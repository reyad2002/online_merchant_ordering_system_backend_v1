import { supabaseAdmin } from "../db_connection.js";

const DEFAULT_RANK_LIMIT = 10;

function round(value, digits = 2) {
  const num = Number(value) || 0;
  const factor = 10 ** digits;
  return Math.round(num * factor) / factor;
}

function normalizeTopLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_RANK_LIMIT;
  return Math.min(Math.floor(parsed), 50);
}

function normalizeDateInput(value, endOfDay = false) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}${endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"}`;
  }
  return trimmed;
}

function getFilters(query) {
  return {
    branchId: query.branch_id || null,
    from: normalizeDateInput(query.from, false),
    to: normalizeDateInput(query.to, true),
  };
}

function isCompleted(order) {
  return order?.status === "completed";
}

function isCancelled(order) {
  return order?.status === "cancelled";
}

function percentage(part, total) {
  if (!total) return 0;
  return round((part / total) * 100);
}

function average(total, count) {
  if (!count) return 0;
  return round(total / count);
}

function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function toMonthKey(value) {
  return new Date(value).toISOString().slice(0, 7);
}

function toWeekStartKey(value) {
  const date = new Date(value);
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

function buildTimeline(orders, bucketKey, labelKey) {
  const buckets = new Map();

  for (const order of orders) {
    const key = bucketKey(order.created_at);
    if (!buckets.has(key)) {
      buckets.set(key, {
        [labelKey]: key,
        total_sales: 0,
        orders_count: 0,
        completed_orders_count: 0,
        cancelled_orders_count: 0,
      });
    }

    const bucket = buckets.get(key);
    bucket.orders_count += 1;

    if (isCompleted(order)) {
      bucket.completed_orders_count += 1;
      bucket.total_sales = round(bucket.total_sales + Number(order.total_price || 0));
    }

    if (isCancelled(order)) {
      bucket.cancelled_orders_count += 1;
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    String(a[labelKey]).localeCompare(String(b[labelKey])),
  );
}

async function getScopedBranches(req, branchId) {
  let query = supabaseAdmin
    .from("branch")
    .select("id, name")
    .eq("merchant_id", req.user.merchant_id);

  if (branchId) query = query.eq("id", branchId);

  const { data, error } = await query.order("name");
  if (error) throw error;
  return data || [];
}

async function getOrdersForBranches(branchIds, filters) {
  if (!branchIds.length) return [];

  let query = supabaseAdmin
    .from("order")
    .select("*")
    .in("branch_id", branchIds)
    .order("created_at", { ascending: false });

  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getTablesForBranches(branchIds) {
  if (!branchIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from("table")
    .select("id, number, branch_id, seats, is_active")
    .in("branch_id", branchIds)
    .order("number");

  if (error) throw error;
  return data || [];
}

function buildSummary(orders) {
  const completedOrders = orders.filter(isCompleted);
  const cancelledOrders = orders.filter(isCancelled);
  const totalSales = round(
    completedOrders.reduce((sum, order) => sum + Number(order.total_price || 0), 0),
  );

  return {
    total_sales: totalSales,
    orders_count: orders.length,
    completed_orders_count: completedOrders.length,
    cancelled_orders_count: cancelledOrders.length,
    average_order_value: average(totalSales, completedOrders.length),
    completed_rate: percentage(completedOrders.length, orders.length),
    cancelled_rate: percentage(cancelledOrders.length, orders.length),
  };
}

function buildEmptyPaginationPayload(filters) {
  return {
    filters: {
      from: filters.from,
      to: filters.to,
      branch_id: filters.branchId,
    },
  };
}

export async function sales(req, res) {
  try {
    const filters = getFilters(req.query);
    const branches = await getScopedBranches(req, filters.branchId);
    const branchIds = branches.map((branch) => branch.id);
    const orders = await getOrdersForBranches(branchIds, filters);

    res.json({
      ...buildEmptyPaginationPayload(filters),
      summary: buildSummary(orders),
      sales_by_day: buildTimeline(orders, toDateKey, "date"),
      sales_by_week: buildTimeline(orders, toWeekStartKey, "week_start"),
      sales_by_month: buildTimeline(orders, toMonthKey, "month"),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function branches(req, res) {
  try {
    const filters = getFilters(req.query);
    const branches = await getScopedBranches(req, filters.branchId);
    const branchIds = branches.map((branch) => branch.id);
    const orders = await getOrdersForBranches(branchIds, filters);

    const branchStats = branches.map((branch) => {
      const branchOrders = orders.filter(
        (order) => String(order.branch_id) === String(branch.id),
      );
      const summary = buildSummary(branchOrders);

      return {
        branch_id: branch.id,
        branch_name: branch.name,
        ...summary,
      };
    });

    const bestBranchBySales = [...branchStats].sort(
      (a, b) => b.total_sales - a.total_sales,
    )[0] || null;
    const bestBranchByOrders = [...branchStats].sort(
      (a, b) => b.orders_count - a.orders_count,
    )[0] || null;

    res.json({
      ...buildEmptyPaginationPayload(filters),
      summary: {
        branches_count: branches.length,
        best_branch_by_sales: bestBranchBySales,
        best_branch_by_orders: bestBranchByOrders,
      },
      branches: branchStats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function tables(req, res) {
  try {
    const filters = getFilters(req.query);
    const branches = await getScopedBranches(req, filters.branchId);
    const branchIds = branches.map((branch) => branch.id);
    const branchMap = new Map(branches.map((branch) => [String(branch.id), branch]));
    const [orders, tables] = await Promise.all([
      getOrdersForBranches(branchIds, filters),
      getTablesForBranches(branchIds),
    ]);

    const ordersByTableId = new Map();
    for (const order of orders) {
      if (!order.table_id) continue;
      const key = String(order.table_id);
      if (!ordersByTableId.has(key)) ordersByTableId.set(key, []);
      ordersByTableId.get(key).push(order);
    }

    const tableStats = tables.map((table) => {
      const tableOrders = ordersByTableId.get(String(table.id)) || [];
      const summary = buildSummary(tableOrders);
      const branch = branchMap.get(String(table.branch_id)) || null;

      return {
        table_id: table.id,
        table_number: table.number != null ? String(table.number) : null,
        branch_id: table.branch_id,
        branch_name: branch?.name ?? null,
        is_active: table.is_active,
        seats: table.seats,
        ...summary,
      };
    });

    const linkedOrdersCount = orders.filter((order) => order.table_id != null).length;
    const unlinkedOrdersCount = orders.length - linkedOrdersCount;
    const mostUsedTable = [...tableStats].sort(
      (a, b) => b.orders_count - a.orders_count,
    )[0] || null;
    const topSalesTable = [...tableStats].sort(
      (a, b) => b.total_sales - a.total_sales,
    )[0] || null;

    res.json({
      ...buildEmptyPaginationPayload(filters),
      summary: {
        tables_count: tables.length,
        linked_orders_count: linkedOrdersCount,
        unlinked_orders_count: unlinkedOrdersCount,
        linked_orders_rate: percentage(linkedOrdersCount, orders.length),
        most_used_table: mostUsedTable,
        top_sales_table: topSalesTable,
      },
      tables: tableStats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function menu(req, res) {
  try {
    const filters = getFilters(req.query);
    const topLimit = normalizeTopLimit(req.query.top_limit);
    const branches = await getScopedBranches(req, filters.branchId);
    const branchIds = branches.map((branch) => branch.id);
    const orders = await getOrdersForBranches(branchIds, filters);
    const completedOrders = orders.filter(isCompleted);
    const orderIds = completedOrders.map((order) => order.id);

    const [
      orderItemsRes,
      itemsRes,
      categoriesRes,
      variantsRes,
      modifiersRes,
    ] = await Promise.all([
      orderIds.length
        ? supabaseAdmin.from("order_items").select("*").in("order_id", orderIds)
        : Promise.resolve({ data: [] }),
      supabaseAdmin
        .from("item")
        .select("id, category_id, name_ar, name_en")
        .eq("merchant_id", req.user.merchant_id),
      supabaseAdmin
        .from("category")
        .select("id, name_ar, name_en")
        .eq("merchant_id", req.user.merchant_id),
      supabaseAdmin
        .from("item_variant")
        .select("id, item_id, name_ar, name_en")
        .eq("merchant_id", req.user.merchant_id),
      supabaseAdmin
        .from("modifiers")
        .select("id, modifier_group_id, name_ar, name_en")
        .eq("merchant_id", req.user.merchant_id),
    ]);

    if (orderItemsRes.error) throw orderItemsRes.error;
    if (itemsRes.error) throw itemsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (variantsRes.error) throw variantsRes.error;
    if (modifiersRes.error) throw modifiersRes.error;

    const orderItems = orderItemsRes.data || [];
    const orderItemIds = orderItems.map((item) => item.id);

    const orderItemModifiersRes = orderItemIds.length
      ? await supabaseAdmin
          .from("order_item_modifier")
          .select("*")
          .in("order_item_id", orderItemIds)
      : { data: [], error: null };
    if (orderItemModifiersRes.error) throw orderItemModifiersRes.error;

    const items = itemsRes.data || [];
    const categories = categoriesRes.data || [];
    const variants = variantsRes.data || [];
    const modifiers = modifiersRes.data || [];
    const orderItemModifiers = orderItemModifiersRes.data || [];

    const itemMap = new Map(items.map((item) => [String(item.id), item]));
    const categoryMap = new Map(
      categories.map((category) => [String(category.id), category]),
    );
    const variantMap = new Map(variants.map((variant) => [String(variant.id), variant]));
    const modifierMap = new Map(
      modifiers.map((modifier) => [String(modifier.id), modifier]),
    );

    const itemStats = new Map();
    for (const item of items) {
      itemStats.set(String(item.id), {
        item_id: item.id,
        item_name_ar: item.name_ar,
        item_name_en: item.name_en,
        category_id: item.category_id,
        quantity_sold: 0,
        revenue: 0,
        orders_count: 0,
      });
    }

    const variantStats = new Map();
    const categoryStats = new Map();
    const itemOrderSeen = new Set();
    const orderItemMap = new Map(orderItems.map((item) => [String(item.id), item]));

    for (const orderItem of orderItems) {
      const itemKey = String(orderItem.item_id);
      const itemMeta = itemMap.get(itemKey) || null;
      const stats =
        itemStats.get(itemKey) ||
        {
          item_id: orderItem.item_id,
          item_name_ar: null,
          item_name_en: orderItem.name_snapshot ?? null,
          category_id: itemMeta?.category_id ?? null,
          quantity_sold: 0,
          revenue: 0,
          orders_count: 0,
        };

      stats.quantity_sold += Number(orderItem.quantity || 0);
      stats.revenue = round(stats.revenue + Number(orderItem.total_price || 0));

      const uniqueOrderKey = `${orderItem.order_id}:${orderItem.item_id}`;
      if (!itemOrderSeen.has(uniqueOrderKey)) {
        stats.orders_count += 1;
        itemOrderSeen.add(uniqueOrderKey);
      }

      itemStats.set(itemKey, stats);

      if (orderItem.variant_id) {
        const variantMeta = variantMap.get(String(orderItem.variant_id));
        const variantKey = String(orderItem.variant_id);
        if (!variantStats.has(variantKey)) {
          variantStats.set(variantKey, {
            variant_id: orderItem.variant_id,
            item_id: orderItem.item_id,
            variant_name_ar: variantMeta?.name_ar ?? null,
            variant_name_en: variantMeta?.name_en ?? null,
            quantity_sold: 0,
            revenue: 0,
          });
        }
        const variantEntry = variantStats.get(variantKey);
        variantEntry.quantity_sold += Number(orderItem.quantity || 0);
        variantEntry.revenue = round(
          variantEntry.revenue + Number(orderItem.total_price || 0),
        );
      }

      const categoryId = itemMeta?.category_id;
      if (categoryId != null) {
        const categoryKey = String(categoryId);
        const categoryMeta = categoryMap.get(categoryKey) || null;
        if (!categoryStats.has(categoryKey)) {
          categoryStats.set(categoryKey, {
            category_id: categoryId,
            category_name_ar: categoryMeta?.name_ar ?? null,
            category_name_en: categoryMeta?.name_en ?? null,
            quantity_sold: 0,
            revenue: 0,
          });
        }
        const categoryEntry = categoryStats.get(categoryKey);
        categoryEntry.quantity_sold += Number(orderItem.quantity || 0);
        categoryEntry.revenue = round(
          categoryEntry.revenue + Number(orderItem.total_price || 0),
        );
      }
    }

    const modifierStats = new Map();
    for (const modifierUsage of orderItemModifiers) {
      const modifierMeta = modifierMap.get(String(modifierUsage.modifier_id)) || null;
      const orderItem = orderItemMap.get(String(modifierUsage.order_item_id)) || null;
      const quantity = Number(orderItem?.quantity || 1);
      const modifierKey = String(modifierUsage.modifier_id);

      if (!modifierStats.has(modifierKey)) {
        modifierStats.set(modifierKey, {
          modifier_id: modifierUsage.modifier_id,
          modifier_name_ar: modifierMeta?.name_ar ?? null,
          modifier_name_en: modifierMeta?.name_en ?? modifierUsage.name_snapshot ?? null,
          usage_count: 0,
          revenue: 0,
        });
      }

      const modifierEntry = modifierStats.get(modifierKey);
      modifierEntry.usage_count += quantity;
      modifierEntry.revenue = round(
        modifierEntry.revenue + Number(modifierUsage.price || 0),
      );
    }

    const itemStatsList = Array.from(itemStats.values()).map((entry) => {
      const category = entry.category_id
        ? categoryMap.get(String(entry.category_id)) || null
        : null;
      return {
        ...entry,
        revenue: round(entry.revenue),
        category_name_ar: category?.name_ar ?? null,
        category_name_en: category?.name_en ?? null,
      };
    });

    res.json({
      ...buildEmptyPaginationPayload(filters),
      summary: {
        completed_orders_count: completedOrders.length,
        sold_items_count: orderItems.length,
      },
      top_selling_items: [...itemStatsList]
        .sort((a, b) => b.quantity_sold - a.quantity_sold)
        .slice(0, topLimit),
      top_revenue_items: [...itemStatsList]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, topLimit),
      low_selling_items: [...itemStatsList]
        .sort((a, b) => a.quantity_sold - b.quantity_sold || a.revenue - b.revenue)
        .slice(0, topLimit),
      top_categories: Array.from(categoryStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, topLimit),
      top_variants: Array.from(variantStats.values())
        .sort((a, b) => b.quantity_sold - a.quantity_sold)
        .slice(0, topLimit),
      top_modifiers: Array.from(modifierStats.values())
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, topLimit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function operations(req, res) {
  try {
    const filters = getFilters(req.query);
    const branches = await getScopedBranches(req, filters.branchId);
    const branchIds = branches.map((branch) => branch.id);
    const [orders, tables] = await Promise.all([
      getOrdersForBranches(branchIds, filters),
      getTablesForBranches(branchIds),
    ]);

    const operationsByBranch = branches.map((branch) => {
      const branchTables = tables.filter(
        (table) => String(table.branch_id) === String(branch.id),
      );
      const branchOrders = orders.filter(
        (order) => String(order.branch_id) === String(branch.id),
      );
      const activeTablesCount = branchTables.filter((table) => table.is_active).length;
      const inactiveTablesCount = branchTables.length - activeTablesCount;
      const totalSeats = branchTables.reduce(
        (sum, table) => sum + Number(table.seats || 0),
        0,
      );

      return {
        branch_id: branch.id,
        branch_name: branch.name,
        tables_count: branchTables.length,
        active_tables_count: activeTablesCount,
        inactive_tables_count: inactiveTablesCount,
        total_seats: totalSeats,
        orders_count_in_period: branchOrders.length,
        average_orders_per_table: average(branchOrders.length, branchTables.length),
      };
    });

    res.json({
      ...buildEmptyPaginationPayload(filters),
      summary: {
        branches_count: branches.length,
        tables_count: tables.length,
        active_tables_count: tables.filter((table) => table.is_active).length,
        inactive_tables_count: tables.filter((table) => !table.is_active).length,
        total_seats: tables.reduce(
          (sum, table) => sum + Number(table.seats || 0),
          0,
        ),
        orders_count_in_period: orders.length,
      },
      branches: operationsByBranch,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
