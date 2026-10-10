import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import ApiError from '../utils/ApiError.js';

const router = Router();
const validateCredentials = (includeName = false) => (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (includeName && (typeof name !== 'string' || !name.trim())) return next(new ApiError(400, 'Name is required.'));
  if (typeof email !== 'string' || !email.trim()) return next(new ApiError(400, 'Email is required.'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return next(new ApiError(400, 'Enter a valid email address.'));
  if (typeof password !== 'string' || !password) return next(new ApiError(400, 'Password is required.'));
  next();
};
router.post('/register', validateCredentials(true), authController.register);
router.post('/login', validateCredentials(), authController.login);
router.get('/me', requireAuth, authController.me);
export default router;
