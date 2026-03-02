/** Strip password_hash and return safe user for API. */
export function toUserResponse(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
}
