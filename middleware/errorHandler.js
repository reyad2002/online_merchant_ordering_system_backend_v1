/**
 * Central error handler. Controllers can throw or reject; asyncHandler passes here.
 */
export function errorHandler(err, req, res, next) {
  console.error(err);
  let status = err.statusCode ?? err.status ?? 500;
  if (err.code === "LIMIT_FILE_SIZE") status = 400;
  const message = err.message || "Internal server error";
  res.status(status).json({ error: message });
}
