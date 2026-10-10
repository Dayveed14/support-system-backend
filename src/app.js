import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

const allowedOrigins = [
  "http://localhost:5173",
  "https://support-system-pi-ashy.vercel.app",
  "https://localhost",
];

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '10kb' }));
app.get('/api/health', (req, res) => res.json({ success: true, message: 'SupportDesk API is running.' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes);
app.use('/api/tickets', requireAuth, ticketRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
