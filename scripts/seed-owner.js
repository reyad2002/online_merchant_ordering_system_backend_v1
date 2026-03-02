/**
 * Seed one merchant and one owner user.
 * Run after applying supabase/schema.sql.
 * Uses OWNER_EMAIL as login name and OWNER_PASSWORD from .env.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../db_connection.js";

const name = process.env.OWNER_EMAIL || "owner@admin.com";
const password = process.env.OWNER_PASSWORD || "12345678";

async function seed() {
  if (!supabaseAdmin) {
    console.error("Supabase client not configured");
    process.exit(1);
  }
  const { data: existing } = await supabaseAdmin.from("user").select("id").eq("name", name).single();
  if (existing) {
    console.log("Owner user already exists:", name);
    process.exit(0);
  }
  const { data: merchant, error: merr } = await supabaseAdmin
    .from("merchant")
    .insert({ name: "Default Merchant" })
    .select()
    .single();
  if (merr || !merchant) {
    console.error("Failed to create merchant:", merr?.message);
    process.exit(1);
  }
  const password_hash = await bcrypt.hash(password, 10);
  const { error: uerr } = await supabaseAdmin.from("user").insert({
    name,
    password_hash,
    merchant_id: merchant.id,
    branch_id: null,
    role: "owner",
    status: "active",
  });
  if (uerr) {
    console.error("Failed to create owner:", uerr.message);
    process.exit(1);
  }
  console.log("Seeded merchant and owner. Login with name:", name);
}

seed();
