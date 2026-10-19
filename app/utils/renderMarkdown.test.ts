import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './renderMarkdown';

// Escaped source (e.g. "&lt;b onclick=..&gt;") is inert text, so assert on the parsed DOM, not on the raw string.
const dom = (html: string) => {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
};
const hasEventHandler = (root: HTMLElement) =>
  [...root.querySelectorAll('*')].some(el => [...el.attributes].some(a => /^on/i.test(a.name)));

describe('renderMarkdown', () => {
  it('renders common markdown', () => {
    const html = renderMarkdown('# Title\n\n- a\n- b\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n`code`');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<li>a</li>');
    expect(html).toContain('<table>');
    expect(html).toContain('<code>code</code>');
  });

  it('does not emit script tags or event handlers', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)><b onclick="x()">hi</b>');
    const root = dom(html);
    expect(root.querySelector('script, img, b')).toBeNull();
    expect(hasEventHandler(root)).toBe(false);
  });

  it('drops javascript: and data: URLs from links', () => {
    const html = renderMarkdown('[a](javascript:alert(1)) [b](data:text/html;base64,AAAA) [c](JaVaScRiPt:alert(1))');
    // Unsafe URLs are never turned into links (the source stays inert text), so no <a> may carry them.
    const hrefs = [...dom(html).querySelectorAll('a')].map(a => a.getAttribute('href') ?? '');
    expect(hrefs.filter(h => !/^(?:https?:|mailto:)/i.test(h))).toEqual([]);
  });

  it('neutralises svg and style payloads', () => {
    const html = renderMarkdown('<svg onload=alert(1)><circle/></svg><style>body{display:none}</style>');
    const root = dom(html);
    expect(root.querySelector('svg, circle, style')).toBeNull();
    expect(hasEventHandler(root)).toBe(false);
  });

  it('opens http links safely in a new tab', () => {
    const html = renderMarkdown('[ok](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
