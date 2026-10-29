export interface ExportMessage {
  role: string;
  parts: { type: string; text?: string }[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const chatFileName = (now: Date): string =>
  `ai-chat-${day(now)}-${pad(now.getHours())}${pad(now.getMinutes())}.md`;

/** Text of one message: only visible text parts, not tool calls or reasoning. */
const textOf = (m: ExportMessage): string =>
  m.parts
    .filter(p => p.type === 'text' && p.text)
    .map(p => p.text as string)
    .join('')
    .trim();

export const chatToMarkdown = (messages: ExportMessage[], now: Date): string => {
  const blocks = [`# AI Chat\n\nExported ${day(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}`];
  for (const m of messages) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    const text = textOf(m);
    if (!text) continue;
    blocks.push(`## ${m.role === 'user' ? 'You' : 'Assistant'}\n\n${text}`);
  }
  return `${blocks.join('\n\n')}\n`;
};
