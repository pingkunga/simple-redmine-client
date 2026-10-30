import { z } from 'zod';

export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_MESSAGES = 30;
export const MAX_TOTAL_CHARS = 16000;

export class ChatInputError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const part = z.object({ type: z.string() }).passthrough();
const message = z.object({
  role: z.enum(['user', 'assistant']),
  parts: z.array(part).max(50),
});
const body = z.object({ messages: z.array(message).min(1).max(MAX_MESSAGES) });

export interface ParsedChat {
  /** UI messages holding text parts only. */
  messages: { role: 'user' | 'assistant'; parts: { type: 'text'; text: string }[] }[];
  chars: number;
}

/**
 * Validates the untrusted request body. Only text parts survive: tool calls/results and every
 * other part type sent by the browser are dropped, so a client can never inject forged tool
 * output into the conversation (tools are re-run server-side when needed).
 */
export const parseChatBody = (raw: string): ParsedChat => {
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new ChatInputError(413, 'Request body too large');

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ChatInputError(400, 'Body must be JSON');
  }

  const parsed = body.safeParse(json);
  if (!parsed.success) throw new ChatInputError(400, 'Invalid chat request');

  const messages: ParsedChat['messages'] = [];
  let chars = 0;
  for (const m of parsed.data.messages) {
    const parts = m.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof (p as { text?: unknown }).text === 'string')
      .map(p => ({ type: 'text' as const, text: p.text }))
      .filter(p => p.text.trim().length > 0);
    if (!parts.length) continue;
    chars += parts.reduce((n, p) => n + p.text.length, 0);
    messages.push({ role: m.role, parts });
  }

  if (chars > MAX_TOTAL_CHARS) throw new ChatInputError(413, `Conversation too long (max ${MAX_TOTAL_CHARS} characters)`);
  if (!messages.length || messages[messages.length - 1]!.role !== 'user') {
    throw new ChatInputError(400, 'The last message must be a non-empty user message');
  }

  return { messages, chars };
};
