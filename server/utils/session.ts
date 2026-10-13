import type { H3Event } from 'h3';

export const SESSION_COOKIE_NAME = 'admin_session';
export const CLIENT_SESSION_STATUS = 'is_logged_in';
export const CLIENT_USER_ROLES = 'user_roles';

export interface SessionData {
  user: string;
  roles: string[];
  expiry: number;
}

export const getSessionUser = (event: H3Event) => {
  const cookie = getCookie(event, SESSION_COOKIE_NAME);
  if (!cookie) return null;
  
  try {
    // In a real app, you should decrypt/verify here
    const data: SessionData = JSON.parse(Buffer.from(cookie, 'base64').toString());
    
    // Check if session has expired (e.g., 24h)
    const now = Date.now();
    if (data.expiry && now > data.expiry) {
        deleteCookie(event, SESSION_COOKIE_NAME);
        deleteCookie(event, CLIENT_USER_ROLES);
        return null;
    }
    
    return data.user;
  } catch (e) {
    return null;
  }
};

export const getSessionRoles = (event: H3Event): string[] => {
  const cookie = getCookie(event, SESSION_COOKIE_NAME);
  if (!cookie) return [];
  
  try {
    const data: SessionData = JSON.parse(Buffer.from(cookie, 'base64').toString());
    return data.roles || [];
  } catch (e) {
    return [];
  }
};

export const setSessionUser = (event: H3Event, user: string, roles: string[] = ['admin', 'scm']) => {
  const config = useRuntimeConfig(event);
  const expiry = Date.now() + (24 * 60 * 60 * 1000); // 1 day

  // Hardcode roles ตามที่ต้องการ (เช่น admin มี role ['admin', 'scm'])
  const userRoles = roles.length ? roles : ['admin', 'scm'];
  
  const data: SessionData = { user, roles: userRoles, expiry };
  const base64Data = Buffer.from(JSON.stringify(data)).toString('base64');
  
  // 1. Session Cookie สำหรับ Server (HTTP Only)
  setCookie(event, SESSION_COOKIE_NAME, base64Data, {
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