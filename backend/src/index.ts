import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { directorRouter } from './routes/director';
import { rebalancerRouter } from './routes/rebalancer';
import { authenticate } from './middleware/auth';
import { prisma } from './utils/prisma';

const app = express();
const PORT = process.env.PORT || 3006;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

// Rate limit auth only
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'rebalancer-tool', ts: new Date().toISOString() }));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/director', authenticate, directorRouter);
app.use('/api/v1/rebalancer', authenticate, rebalancerRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log(`Rebalancer Tool backend running on port ${PORT}`));

// Neon keepalive — ping every 4 min
setInterval(async () => {
  try { await prisma.$queryRaw`SELECT 1`; }
  catch (e) { console.error('DB keepalive error:', e); }
}, 4 * 60 * 1000);
