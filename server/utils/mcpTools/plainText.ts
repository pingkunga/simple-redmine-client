const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

/**
 * Reduces HTML-ish text to plain text for the model: tags dropped, a few entities decoded,
 * whitespace collapsed, cut to `max` characters. Regex only (no DOM) so it runs on the server.
 */
export const toPlainText = (html: string, max: number): { text: string; truncated: boolean } => {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, e => ENTITIES[e] ?? e)
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text.length > max ? { text: `${text.slice(0, max).trimEnd()}…`, truncated: true } : { text, truncated: false };
};
