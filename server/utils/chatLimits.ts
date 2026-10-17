export interface ChatLimiterOptions {
  /** Max accepted requests per client within any 60 s window. */
  perMinute: number;
  /** Max accepted requests per client per local calendar day. */
  perIpPerDay: number;
  /** Max accepted requests for the whole system per local calendar day. */
  perDay: number;
  now?: () => number;
}

export type LimitDecision =
  | { ok: true }
  | { ok: false; reason: 'rate' | 'ip_daily' | 'daily'; retryAfterSec: number };

const MINUTE_MS = 60_000;
const PRUNE_ABOVE = 1000;

const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const secondsToMidnight = (ms: number) => {
  const d = new Date(ms);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  return Math.max(1, Math.ceil((next - ms) / 1000));
};

/**
 * In-memory limiter for the anonymous chat route. State lives in this process only: it resets on
 * restart and is not shared between containers. The caller must pass the socket address as `key`
 * (never a client-supplied header). A per-client daily cap keeps one person from using up the
 * global daily budget for everybody.
 */
export const createChatLimiter = (opts: ChatLimiterOptions) => {
  const now = opts.now ?? Date.now;
  const recent = new Map<string, number[]>(); // timestamps within the last minute
  const perIpToday = new Map<string, number>();
  let day = dayKey(now());
  let today = 0;

  const rollDay = (t: number) => {
    const k = dayKey(t);
    if (k !== day) {
      day = k;
      today = 0;
      perIpToday.clear();
    }
  };

  const prune = (t: number) => {
    for (const [key, stamps] of recent) {
      const fresh = stamps.filter(s => t - s < MINUTE_MS);
      if (fresh.length) recent.set(key, fresh);
      else recent.delete(key);
    }
  };

  /** Checks all limits and, only if they all pass, records the request. */
  const take = (key: string): LimitDecision => {
    const t = now();
    rollDay(t);

    if (today >= opts.perDay) return { ok: false, reason: 'daily', retryAfterSec: secondsToMidnight(t) };
    if ((perIpToday.get(key) ?? 0) >= opts.perIpPerDay) {
      return { ok: false, reason: 'ip_daily', retryAfterSec: secondsToMidnight(t) };
    }

    const stamps = (recent.get(key) ?? []).filter(s => t - s < MINUTE_MS);
    if (stamps.length >= opts.perMinute) {
      return { ok: false, reason: 'rate', retryAfterSec: Math.max(1, Math.ceil((stamps[0]! + MINUTE_MS - t) / 1000)) };
    }

    stamps.push(t);
    recent.set(key, stamps);
    perIpToday.set(key, (perIpToday.get(key) ?? 0) + 1);
    today += 1;
    if (recent.size > PRUNE_ABOVE) prune(t);
    return { ok: true };
  };

  return { take, _size: () => recent.size };
};

export type ChatLimiter = ReturnType<typeof createChatLimiter>;
