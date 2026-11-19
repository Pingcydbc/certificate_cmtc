export interface ClientAuthUser {
  id: string;
  adminId?: string;
  username: string;
  name?: string;
  role: string;
}

interface AuthMeResponse {
  authenticated: boolean;
  user?: ClientAuthUser;
}

let cachedPromise: Promise<AuthMeResponse> | null = null;
let cachedAt = 0;
const AUTH_CACHE_TTL_MS = 10_000;

/**
 * Deduplicate concurrent /api/auth/me calls across Navbar and admin pages.
 */
export function fetchAuthMe(force = false): Promise<AuthMeResponse> {
  const now = Date.now();
  if (!force && cachedPromise && now - cachedAt < AUTH_CACHE_TTL_MS) {
    return cachedPromise;
  }

  cachedAt = now;
  cachedPromise = fetch('/api/auth/me')
    .then((res) => res.json())
    .catch(() => {
      cachedPromise = null;
      return { authenticated: false };
    });

  return cachedPromise;
}

export function clearAuthMeCache() {
  cachedPromise = null;
  cachedAt = 0;
}
