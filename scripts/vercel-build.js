const { execSync } = require('child_process');

// Auto-map Vercel Postgres URLs to DATABASE_URL
let dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (dbUrl) {
  // If pooler port 5432 (session mode) is detected, auto-convert to port 6543 (transaction mode)
  if (dbUrl.includes('pooler.supabase.com:5432')) {
    dbUrl = dbUrl.replace(':5432', ':6543');
    if (!dbUrl.includes('pgbouncer=true')) {
      dbUrl += dbUrl.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
    }
  }
  process.env.DATABASE_URL = dbUrl;
  console.log('✅ DATABASE_URL configured successfully (Transaction pooler mode enabled).');
} else {
  console.warn('⚠️ Warning: DATABASE_URL is not set yet in Vercel Environment Variables.');
}

try {
  console.log('🚀 Generating Prisma Client & Building Next.js application...');
  execSync('npx prisma generate && npx next build', { stdio: 'inherit', env: process.env });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
