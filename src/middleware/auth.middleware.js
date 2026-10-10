import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new ApiError(401, 'Authentication required.'));
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret, { issuer: 'supportdesk-api' });
    req.user = { id: Number(payload.sub), role: payload.role };
    return next();
  } catch {
    return next(new ApiError(401, 'Your session is invalid or has expired. Please sign in again.'));
  }
}
