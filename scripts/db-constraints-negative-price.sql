-- Optional: enforce non-negative prices at DB level (run in Supabase SQL editor if desired).
-- Add only if your tables don't already have these constraints.

-- Item base_price
ALTER TABLE "item"
  ADD CONSTRAINT item_base_price_non_negative CHECK (base_price >= 0);

-- Item variant price
ALTER TABLE "item_variant"
  ADD CONSTRAINT item_variant_price_non_negative CHECK (price >= 0);

-- Modifier price
ALTER TABLE "modifiers"
  ADD CONSTRAINT modifiers_price_non_negative CHECK (price >= 0);

-- If a constraint already exists, drop it first, e.g.:
-- ALTER TABLE "item" DROP CONSTRAINT IF EXISTS item_base_price_non_negative;
