import MarkdownIt from 'markdown-it';
import DOMPurify from 'isomorphic-dompurify';

// Raw HTML in the source is escaped by markdown-it; DOMPurify is a second layer over its output.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

const ALLOWED_URI = /^(?:https?:|mailto:)/i;

// Set after sanitizing: target/rel would otherwise be rejected by ALLOWED_URI_REGEXP.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** Render untrusted LLM/tool text as sanitized HTML, safe for v-html on both server and client. */
export const renderMarkdown = (source: string): string =>
  DOMPurify.sanitize(md.render(source), {
    USE_PROFILES: { html: true },
    ALLOWED_URI_REGEXP: ALLOWED_URI,
    FORBID_TAGS: ['style', 'form', 'input', 'img', 'svg', 'math'],
  });
