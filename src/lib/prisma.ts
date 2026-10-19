import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Auto-map Vercel Postgres environment variables if DATABASE_URL is not explicitly set
let resolvedDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

// Auto-convert Supabase pooler port 5432 (session mode limit: 15) to 6543 (transaction mode / pgbouncer)
// This completely eliminates: "FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15"
if (resolvedDbUrl && resolvedDbUrl.includes('pooler.supabase.com:5432')) {
  resolvedDbUrl = resolvedDbUrl.replace(':5432', ':6543');
  if (!resolvedDbUrl.includes('pgbouncer=true')) {
    resolvedDbUrl += resolvedDbUrl.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
  }
  process.env.DATABASE_URL = resolvedDbUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: resolvedDbUrl ? { db: { url: resolvedDbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;

export default prisma;
