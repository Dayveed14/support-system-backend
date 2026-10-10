import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const publicUser = (user) => ({
  id: Number(user.id),
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
});

const createToken = (user) => jwt.sign(
  { sub: String(user.id), role: user.role },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn, issuer: 'supportdesk-api' },
);

export async function register({ name, email, password }) {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (cleanName.length < 2 || cleanName.length > 100) {
    throw new ApiError(400, 'Name must be between 2 and 100 characters.');
  }
  if (password.length < 8 || password.length > 72) {
    throw new ApiError(400, 'Password must be between 8 and 72 characters.');
  }

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
  if (existing.length) throw new ApiError(409, 'An account with this email already exists.');

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  try {
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [cleanName, cleanEmail, passwordHash, 'customer'],
    );
    const user = { id: result.insertId, name: cleanName, email: cleanEmail, role: 'customer' };
    return { user: publicUser(user), token: createToken(user) };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'An account with this email already exists.');
    throw error;
  }
}

export async function login({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();
  const [rows] = await pool.execute(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
    [cleanEmail],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  return { user: publicUser(user), token: createToken(user) };
}

export async function getUserById(id) {
  const [rows] = await pool.execute(
    'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1', [id],
  );
  if (!rows.length) throw new ApiError(401, 'User account no longer exists.');
  return publicUser(rows[0]);
}
