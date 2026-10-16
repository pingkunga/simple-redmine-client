import { createError } from 'h3';
import { timingSafeEqual } from 'node:crypto';

/** Timing-safe string compare; different lengths are simply "not equal" (never throws). */
export const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface ChatAccessInput {
  method: string;
  origin?: string;
  secFetchSite?: string;
  /** Host the request was addressed to (including port). */
  host?: string;
}

/**
 * /api/chat is open to anonymous visitors (like the rest of the app's APIs); it does not
 * require a session. For state-changing methods it requires a same-origin request so other
 * websites cannot drive a visitor's browser to it.
 *
 * This is NOT an anti-abuse control: a script can forge `Origin`. Abuse (LLM cost, flooding)
 * is handled by the rate/size limits in the chat route itself.
 * Deliberately ignores x-internal-key (public config) and client IP.
 */
export const assertChatAccess = (input: ChatAccessInput): void => {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return;

  if (input.secFetchSite === 'same-origin') return;

  if (input.origin && input.host) {
    try {
      if (new URL(input.origin).host === input.host) return;
    } catch {
      // unparsable Origin (e.g. "null") falls through to rejection
    }
  }

  // Fail-closed: neither header proves same-origin.
  throw createError({ statusCode: 403, statusMessage: 'Forbidden: cross-origin request' });
};

export interface McpAccessInput {
  authorization?: string;
  xApiKey?: string;
  /** runtimeConfig.mcpApiKey */
  expectedKey?: string;
}

/**
 * /api/mcp: key-only (external MCP clients cannot hold a session cookie). No IP rules,
 * since X-Forwarded-For is client-spoofable. An unset key closes the endpoint.
 */
export const assertMcpAccess = (input: McpAccessInput): void => {
  const expected = input.expectedKey;
  if (!expected) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: MCP access is not configured' });
  }

  const bearer = input.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const provided = bearer || input.xApiKey;

  if (!provided || !safeEqual(provided, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Missing or Invalid API Key' });
  }
};

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const isChatPath = (pathname: string) => matchesPrefix(pathname, '/api/chat');
export const isMcpPath = (pathname: string) => matchesPrefix(pathname, '/api/mcp');
