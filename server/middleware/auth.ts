import { getSessionUser } from '../utils/session';
import { assertChatAccess, assertMcpAccess, isChatPath, isMcpPath } from '../utils/authGate';

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
  if (url.pathname.startsWith('/api/release/')) {
    const clientIp = getRequestIP(event, { xForwardedFor: true });
    
    // Stage 1: Secure Internal Traffic
    // - SSR / Server-to-Server (!clientIp)
    const isSSR = !clientIp;
    
    // - UI request (x-internal-key)
    const requestInternalKey = getHeader(event, 'x-internal-key');
    const isValidInternalKey = config.public.internalApiKey && requestInternalKey === config.public.internalApiKey;

    console.log(`[Auth Auth] Path: ${url.pathname}, IP: ${clientIp}, SSR: ${isSSR}, Key: ${!!isValidInternalKey}`);

    if (user || isSSR || isValidInternalKey) {
        return;
    }

    // Stage 2: External Automation (Jenkins)
    const allowedIps = (config.automationAllowedIps || '').split(',').map((ip: string) => ip.trim()).filter((ip: string) => ip);
    const isWhitelisted = clientIp && allowedIps.includes(clientIp);
    const requestApiKey = getHeader(event, 'x-api-key');
    const isValidKey = config.automationApiKey && requestApiKey === config.automationApiKey;

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

  // 4. AI routes: /api/chat is open to anonymous users but must be same-origin for writes
  //    (abuse limits live in the route); /api/mcp is key-only for external MCP clients.
  //    Neither uses internalApiKey or client IP.
  if (isChatPath(url.pathname)) {
    assertChatAccess({
      method: getMethod(event),
      origin: getHeader(event, 'origin'),
      secFetchSite: getHeader(event, 'sec-fetch-site'),
      host: getRequestHost(event, { xForwardedHost: true }),
    });
  }

  if (isMcpPath(url.pathname)) {
    assertMcpAccess({
      authorization: getHeader(event, 'authorization'),
      xApiKey: getHeader(event, 'x-api-key'),
      expectedKey: config.mcpApiKey as string,
    });
  }

  // Store user in context for downstream handlers if needed
  event.context.user = user;
});