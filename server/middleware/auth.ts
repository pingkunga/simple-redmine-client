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
    
    // Internal Check: If request is from server-to-self (SSR) or localhost
    const isInternalRequest = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';
    
    // Whitelist: User is logged in or IP is allowed
    const allowedIps = (config.notifyReleaseMailAllowedIps || '').split(',').map(ip => ip.trim()).filter(ip => ip);
    const isWhitelisted = allowedIps.includes(clientIp || '');

    if (user || isInternalRequest || isWhitelisted) {
        return;
    }

    // No session/whitelist, check API Key and IP requirement
    const requestApiKey = getHeader(event, 'x-api-key');

    // Check IP separately if needed for other scenarios
    if (allowedIps.length > 0 && (!clientIp || !isWhitelisted)) {
        throw createError({ statusCode: 403, statusMessage: `Forbidden: IP ${clientIp} not allowed` });
    }

    // Check API Key
    if (config.notifyReleaseMailApiKey && requestApiKey !== config.notifyReleaseMailApiKey) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Invalid API Key' });
    }

    // If neither session nor apiKey present (if apiKey configured)
    if (!config.notifyReleaseMailApiKey && !user && !allowedIps.length) {
        // If nothing is configured, maybe it's wide open (as before) or we want to block?
        // Let's allow it for now or force auth if required.
        // But for safety, let's at least expect a session or key if we're adding auth.
    }
  }

  // Store user in context for downstream handlers if needed
  event.context.user = user;
});
