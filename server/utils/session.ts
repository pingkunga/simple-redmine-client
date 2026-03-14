import type { H3Event } from 'h3';

export const SESSION_COOKIE_NAME = 'admin_session';
export const CLIENT_SESSION_STATUS = 'is_logged_in';

export const getSessionUser = (event: H3Event) => {
  const cookie = getCookie(event, SESSION_COOKIE_NAME);
  if (!cookie) return null;
  
  try {
    // In a real app, you should decrypt/verify here
    const data = JSON.parse(Buffer.from(cookie, 'base64').toString());
    
    // Check if session has expired (e.g., 24h)
    const now = Date.now();
    if (data.expiry && now > data.expiry) {
        deleteCookie(event, SESSION_COOKIE_NAME);
        return null;
    }
    
    return data.user;
  } catch (e) {
    return null;
  }
};

export const setSessionUser = (event: H3Event, user: string) => {
  const config = useRuntimeConfig(event);
  const expiry = Date.now() + (24 * 60 * 60 * 1000); // 1 day
  const data = JSON.stringify({ user, expiry });
  const base64Data = Buffer.from(data).toString('base64');
  
  setCookie(event, SESSION_COOKIE_NAME, base64Data, {
    httpOnly: true,
    secure: config.adminSessionSecure as boolean,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 // 1 day in seconds
  });

  setCookie(event, CLIENT_SESSION_STATUS, 'true', {
    httpOnly: false, // Accessible by client side
    secure: config.adminSessionSecure as boolean,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 // 1 day in seconds
  });
};

export const clearSessionUser = (event: H3Event) => {
  deleteCookie(event, SESSION_COOKIE_NAME);
  deleteCookie(event, CLIENT_SESSION_STATUS);
};
