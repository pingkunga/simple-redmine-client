import { appendFile, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

export interface ChatTranscriptStep {
  toolCalls: { name: string; input: unknown }[];
  toolResults: { name: string; output: unknown }[];
}

/** One recorded model call. Unlike the stdout audit line, this holds prompts and tool payloads. */
export interface ChatTranscript {
  ts: string;
  ip: string;
  ms: number;
  outcome: 'ok' | 'error' | 'aborted';
  model?: string;
  /** Last user message only; the client resends the whole history every turn. */
  question: string;
  historyCount: number;
  answer?: string;
  finish?: string;
  /** True when the model finished without any answer text (the page would show an empty bubble). */
  emptyAnswer?: boolean;
  usage?: unknown;
  steps: ChatTranscriptStep[];
  detail?: string;
}

export interface TranscriptWriterOptions {
  dir: string;
  /** Files older than this many days are deleted. */
  retentionDays: number;
  now?: () => number;
}

export const MAX_FIELD_CHARS = 20_000;

const DAY_MS = 24 * 60 * 60 * 1000;
const FILE_RE = /^(\d{4})-(\d{2})-(\d{2})\.jsonl$/;

const pad = (n: number) => String(n).padStart(2, '0');
const dayName = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Appends chat transcripts to `<dir>/YYYY-MM-DD.jsonl` and deletes files past the retention window.
 * Logging must never break chat: every I/O failure is caught and reported on stderr only.
 */
export const createTranscriptWriter = (opts: TranscriptWriterOptions) => {
  const now = opts.now ?? Date.now;
  let prunedOn = '';

  const prune = async () => {
    const cutoff = now() - opts.retentionDays * DAY_MS;
    let names: string[];
    try {
      names = await readdir(opts.dir);
    } catch {
      return; // directory not created yet
    }
    for (const name of names) {
      const m = FILE_RE.exec(name);
      if (!m) continue; // never touch files this writer did not create
      const fileDay = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
      if (fileDay < cutoff) await unlink(path.join(opts.dir, name)).catch(() => {});
    }
  };

  const serialize = (record: ChatTranscript): string => {
    let truncated = false;
    const line = JSON.stringify(record, (_key, value) => {
      if (typeof value === 'string' && value.length > MAX_FIELD_CHARS) {
        truncated = true;
        return `${value.slice(0, MAX_FIELD_CHARS)}…[truncated ${value.length - MAX_FIELD_CHARS} chars]`;
      }
      return value;
    });
    return truncated ? JSON.stringify({ ...JSON.parse(line), truncated: true }) : line;
  };

  const write = async (record: ChatTranscript): Promise<void> => {
    try {
      const t = now();
      const today = dayName(t);
      await mkdir(opts.dir, { recursive: true });
      await appendFile(path.join(opts.dir, `${today}.jsonl`), `${serialize(record)}\n`, 'utf8');
      if (prunedOn !== today) {
        prunedOn = today;
        await prune();
      }
    } catch (e) {
      console.error('[chat-transcript] write failed:', e instanceof Error ? e.message : e);
    }
  };

  return { write, prune };
};

export type TranscriptWriter = ReturnType<typeof createTranscriptWriter>;
