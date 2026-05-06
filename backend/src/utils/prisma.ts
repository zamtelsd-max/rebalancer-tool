import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const dbUrl = process.env.DATABASE_URL || '';
const pooledUrl = dbUrl.includes('connection_limit') ? dbUrl
  : dbUrl.includes('?') ? dbUrl + '&connection_limit=5&pool_timeout=30'
  : dbUrl + '?connection_limit=5&pool_timeout=30';

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
    datasources: { db: { url: pooledUrl } },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

process.on('beforeExit', async () => { await prisma.$disconnect(); });
