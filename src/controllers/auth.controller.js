import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, message: 'Account created successfully.', data: result });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, message: 'Signed in successfully.', data: result });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.user.id);
  res.status(200).json({ success: true, data: { user } });
});
