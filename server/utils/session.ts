import type { H3Event } from 'h3';
import { getCookie, setCookie, deleteCookie } from 'h3';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'admin_session';
export const CLIENT_SESSION_STATUS = 'is_logged_in';
export const CLIENT_USER_ROLES = 'user_roles';

// Placeholder shipped in nuxt.config.ts; must be overridden via NUXT_ADMIN_SESSION_SECRET in production.
export const PLACEHOLDER_SESSION_SECRET = 'a-very-secret-key-12345';

export interface SessionData {
  user: string;
  roles: string[];
  expiry: number;
}

/**
 * Fail-closed: an empty secret, or the repo-public placeholder outside development/test, must
 * never sign or verify anything. (The runtime Docker image does not set NODE_ENV, so "unset"
 * must count as deployed, not as dev.)
 */
export const assertSessionSecret = (secret: unknown): string => {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new Error('adminSessionSecret is not configured; set NUXT_ADMIN_SESSION_SECRET');
  }
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  if (secret === PLACEHOLDER_SESSION_SECRET && !isDevOrTest) {
    throw new Error('adminSessionSecret is still the placeholder value; set NUXT_ADMIN_SESSION_SECRET');
  }
  return secret;
};

const hmac = (payload: string, secret: string): Buffer =>
  createHmac('sha256', secret).update(payload).digest();

/** Cookie value format: `<base64url(JSON)>.<base64url(HMAC-SHA256(payload))>` */
export const signSession = (data: SessionData, secret: string): string => {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${hmac(payload, secret).toString('base64url')}`;
};

/** Returns the session data only when the signature is valid; otherwise null (never throws). */
export const verifySession = (cookie: string, secret: string): SessionData | null => {
  const dot = cookie.lastIndexOf('.');
  if (dot <= 0) return null;

  const payload = cookie.slice(0, dot);
  const given = Buffer.from(cookie.slice(dot + 1), 'base64url');
  const expected = hmac(payload, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionData;
  } catch {
    return null;
  }
};

const readSession = (event: H3Event): SessionData | null => {
  const cookie = getCookie(event, SESSION_COOKIE_NAME);
  if (!cookie) return null;

  let secret: string;
  try {
    secret = assertSessionSecret(useRuntimeConfig(event).adminSessionSecret);
  } catch (e) {
    // Misconfiguration must not accept sessions, but also must not take the whole app down.
    console.error('[session]', (e as Error).message);
    return null;
  }

  const data = verifySession(cookie, secret);
  if (!data) return null;

  // Check if session has expired (e.g., 24h)
  if (data.expiry && Date.now() > data.expiry) {
    deleteCookie(event, SESSION_COOKIE_NAME);
    deleteCookie(event, CLIENT_USER_ROLES);
    return null;
  }

  return data;
};

export const getSessionUser = (event: H3Event) => readSession(event)?.user ?? null;

export const getSessionRoles = (event: H3Event): string[] => readSession(event)?.roles || [];

export const setSessionUser = (event: H3Event, user: string, roles: string[] = ['admin', 'scm']) => {
  const config = useRuntimeConfig(event);
  const secret = assertSessionSecret(config.adminSessionSecret);
  const expiry = Date.now() + (24 * 60 * 60 * 1000); // 1 day

  // Hardcode roles ตามที่ต้องการ (เช่น admin มี role ['admin', 'scm'])
  const userRoles = roles.length ? roles : ['admin', 'scm'];

  const data: SessionData = { user, roles: userRoles, expiry };
  const signedValue = signSession(data, secret);

  // 1. Session Cookie สำหรับ Server (HTTP Only, signed)
  setCookie(event, SESSION_COOKIE_NAME, signedValue, {
    httpOnly: true,
    secure: config.adminSessionSecure as boolean,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60
  });

  // 2. Status Cookie สำหรับเช็คว่า Login หรือยัง
  setCookie(event, CLIENT_SESSION_STATUS, 'true', {
    httpOnly: false,
    secure: config.adminSessionSecure as boolean,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60
  });

  // 3. Roles Cookie สำหรับ Client-side Filter
  setCookie(event, CLIENT_USER_ROLES, JSON.stringify(userRoles), {
    httpOnly: false, // เพื่อให้ Nuxt useCookie ฝั่ง Client อ่านได้
    secure: config.adminSessionSecure as boolean,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60
  });
};

export const clearSessionUser = (event: H3Event) => {
  deleteCookie(event, SESSION_COOKIE_NAME);
  deleteCookie(event, CLIENT_SESSION_STATUS);
  deleteCookie(event, CLIENT_USER_ROLES);
};
