/**
 * Central error handler. Controllers can throw or reject; asyncHandler passes here.
 */
export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.statusCode ?? err.status ?? 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ error: message });
}
