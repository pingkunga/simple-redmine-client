import path from 'node:path';
import useClientUtil from '~/composables/useClientUtil';
import useRedmineAPI from '~/composables/useRedmineAPI';
import { assertChatAccess } from '../utils/authGate';
import { createChatLimiter, type ChatLimiter } from '../utils/chatLimits';
import { MAX_BODY_BYTES } from '../utils/chatRequest';
import { defaultChatDeps, handleChat, resolveChatLimits } from '../utils/chatService';
import { createTranscriptWriter, type TranscriptWriter } from '../utils/chatTranscript';

// One limiter per process, built lazily so config is read at request time.
let limiter: ChatLimiter | undefined;
// Same for the transcript writer; stays undefined when chatLogEnabled is "false".
let transcripts: TranscriptWriter | undefined;

export default defineEventHandler(async (event) => {
  // The middleware already checked this; repeated so the route stays same-origin-only on its own.
  assertChatAccess({
    method: getMethod(event),
    origin: getHeader(event, 'origin'),
    secFetchSite: getHeader(event, 'sec-fetch-site'),
    host: getRequestHost(event, { xForwardedHost: true }),
  });

  const config = useRuntimeConfig(event);

  // Optional personal Redmine key (same header the DevTracker page sends). Reject junk up front:
  // it is decoded with atob(), which would otherwise throw a 500 for an anonymous caller.
  const { YourOwnRedmineAPI } = useRedmineAPI();
  const ownKey = getHeader(event, YourOwnRedmineAPI);
  if (ownKey) {
    try {
      if (!useClientUtil().decryptedAccessKey(ownKey)) throw new Error('empty');
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Invalid access key' });
    }
  }

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

  if (!transcripts && String(config.chatLogEnabled) !== 'false') {
    transcripts = createTranscriptWriter({
      dir: path.resolve(process.cwd(), String(config.chatLogDir)),
      retentionDays: Number(config.chatLogRetentionDays) || 30,
    });
  }

  return handleChat(
    {
      providerConfigured: Boolean((config.llmProvider as string)?.trim()),
      modelId: (config.llmModel as string) || undefined,
      rawBody: (await readRawBody(event, 'utf8')) ?? '',
      ip,
      signal: abort.signal,
      limits: resolveChatLimits({
        maxSteps: config.chatMaxSteps,
        maxOutputTokens: config.chatMaxOutputTokens,
        requestTimeoutMs: config.chatRequestTimeoutMs,
      }),
    },
    defaultChatDeps(limiter, transcripts, ownKey ? { [YourOwnRedmineAPI]: ownKey } : undefined),
  );
});
