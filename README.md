# Smart Menu & Ordering MVP API

Express backend implementing the Smart Menu & Ordering MVP OpenAPI spec, with Supabase (Postgres) and JWT auth. Reference: your handwritten notes (Auth, Users, Branch, Menu, Category, Item, Variants, Modifiers, Table).

## Architecture (modular & scalable)

- **Routes** (`routes/*.routes.js`): HTTP layer only — define method, path, middleware, and which controller to call. Use `asyncHandler(controller.method)` so async errors hit the error middleware.
- **Controllers** (`controllers/*.controller.js`): Business logic per domain. Receive `(req, res)`, call services/DB, send responses. One file per domain (auth, users, merchants, branches, tables, menus, categories, items, variants, modifiers, public, orders, kitchen, cashier).
- **Middleware** (`middleware/`): Auth (`requireAuth`, `requireManager`, `requireStaff`), optional `optionalAuth`, and central `errorHandler`.
- **Lib** (`lib/`): Shared utilities (`jwt`, `asyncHandler`, `userResponse`).
- **Routes index** (`routes/index.js`): Re-exports all route modules so `app.js` can mount them from one place.

To add a new feature: add controller methods in the right `*.controller.js`, then wire them in the corresponding `*.routes.js`.

## Setup

1. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - In SQL Editor, run `supabase/schema.sql` to create all tables.

2. **Env**
   - Copy `.env` and set:
     - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
     - `JWT_SECRET`, `JWT_EXPIRES_IN`
     - `OWNER_EMAIL` (login name), `OWNER_PASSWORD` (for seed)
     - Optional: `PORT`, `PUBLIC_MENU_BASE_URL` (for table QR URL)

3. **Install and seed**
   ```bash
   npm install
   npm run seed
   ```
   This creates one merchant and one owner user (login with `OWNER_EMAIL` / `OWNER_PASSWORD`).

4. **Run**
   ```bash
   npm start
   ```
   Server listens on `PORT` (default 3001).

## API Overview

- **Auth:** `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- **Users:** CRUD at `/users`, plus `PATCH /users/:id/status`, `PATCH /users/:id/password`, `PATCH /users/:id/branch`
- **Merchants, Branches, Tables:** CRUD; tables under `/branches/:branchId/tables`, QR at `GET /tables/:tableId/qr`
- **Menu, Categories, Items, Variants:** CRUD by menu/category/item; `PATCH /items/:id/status`; categories `PATCH /categories/reorder`
- **Modifiers:** CRUD modifier groups and modifiers; attach/detach to items with min/max at `/items/:itemId/modifier-groups`
- **Public:** `GET /public/menu?merchantId=&tableCode=`, `POST /public/cart/validate`
- **Orders:** `POST /orders` (no auth), `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`
- **Kitchen:** `GET /kitchen/orders`
- **Cashier:** `GET /cashier/orders`

RBAC: owner/manager full access; cashier/kitchen scoped to `branch_id`.
