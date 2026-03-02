-- Optional: ensure branch cannot be deleted when it has related tables or orders.
-- The API already returns 409 "Cannot delete, has related data" in that case.
-- If you want the DB to also enforce this (RESTRICT), ensure your FKs use ON DELETE RESTRICT.
-- Run in Supabase SQL editor only if your FKs are not already RESTRICT/NO ACTION.

-- Example: if you need to add or alter the foreign key on "table" to restrict branch delete:
-- ALTER TABLE "table"
--   DROP CONSTRAINT IF EXISTS table_branch_id_fkey,
--   ADD CONSTRAINT table_branch_id_fkey
--     FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE RESTRICT;

-- Example: same for "order":
-- ALTER TABLE "order"
--   DROP CONSTRAINT IF EXISTS order_branch_id_fkey,
--   ADD CONSTRAINT order_branch_id_fkey
--     FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE RESTRICT;

-- Use CASCADE only if you intentionally want deleting a branch to delete all its tables and orders (dangerous for history).
