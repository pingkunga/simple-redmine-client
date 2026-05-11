import { getSessionUser } from '../utils/session';

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const config = useRuntimeConfig(event);
  
  // 1. Skip auth for login page and its API
  if (url.pathname === '/login' || url.pathname === '/api/auth/login' || url.pathname.startsWith('/_nuxt/')) {
    return;
  }

  const user = getSessionUser(event);

  // 2. Protect Admin UI Routes
  if (url.pathname.startsWith('/admin')) {
    if (!user) {
      return sendRedirect(event, '/login');
    }
  }

  // 3. For API calls, we allow session or fallback to API Key + IP Whitelist
  // Note: We check specifically for /api/release/*
  if (url.pathname.startsWith('/api/release/')) {
    const clientIp = getRequestIP(event, { xForwardedFor: true });
    
    // Stage 1: Trusted Internal/Dashboard Traffic
    // - User is logged in via UI
    // - SSR / Internal Fetch (!clientIp)
    // - Localhost access
    // - Requested from our own UI (Referer check to handle dynamic home IP)
    const isInternal = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';
    const isFromOurUI = getHeader(event, 'referer')?.includes(url.host);
    console.log(`[Auth Middleware] Client IP: ${clientIp}, User: ${user ? user.username : 'None'}, IsInternal: ${isInternal}, IsFromOurUI: ${isFromOurUI}`);

    if (user || isInternal || isFromOurUI) {
        return;
    }

    // Stage 2: External Automation (Jenkins / External Scripts)
    // Must have BOTH: IP in Whitelist AND Valid API Key
    const allowedIps = (config.notifyReleaseMailAllowedIps || '').split(',').map(ip => ip.trim()).filter(ip => ip);
    const isWhitelisted = clientIp && allowedIps.includes(clientIp);
    const requestApiKey = getHeader(event, 'x-api-key');
    const isValidKey = config.notifyReleaseMailApiKey && requestApiKey === config.notifyReleaseMailApiKey;

    if (isWhitelisted && isValidKey) {
        return;
    }

    // Comprehensive Error Logging & Handling
    if (!isWhitelisted && allowedIps.length > 0) {
        throw createError({ statusCode: 403, statusMessage: `Forbidden: IP ${clientIp} not in whitelist` });
    }
    
    if (!isValidKey) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Missing or Invalid API Key' });
    }
  }

  // Store user in context for downstream handlers if needed
  event.context.user = user;
});