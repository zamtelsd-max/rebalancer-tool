import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Rebalancer Tool...');

  // Create rb schema if not exists
  await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS rb`;

  const users: { username: string; name: string; password: string; role: Role; region?: string }[] = [
    { username: 'samuel.mwape',       name: 'Samuel Mwape',             password: 'Elthera@2026', role: 'DIRECTOR' },
    { username: 'chewe.yambayamba',   name: 'Chewe Mwape Yambayamba',   password: 'Elthera@2026', role: 'DIRECTOR' },
    { username: 'admin',              name: 'System Admin',             password: 'Elthera@2026', role: 'ADMIN' },
    { username: 'reb001',             name: 'Rebalancer 1',             password: 'Reb@1234',     role: 'REBALANCER', region: 'Lusaka' },
    { username: 'reb002',             name: 'Rebalancer 2',             password: 'Reb@1234',     role: 'REBALANCER', region: 'Copperbelt' },
    { username: 'supervisor',         name: 'Field Supervisor',         password: 'Super@1234',   role: 'SUPERVISOR' },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { username: u.username, name: u.name, passwordHash, role: u.role },
    });
    if (u.role === 'REBALANCER') {
      await prisma.rebalancer.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, region: u.region ?? null, cashBalance: 0, floatBalance: 0 },
      });
    }
    console.log(`  ✓ ${u.username} (${u.role})`);
  }

  // Master account
  const existing = await prisma.masterAccount.findFirst();
  if (!existing) {
    await prisma.masterAccount.create({ data: { cashBalance: 500000, floatBalance: 500000 } });
    console.log('  ✓ Master account seeded (K500,000 cash + K500,000 float)');
  }

  // Agent profiles
  const agents = [
    { agentCode: 'ZM-AG-0001', name: 'Moses Phiri',    phone: '260977000001', town: 'Lusaka',     market: 'Kalingalinga', province: 'Lusaka' },
    { agentCode: 'ZM-AG-0002', name: 'Grace Banda',    phone: '260977000002', town: 'Ndola',      market: 'Masala',       province: 'Copperbelt' },
    { agentCode: 'ZM-AG-0003', name: 'John Mwale',     phone: '260977000003', town: 'Kitwe',      market: 'Wusakile',     province: 'Copperbelt' },
    { agentCode: 'ZM-AG-0004', name: 'Charity Zulu',   phone: '260977000004', town: 'Livingstone', market: 'Maramba',     province: 'Southern' },
    { agentCode: 'ZM-AG-0005', name: 'Peter Tembo',    phone: '260977000005', town: 'Kabwe',      market: 'Central Market', province: 'Central' },
  ];
  for (const a of agents) {
    await prisma.agentProfile.upsert({ where: { agentCode: a.agentCode }, update: {}, create: a });
  }
  console.log(`  ✓ ${agents.length} agent profiles seeded`);

  // Target version
  const tv = await prisma.targetVersion.findFirst({ where: { isActive: true } });
  if (!tv) {
    await prisma.targetVersion.create({
      data: { version: 1, cashTarget: 30000, floatTarget: 30000, visitsTarget: 35, prospectsTarget: 5, notes: 'Initial targets v1' },
    });
    console.log('  ✓ Target version 1 seeded');
  }

  console.log('\nSeed complete.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
