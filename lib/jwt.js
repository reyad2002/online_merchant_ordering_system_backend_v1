import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "dev-secret";
const expiresIn = process.env.JWT_EXPIRES_IN || "1d";

export function sign(payload) {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verify(token) {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export function decode(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}
