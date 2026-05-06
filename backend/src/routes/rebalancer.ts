import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest, requireRoles } from '../middleware/auth';
import { calcWeightedScore, getBand, mtdStart, todayStart, workingDaysElapsed, workingDaysInMonth } from '../utils/kpi';

export const rebalancerRouter = Router();
const guard = requireRoles('REBALANCER', 'DIRECTOR', 'ADMIN', 'SUPERVISOR');

// ── Dashboard ─────────────────────────────────────────────────────────────────
rebalancerRouter.get('/dashboard', requireRoles('REBALANCER'), async (req: AuthRequest, res: Response) => {
  const rebId = req.user!.rebalancerId;
  if (!rebId) return res.status(400).json({ error: 'Not a rebalancer account' });

  const today = todayStart();
  const mtd = mtdStart();
  const target = await prisma.targetVersion.findFirst({ where: { isActive: true } });
  const wde = workingDaysElapsed();
  const wdm = workingDaysInMonth();
  const cashTarget = Number(target?.cashTarget ?? 30000);
  const floatTarget = Number(target?.floatTarget ?? 30000);
  const visitsTarget = target?.visitsTarget ?? 35;
  const prospectsTarget = target?.prospectsTarget ?? 5;

  const [rebalancer, todayDists, mtdDists, mtdProspects, recentDists] = await Promise.all([
    prisma.rebalancer.findUnique({ where: { id: rebId } }),
    prisma.distribution.findMany({ where: { rebalancerId: rebId, createdAt: { gte: today } } }),
    prisma.distribution.findMany({ where: { rebalancerId: rebId, createdAt: { gte: mtd } } }),
    prisma.prospect.count({ where: { rebalancerId: rebId, createdAt: { gte: mtd } } }),
    prisma.distribution.findMany({ where: { rebalancerId: rebId }, orderBy: { createdAt: 'desc' }, take: 10, include: { agentProfile: { select: { name: true } } } }),
  ]);

  const todayCash = todayDists.filter(d => d.type === 'CASH').reduce((s, d) => s + Number(d.amount), 0);
  const todayFloat = todayDists.filter(d => d.type === 'FLOAT').reduce((s, d) => s + Number(d.amount), 0);
  const todayVisits = new Set(todayDists.map(d => d.agentCode)).size;
  const todayProspects = await prisma.prospect.count({ where: { rebalancerId: rebId, createdAt: { gte: today } } });

  const mtdCash = mtdDists.filter(d => d.type === 'CASH').reduce((s, d) => s + Number(d.amount), 0);
  const mtdFloat = mtdDists.filter(d => d.type === 'FLOAT').reduce((s, d) => s + Number(d.amount), 0);
  const mtdVisits = new Set(mtdDists.map(d => d.agentCode)).size;

  const mtdCashTarget = cashTarget * wde;
  const mtdFloatTarget = floatTarget * wde;
  const mtdVisitsTarget = visitsTarget * wde;
  const mtdProspectsTarget = prospectsTarget * wde;

  const cashPct = Math.round((mtdCash / mtdCashTarget) * 100);
  const floatPct = Math.round((mtdFloat / mtdFloatTarget) * 100);
  const visitsPct = Math.round((mtdVisits / mtdVisitsTarget) * 100);
  const prospectsPct = Math.round((mtdProspects / mtdProspectsTarget) * 100);
  const score = calcWeightedScore({ cashPct, floatPct, visitsPct, prospectsPct });
  const band = getBand(score);

  return res.json({
    balances: { cash: Number(rebalancer?.cashBalance ?? 0), float: Number(rebalancer?.floatBalance ?? 0) },
    today: {
      cash: todayCash, float: todayFloat, visits: todayVisits, prospects: todayProspects,
      cashPct: Math.round((todayCash / cashTarget) * 100),
      floatPct: Math.round((todayFloat / floatTarget) * 100),
      visitsPct: Math.round((todayVisits / visitsTarget) * 100),
      prospectsPct: Math.round((todayProspects / prospectsTarget) * 100),
    },
    mtd: { cash: mtdCash, float: mtdFloat, visits: mtdVisits, prospects: mtdProspects, cashPct, floatPct, visitsPct, prospectsPct, score, band, wde, wdm },
    dailyTargets: { cash: cashTarget, float: floatTarget, visits: visitsTarget, prospects: prospectsTarget },
    recentDistributions: recentDists.map(d => ({ id: d.id, type: d.type, amount: Number(d.amount), agentCode: d.agentCode, agentName: d.agentName, transactionRef: d.transactionRef, createdAt: d.createdAt })),
  });
});

