import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest, requireRoles } from '../middleware/auth';
import { calcWeightedScore, mtdStart, todayStart, workingDaysElapsed, workingDaysInMonth } from '../utils/kpi';
import bcrypt from 'bcryptjs';

export const directorRouter = Router();
const guard = requireRoles('DIRECTOR', 'ADMIN');

// ── Dashboard ────────────────────────────────────────────────────────────────
directorRouter.get('/dashboard', guard, async (req: AuthRequest, res: Response) => {
  const today = todayStart();
  const mtd = mtdStart();
  const target = await prisma.targetVersion.findFirst({ where: { isActive: true } });
  const wde = workingDaysElapsed();
  const wdm = workingDaysInMonth();

  const [master, rebalancers, distributions, prospects, redFlags] = await Promise.all([
    prisma.masterAccount.findFirst(),
    prisma.rebalancer.findMany({ where: { isActive: true }, include: { user: { select: { name: true } }, distributions: { where: { createdAt: { gte: today } } }, prospects: { where: { createdAt: { gte: today } } } } }),
    prisma.distribution.findMany({ where: { createdAt: { gte: today } } }),
    prisma.prospect.findMany({ where: { createdAt: { gte: today } } }),
    prisma.agentProfile.count({ where: { isRedFlagged: true } }),
  ]);

  const cashTarget = Number(target?.cashTarget ?? 30000);
  const floatTarget = Number(target?.floatTarget ?? 30000);
  const visitsTarget = target?.visitsTarget ?? 35;
  const prospectsTarget = target?.prospectsTarget ?? 5;

  const todayCash = distributions.filter(d => d.type === 'CASH').reduce((s, d) => s + Number(d.amount), 0);
  const todayFloat = distributions.filter(d => d.type === 'FLOAT').reduce((s, d) => s + Number(d.amount), 0);
  const todayAgents = new Set(distributions.map(d => d.agentCode)).size;
  const todayProspects = prospects.length;

  const leaderboard = rebalancers.map(r => {
    const cash = r.distributions.filter(d => d.type === 'CASH').reduce((s, d) => s + Number(d.amount), 0);
    const float = r.distributions.filter(d => d.type === 'FLOAT').reduce((s, d) => s + Number(d.amount), 0);
    const visits = new Set(r.distributions.map(d => d.agentCode)).size;
    const prs = r.prospects.length;
    const score = calcWeightedScore({ cashPct: (cash / cashTarget) * 100, floatPct: (float / floatTarget) * 100, visitsPct: (visits / visitsTarget) * 100, prospectsPct: (prs / prospectsTarget) * 100 });
    return { id: r.id, name: r.user.name, score, cash, float, visits, prospects: prs };
  }).sort((a, b) => b.score - a.score).slice(0, 5);

  return res.json({
    master: { cashBalance: Number(master?.cashBalance ?? 0), floatBalance: Number(master?.floatBalance ?? 0) },
    today: { cash: todayCash, float: todayFloat, agents: todayAgents, prospects: todayProspects },
    targets: { cash: cashTarget, float: floatTarget, visits: visitsTarget, prospects: prospectsTarget },
    leaderboard,
    redFlags,
    mtd: { wde, wdm },
  });
});

// ── Rebalancers list ─────────────────────────────────────────────────────────
directorRouter.get('/rebalancers', guard, async (_req: AuthRequest, res: Response) => {
  const today = todayStart();
  const target = await prisma.targetVersion.findFirst({ where: { isActive: true } });
  const cashTarget = Number(target?.cashTarget ?? 30000);
  const floatTarget = Number(target?.floatTarget ?? 30000);
  const visitsTarget = target?.visitsTarget ?? 35;
  const prospectsTarget = target?.prospectsTarget ?? 5;

  const rebalancers = await prisma.rebalancer.findMany({
    where: { isActive: true },
    include: {
      user: { select: { id: true, name: true, username: true } },
      distributions: { where: { createdAt: { gte: today } } },
      prospects: { where: { createdAt: { gte: today } } },
    },
  });

  return res.json(rebalancers.map(r => {
    const cash = r.distributions.filter(d => d.type === 'CASH').reduce((s, d) => s + Number(d.amount), 0);
    const float = r.distributions.filter(d => d.type === 'FLOAT').reduce((s, d) => s + Number(d.amount), 0);
    const visits = new Set(r.distributions.map(d => d.agentCode)).size;
    const prs = r.prospects.length;
    const score = calcWeightedScore({ cashPct: (cash / cashTarget) * 100, floatPct: (float / floatTarget) * 100, visitsPct: (visits / visitsTarget) * 100, prospectsPct: (prs / prospectsTarget) * 100 });
    return { id: r.id, userId: r.userId, name: r.user.name, username: r.user.username, region: r.region, cashBalance: Number(r.cashBalance), floatBalance: Number(r.floatBalance), today: { cash, float, visits, prospects: prs, cashPct: Math.round((cash / cashTarget) * 100), floatPct: Math.round((float / floatTarget) * 100), visitsPct: Math.round((visits / visitsTarget) * 100), prospectsPct: Math.round((prs / prospectsTarget) * 100) }, score };
  }));
});

