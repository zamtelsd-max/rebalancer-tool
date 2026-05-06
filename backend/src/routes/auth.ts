import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { rebalancer: { select: { id: true } } },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const payload: Record<string, unknown> = {
      userId: user.id, username: user.username, role: user.role,
    };
    if (user.rebalancer) payload.rebalancerId = user.rebalancer.id;

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback', { expiresIn: '8h' });
    return res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, rebalancerId: user.rebalancer?.id ?? null },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, username: true, name: true, role: true, isActive: true, rebalancer: { select: { id: true, region: true, cashBalance: true, floatBalance: true } } },
  });
  return res.json(user);
});
