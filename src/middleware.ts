import { NextRequest, NextResponse } from 'next/server';

const AUTH_SECRET = process.env.AUTH_SECRET || 'cmtc-cert-admin-super-secure-token-2026-secret';
const ADMIN_COOKIE_NAME = 'admin_session_token';

// Edge-compatible HMAC-SHA256 signature verification
async function verifyEdgeToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payloadStr, signature] = parts;

    // Check payload expiration
    const jsonStr = atob(payloadStr.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(jsonStr);
    if (!payload.exp || Date.now() > payload.exp) {
      return false;
    }

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(AUTH_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadStr));
    const expectedSig = Buffer.from(sigBuf).toString('base64url');

    return signature === expectedSig;
  } catch (e) {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isValid = token ? await verifyEdgeToken(token) : false;

  // If already at login page
  if (pathname === '/admin/login') {
    if (isValid) {
      // Already logged in, redirect to admin dashboard
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // If accessing any admin route
  if (pathname.startsWith('/admin')) {
    if (!isValid) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
