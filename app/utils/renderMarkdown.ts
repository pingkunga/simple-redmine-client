import MarkdownIt from 'markdown-it';
import DOMPurify from 'isomorphic-dompurify';

// Raw HTML in the source is escaped by markdown-it; DOMPurify is a second layer over its output.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

const ALLOWED_URI = /^(?:https?:|mailto:)/i;

// "#123" not glued to a word, entity, path or another "#" (abc#1, &#39;, /x#1, ##1 stay plain).
const ISSUE_REF = /(^|[^\w&/#])#(\d{1,8})(?!\w)/g;

interface RenderEnv {
  issueUrlBase?: string;
}

// Runs after linkify, so it only sees text that markdown-it has already decided is plain text:
// headings ("# Title"), code, and existing links are separate tokens/children and are left alone.
md.core.ruler.push('issue_links', (state) => {
  const base = (state.env as RenderEnv).issueUrlBase?.replace(/\/+$/, '');
  if (!base) return;

  for (const block of state.tokens) {
    if (block.type !== 'inline' || !block.children) continue;

    const out: typeof block.children = [];
    let linkDepth = 0;
    for (const tok of block.children) {
      if (tok.type === 'link_open') linkDepth++;
      else if (tok.type === 'link_close') linkDepth--;

      if (tok.type !== 'text' || linkDepth > 0 || !tok.content.includes('#')) {
        out.push(tok);
        continue;
      }

      let last = 0;
      const pushText = (content: string) => {
        if (!content) return;
        const t = new state.Token('text', '', 0);
        t.content = content;
        out.push(t);
      };
      for (const m of tok.content.matchAll(ISSUE_REF)) {
        const start = m.index + m[1]!.length;
        pushText(tok.content.slice(last, start));
        const open = new state.Token('link_open', 'a', 1);
        open.attrs = [['href', `${base}/issues/${m[2]}`]];
        out.push(open);
        pushText(`#${m[2]}`);
        out.push(new state.Token('link_close', 'a', -1));
        last = start + 1 + m[2]!.length;
      }
      pushText(tok.content.slice(last));
    }
    block.children = out;
  }
});

// Set after sanitizing: target/rel would otherwise be rejected by ALLOWED_URI_REGEXP.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Render untrusted LLM/tool text as sanitized HTML, safe for v-html on both server and client.
 * With `issueUrlBase` (the Redmine URL), "#123" in plain text becomes a link to `<base>/issues/123`.
 */
export const renderMarkdown = (source: string, opts: RenderEnv = {}): string =>
  DOMPurify.sanitize(md.render(source, { ...opts }), {
    USE_PROFILES: { html: true },
    ALLOWED_URI_REGEXP: ALLOWED_URI,
    FORBID_TAGS: ['style', 'form', 'input', 'img', 'svg', 'math'],
  });
