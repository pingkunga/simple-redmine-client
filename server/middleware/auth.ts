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
    console.log(`Auth Middleware: Client IP - ${clientIp}, User - ${user ? user.username : 'None'}`);
    // Internal Check: If SSR/Internal Fetch (!clientIp) or Localhost
    const isInternal = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';
    
    // Whitelist Check: IP matches explicitly allowed list
    const allowedIps = (config.notifyReleaseMailAllowedIps || '').split(',').map(ip => ip.trim()).filter(ip => ip);
    const isWhitelisted = clientIp && allowedIps.includes(clientIp);

    if (user || isInternal || isWhitelisted) {
        return;
    }

    // No session/whitelist, check API Key and IP requirement
    const requestApiKey = getHeader(event, 'x-api-key');

    // Check IP separately for more specific error message if whitelist is configured
    if (allowedIps.length > 0 && !isWhitelisted) {
        throw createError({ statusCode: 403, statusMessage: `Forbidden: IP ${clientIp} not allowed` });
    }

    // Check API Key
    if (config.notifyReleaseMailApiKey && requestApiKey !== config.notifyReleaseMailApiKey) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Invalid API Key' });
    }
  }

  // Store user in context for downstream handlers if needed
  event.context.user = user;
});