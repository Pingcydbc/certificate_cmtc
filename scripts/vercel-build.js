const { execSync } = require('child_process');

// Auto-map Vercel Postgres URLs to DATABASE_URL
const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (dbUrl) {
  process.env.DATABASE_URL = dbUrl;
  console.log('✅ DATABASE_URL configured successfully.');
} else {
  console.warn('⚠️ Warning: DATABASE_URL is not set yet in Vercel Environment Variables.');
}

try {
  if (process.env.DATABASE_URL) {
    console.log('🚀 Syncing Prisma Schema to database (prisma db push)...');
    execSync('npx prisma db push', { stdio: 'inherit', env: process.env });
  }

  console.log('🚀 Building Next.js application...');
  execSync('npx prisma generate && npx next build', { stdio: 'inherit', env: process.env });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
