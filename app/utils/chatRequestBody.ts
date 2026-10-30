export interface RequestMessage {
  id?: string;
  role: string;
  parts: { type: string; text?: string }[];
}

/**
 * Messages as the server needs them: text parts only. The server drops tool parts anyway, but they
 * can be huge (full Redmine/GitLab results) and would trip the request size cap first.
 */
export const toTextOnlyMessages = <T extends RequestMessage>(messages: T[]): T[] =>
  messages.flatMap((m) => {
    const parts = m.parts.filter(p => p.type === 'text' && p.text);
    return parts.length ? [{ ...m, parts }] : [];
  });
