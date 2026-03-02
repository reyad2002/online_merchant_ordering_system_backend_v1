import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../db_connection.js";
import { sign } from "../lib/jwt.js";
import { toUserResponse } from "../lib/userResponse.js";

export async function login(req, res) {
  const { name, password } = req.body || {};
  if (!name || !password) {
    return res.status(400).json({ error: "name and password required" });
  }
  const { data: user, error } = await supabaseAdmin
    .from("user")
    .select("*")
    .eq("name", name)
    .single();
  if (error || !user) {
    return res.status(401).json({ error: "Invalid name or password" });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid name or password" });
  }
  if (user.status !== "active") {
    return res.status(403).json({ error: "Account disabled" });
  }
  const access_token = sign({ sub: user.id, role: user.role });
  return res.json({
    access_token,
    user: toUserResponse(user),
  });
}

export function logout(req, res) {
  res.status(200).json({ message: "Logged out" });
}

export function me(req, res) {
  res.json(toUserResponse(req.user));
}
