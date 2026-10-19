import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const AUTH_SECRET = process.env.AUTH_SECRET || 'cmtc-cert-admin-super-secure-token-2026-secret';
export const ADMIN_COOKIE_NAME = 'admin_session_token';

// Hash password with salt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify password with stored salt:hash
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch (e) {
    return false;
  }
}

export interface SessionPayload {
  adminId: string;
  username: string;
  name?: string;
  role: string;
  exp: number; // timestamp ms
}

// Sign session token
export function createSessionToken(admin: { id: string; username: string; name?: string | null; role?: string }): string {
  const payload: SessionPayload = {
    adminId: admin.id,
    username: admin.username,
    name: admin.name || undefined,
    role: admin.role || 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

// Verify session token
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadStr, signature] = parts;

    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadStr).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload: SessionPayload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch (e) {
    return null;
  }
}

// Ensure default admin account exists in database
export async function ensureDefaultAdmin() {
  try {
    const defaultUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    const defaultPassword = (process.env.ADMIN_PASSWORD || 'admin1234').trim();

    const count = await prisma.adminUser.count();
    if (count === 0) {
      await prisma.adminUser.create({
        data: {
          username: defaultUsername,
          password: hashPassword(defaultPassword),
          name: 'ผู้ดูแลระบบ CMTC',
          role: 'admin',
        },
      });
      console.log(`[AUTH] Initial admin created: ${defaultUsername}`);
    }
  } catch (error) {
    console.warn('[AUTH] Could not ensure default admin:', error);
  }
}

// Helper to check session in server components
export async function getAdminSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