// ── Distribute ────────────────────────────────────────────────────────────────
rebalancerRouter.post('/distribute', requireRoles('REBALANCER'), async (req: AuthRequest, res: Response) => {
  const rebId = req.user!.rebalancerId;
  if (!rebId) return res.status(400).json({ error: 'Not a rebalancer account' });

  const { type, agentCode, agentName, agentPhone, agentTown, agentMarket, agentProvince, amount, transactionRef, latitude, longitude, notes } = req.body;
  if (!type || !agentCode || !agentName || !amount || !latitude || !longitude) {
    return res.status(400).json({ error: 'type, agentCode, agentName, amount, latitude, longitude are required' });
  }
  if (!transactionRef) return res.status(400).json({ error: 'Transaction reference is required' });

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Amount must be positive' });

  const rebalancer = await prisma.rebalancer.findUnique({ where: { id: rebId } });
  if (!rebalancer) return res.status(404).json({ error: 'Rebalancer not found' });

  const bal = type === 'CASH' ? Number(rebalancer.cashBalance) : Number(rebalancer.floatBalance);
  if (bal < amt) return res.status(400).json({ error: `Insufficient ${type.toLowerCase()} balance (K${bal.toFixed(2)} available)` });

  // Upsert agent — create on first distribution, update details if provided
  const agent = await prisma.agentProfile.upsert({
    where: { agentCode: agentCode.trim().toUpperCase() },
    create: {
      agentCode: agentCode.trim().toUpperCase(),
      name: agentName.trim(),
      phone: (agentPhone ?? '').trim(),
      town: agentTown?.trim() || null,
      market: agentMarket?.trim() || null,
      province: agentProvince?.trim() || null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    },
    update: {
      // Only update fields that were explicitly provided
      ...(agentName && { name: agentName.trim() }),
      ...(agentPhone && { phone: agentPhone.trim() }),
      ...(agentTown && { town: agentTown.trim() }),
      ...(agentMarket && { market: agentMarket.trim() }),
      ...(agentProvince && { province: agentProvince.trim() }),
    },
  });

  const isRedFlagged = agent.isRedFlagged ?? false;
  if (isRedFlagged && !notes) return res.status(400).json({ error: 'Notes are required for red-flagged agents' });

  const [dist] = await prisma.$transaction([
    prisma.distribution.create({
      data: {
        rebalancerId: rebId,
        agentProfileId: agent.id,
        agentCode: agent.agentCode,
        agentName: agent.name,
        agentPhone: agent.phone,
        type,
        amount: amt,
        transactionRef,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        notes,
        isRedFlagged,
        redFlagReason: agent.redFlagReason,
      },
    }),
    type === 'CASH'
      ? prisma.rebalancer.update({ where: { id: rebId }, data: { cashBalance: { decrement: amt } } })
      : prisma.rebalancer.update({ where: { id: rebId }, data: { floatBalance: { decrement: amt } } }),
  ]);
  return res.json({ success: true, distribution: dist, agent: { id: agent.id, agentCode: agent.agentCode, name: agent.name, isNew: !agent.updatedAt || agent.createdAt.getTime() === agent.updatedAt.getTime() } });
});

// ── Distribution history ──────────────────────────────────────────────────────
rebalancerRouter.get('/distributions', requireRoles('REBALANCER'), async (req: AuthRequest, res: Response) => {
  const rebId = req.user!.rebalancerId;
  if (!rebId) return res.status(400).json({ error: 'Not a rebalancer account' });
  const dists = await prisma.distribution.findMany({ where: { rebalancerId: rebId }, orderBy: { createdAt: 'desc' }, take: 100 });
  return res.json(dists.map(d => ({ ...d, amount: Number(d.amount) })));
});

// ── Prospects ─────────────────────────────────────────────────────────────────
rebalancerRouter.post('/prospects', requireRoles('REBALANCER'), async (req: AuthRequest, res: Response) => {
  const rebId = req.user!.rebalancerId;
  if (!rebId) return res.status(400).json({ error: 'Not a rebalancer account' });
  const { name, phone, town, market, province, stage, notes, latitude, longitude } = req.body;
  if (!name || !phone || !latitude || !longitude) return res.status(400).json({ error: 'name, phone, latitude, longitude required' });
  const p = await prisma.prospect.create({ data: { rebalancerId: rebId, name, phone, town, market, province, stage: stage ?? 'CONTACTED', notes, latitude: parseFloat(latitude), longitude: parseFloat(longitude) } });
  return res.json(p);
});

rebalancerRouter.get('/prospects', requireRoles('REBALANCER'), async (req: AuthRequest, res: Response) => {
  const rebId = req.user!.rebalancerId;
  if (!rebId) return res.status(400).json({ error: 'Not a rebalancer account' });
  const prospects = await prisma.prospect.findMany({ where: { rebalancerId: rebId }, orderBy: { createdAt: 'desc' } });
  return res.json(prospects);
});

// ── Today's distribution map points ──────────────────────────────────────────
rebalancerRouter.get('/distributions/map', requireRoles('REBALANCER', 'DIRECTOR', 'ADMIN', 'SUPERVISOR'), async (req: AuthRequest, res: Response) => {
  const rebId = req.user!.rebalancerId;
  const today = todayStart();
  const where = rebId ? { rebalancerId: rebId, createdAt: { gte: today } } : { createdAt: { gte: today } };
  const dists = await prisma.distribution.findMany({
    where,
    select: { id: true, agentCode: true, agentName: true, type: true, amount: true, latitude: true, longitude: true, createdAt: true, rebalancer: { select: { user: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  const points = dists
    .filter(d => d.latitude && d.longitude)
    .map(d => ({ id: d.id, lat: Number(d.latitude), lng: Number(d.longitude), agentCode: d.agentCode, agentName: d.agentName, type: d.type, amount: Number(d.amount), rebalancer: d.rebalancer?.user?.name ?? '—', createdAt: d.createdAt }));
  return res.json(points);
});

// ── Agent lookup ──────────────────────────────────────────────────────────────
rebalancerRouter.get('/agents/lookup', guard, async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string)?.trim() ?? '';
  if (!q || q.length < 2) return res.json([]);
  const agents = await prisma.agentProfile.findMany({
    where: { isActive: true, OR: [{ agentCode: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }, { name: { contains: q, mode: 'insensitive' } }] },
    take: 10,
  });
  return res.json(agents);
});
