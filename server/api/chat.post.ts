import { assertChatAccess } from '../utils/authGate';
import { createChatLimiter, type ChatLimiter } from '../utils/chatLimits';
import { MAX_BODY_BYTES } from '../utils/chatRequest';
import { defaultChatDeps, handleChat } from '../utils/chatService';

// One limiter per process, built lazily so config is read at request time.
let limiter: ChatLimiter | undefined;

export default defineEventHandler(async (event) => {
  // The middleware already checked this; repeated so the route stays same-origin-only on its own.
  assertChatAccess({
    method: getMethod(event),
    origin: getHeader(event, 'origin'),
    secFetchSite: getHeader(event, 'sec-fetch-site'),
    host: getRequestHost(event, { xForwardedHost: true }),
  });

  const config = useRuntimeConfig(event);

  // Require a declared length so the size cap cannot be dodged with chunked uploads.
  const declared = Number(getHeader(event, 'content-length'));
  if (!Number.isFinite(declared)) throw createError({ statusCode: 411, statusMessage: 'Content-Length required' });
  if (declared > MAX_BODY_BYTES) throw createError({ statusCode: 413, statusMessage: 'Request body too large' });

  limiter ??= createChatLimiter({
    perMinute: Number(config.chatRatePerMinute) || 10,
    perIpPerDay: Number(config.chatDailyLimitPerIp) || 20,
    perDay: Number(config.chatDailyLimit) || 100,
  });

  // Socket address only: no reverse proxy sits in front, and X-Forwarded-For is client-controlled.
  const ip = event.node.req.socket.remoteAddress ?? 'unknown';

  const abort = new AbortController();
  event.node.res.on('close', () => {
    if (!event.node.res.writableFinished) abort.abort();
  });

  return handleChat(
    {
      providerConfigured: Boolean((config.llmProvider as string)?.trim()),
      rawBody: (await readRawBody(event, 'utf8')) ?? '',
      ip,
      signal: abort.signal,
    },
    defaultChatDeps(limiter),
  );
});