// ── Allocate ─────────────────────────────────────────────────────────────────
directorRouter.post('/allocate', guard, async (req: AuthRequest, res: Response) => {
  const { rebalancerId, type, amount, reference, notes } = req.body;
  if (!rebalancerId || !type || !amount) return res.status(400).json({ error: 'rebalancerId, type, amount required' });
  if (!['CASH', 'FLOAT'].includes(type)) return res.status(400).json({ error: 'type must be CASH or FLOAT' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Amount must be positive' });

  const [master, rebalancer] = await Promise.all([
    prisma.masterAccount.findFirst(),
    prisma.rebalancer.findUnique({ where: { id: rebalancerId } }),
  ]);
  if (!master || !rebalancer) return res.status(404).json({ error: 'Not found' });

  const masterBal = type === 'CASH' ? Number(master.cashBalance) : Number(master.floatBalance);
  if (masterBal < amt) return res.status(400).json({ error: `Insufficient master ${type.toLowerCase()} balance` });

  const [allocation] = await prisma.$transaction([
    prisma.allocation.create({ data: { rebalancerId, type, amount: amt, reference, notes, allocatedById: req.user!.userId } }),
    type === 'CASH'
      ? prisma.masterAccount.update({ where: { id: master.id }, data: { cashBalance: { decrement: amt } } })
      : prisma.masterAccount.update({ where: { id: master.id }, data: { floatBalance: { decrement: amt } } }),
    type === 'CASH'
      ? prisma.rebalancer.update({ where: { id: rebalancerId }, data: { cashBalance: { increment: amt } } })
      : prisma.rebalancer.update({ where: { id: rebalancerId }, data: { floatBalance: { increment: amt } } }),
  ]);
  return res.json({ success: true, allocation });
});

// ── Allocation history ────────────────────────────────────────────────────────
directorRouter.get('/allocations', guard, async (_req: AuthRequest, res: Response) => {
  const allocs = await prisma.allocation.findMany({
    orderBy: { createdAt: 'desc' }, take: 100,
    include: { rebalancer: { include: { user: { select: { name: true } } } } },
  });
  return res.json(allocs);
});

// ── Agents board ──────────────────────────────────────────────────────────────
directorRouter.get('/agents', requireRoles('DIRECTOR', 'ADMIN', 'SUPERVISOR'), async (_req: AuthRequest, res: Response) => {
  const mtd = mtdStart();
  const agents = await prisma.agentProfile.findMany({ orderBy: { name: 'asc' } });
  const distMtd = await prisma.distribution.findMany({ where: { createdAt: { gte: mtd } } });

  const agentMap = new Map<string, { lastVisit?: Date; visits: number; cash: number; float: number }>();
  for (const d of distMtd) {
    const e = agentMap.get(d.agentCode) ?? { visits: 0, cash: 0, float: 0 };
    e.visits++;
    if (!e.lastVisit || d.createdAt > e.lastVisit) e.lastVisit = d.createdAt;
    if (d.type === 'CASH') e.cash += Number(d.amount); else e.float += Number(d.amount);
    agentMap.set(d.agentCode, e);
  }

  return res.json(agents.map(a => {
    const stats = agentMap.get(a.agentCode);
    const daysAgo = stats?.lastVisit ? Math.floor((Date.now() - stats.lastVisit.getTime()) / 86400000) : null;
    return { id: a.id, agentCode: a.agentCode, name: a.name, phone: a.phone, town: a.town, market: a.market, province: a.province, isRedFlagged: a.isRedFlagged, redFlagReason: a.redFlagReason, lastVisitedAt: stats?.lastVisit ?? null, daysAgo, visitsMtd: stats?.visits ?? 0, cashMtd: stats?.cash ?? 0, floatMtd: stats?.float ?? 0 };
  }));
});

directorRouter.patch('/agents/:id/flag', guard, async (req: AuthRequest, res: Response) => {
  const flag = req.body.flag as boolean;
  const reason = Array.isArray(req.body.reason) ? req.body.reason[0] : (req.body.reason as string | undefined);
  const agent = await prisma.agentProfile.update({
    where: { id: String(req.params.id) },
    data: { isRedFlagged: flag === true, redFlagReason: flag ? (reason ?? '') : null },
  });
  return res.json(agent);
});

// ── Leaderboard MTD ───────────────────────────────────────────────────────────
directorRouter.get('/leaderboard', requireRoles('DIRECTOR', 'ADMIN', 'SUPERVISOR'), async (_req: AuthRequest, res: Response) => {
  const mtd = mtdStart();
  const target = await prisma.targetVersion.findFirst({ where: { isActive: true } });
  const wde = workingDaysElapsed();
  const cashTarget = Number(target?.cashTarget ?? 30000) * wde;
  const floatTarget = Number(target?.floatTarget ?? 30000) * wde;
  const visitsTarget = (target?.visitsTarget ?? 35) * wde;
  const prospectsTarget = (target?.prospectsTarget ?? 5) * wde;

  const rebalancers = await prisma.rebalancer.findMany({
    where: { isActive: true },
    include: {
      user: { select: { name: true } },
      distributions: { where: { createdAt: { gte: mtd } } },
      prospects: { where: { createdAt: { gte: mtd } } },
    },
  });

  const rows = rebalancers.map(r => {
    const cash = r.distributions.filter(d => d.type === 'CASH').reduce((s, d) => s + Number(d.amount), 0);
    const float = r.distributions.filter(d => d.type === 'FLOAT').reduce((s, d) => s + Number(d.amount), 0);
    const visits = new Set(r.distributions.map(d => d.agentCode)).size;
    const prs = r.prospects.length;
    const cashPct = Math.round((cash / cashTarget) * 100);
    const floatPct = Math.round((float / floatTarget) * 100);
    const visitsPct = Math.round((visits / visitsTarget) * 100);
    const prospectsPct = Math.round((prs / prospectsTarget) * 100);
    const score = calcWeightedScore({ cashPct, floatPct, visitsPct, prospectsPct });
    return { id: r.id, name: r.user.name, region: r.region, cash, float, visits, prospects: prs, cashPct, floatPct, visitsPct, prospectsPct, score };
  }).sort((a, b) => b.score - a.score);

  return res.json({ rows, targets: { cash: cashTarget, float: floatTarget, visits: visitsTarget, prospects: prospectsTarget }, wde });
});

// ── Reports ───────────────────────────────────────────────────────────────────
directorRouter.get('/reports', guard, async (req: AuthRequest, res: Response) => {
  const days = parseInt((req.query.days as string) ?? '30') || 30;
  const from = new Date(Date.now() - days * 86400000);
  const distributions = await prisma.distribution.findMany({ where: { createdAt: { gte: from } }, orderBy: { createdAt: 'asc' } });

  // Daily totals
  const dailyMap = new Map<string, { cash: number; float: number; agents: Set<string> }>();
  for (const d of distributions) {
    const key = d.createdAt.toISOString().slice(0, 10);
    const e = dailyMap.get(key) ?? { cash: 0, float: 0, agents: new Set() };
    if (d.type === 'CASH') e.cash += Number(d.amount); else e.float += Number(d.amount);
    e.agents.add(d.agentCode);
    dailyMap.set(key, e);
  }
  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, cash: v.cash, float: v.float, agents: v.agents.size }));

  return res.json({ daily });
});

