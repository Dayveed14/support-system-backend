import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const statusCode = error.statusCode || 500;
  if (env.nodeEnv !== 'production') console.error(error);
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && env.nodeEnv === 'production'
      ? 'An unexpected server error occurred.'
      : error.message || 'An unexpected server error occurred.',
  });
}