// ── Targets ───────────────────────────────────────────────────────────────────
directorRouter.get('/targets', guard, async (_req: AuthRequest, res: Response) => {
  const targets = await prisma.targetVersion.findMany({ orderBy: { version: 'desc' } });
  return res.json(targets);
});

directorRouter.post('/targets', guard, async (req: AuthRequest, res: Response) => {
  const { cashTarget, floatTarget, visitsTarget, prospectsTarget, notes } = req.body;
  const latest = await prisma.targetVersion.findFirst({ orderBy: { version: 'desc' } });
  const version = (latest?.version ?? 0) + 1;
  await prisma.targetVersion.updateMany({ where: { isActive: true }, data: { isActive: false } });
  const tv = await prisma.targetVersion.create({ data: { version, cashTarget, floatTarget, visitsTarget, prospectsTarget, notes, createdById: req.user!.userId } });
  return res.json(tv);
});

// ── Users ─────────────────────────────────────────────────────────────────────
directorRouter.get('/users', guard, async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' }, include: { rebalancer: { select: { id: true, region: true } } } });
  return res.json(users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, isActive: u.isActive, region: u.rebalancer?.region ?? null })));
});

directorRouter.post('/users', guard, async (req: AuthRequest, res: Response) => {
  const { username, name, password, role, region } = req.body;
  if (!username || !name || !password || !role) return res.status(400).json({ error: 'All fields required' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username: username.toLowerCase(), name, passwordHash, role } });
  if (role === 'REBALANCER') {
    await prisma.rebalancer.create({ data: { userId: user.id, region: region ?? null } });
  }
  return res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
});

directorRouter.patch('/users/:id', guard, async (req: AuthRequest, res: Response) => {
  const isActive = req.body.isActive as boolean | undefined;
  const role = Array.isArray(req.body.role) ? req.body.role[0] : (req.body.role as string | undefined);
  const data: Record<string, unknown> = {};
  if (typeof isActive === 'boolean') data.isActive = isActive;
  if (role) data.role = role;
  const user = await prisma.user.update({ where: { id: String(req.params.id) }, data });
  return res.json({ id: user.id, username: user.username, name: user.name, role: user.role, isActive: user.isActive });
});
