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

  describe('issue references (#123)', () => {
    const base = 'https://redmine.example';
    const links = (src: string, issueUrlBase: string | undefined = base) =>
      [...dom(renderMarkdown(src, { issueUrlBase })).querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href')]);

    it('links #123 to the Redmine issue, in a new tab', () => {
      const html = renderMarkdown('see #12345 now', { issueUrlBase: base });
      expect(html).toContain('<a href="https://redmine.example/issues/12345" target="_blank" rel="noopener noreferrer">#12345</a>');
      expect(html).toContain('see ');
      expect(html).toContain(' now');
    });

    it('links several ids, in lists and table cells, at the start and end of text, after ( and ,', () => {
      expect(links('#1, #2 and (#3)')).toEqual([['#1', `${base}/issues/1`], ['#2', `${base}/issues/2`], ['#3', `${base}/issues/3`]]);
      expect(links('- #10\n- #11')).toHaveLength(2);
      expect(links('| a | b |\n|---|---|\n| #20 | x #21 |')).toHaveLength(2);
    });

    it('does not link code, existing links, or look-alikes', () => {
      expect(links('`#12`')).toEqual([]);
      expect(links('```\n#12\n```')).toEqual([]);
      expect(links('[#12](https://example.com)')).toEqual([['#12', 'https://example.com']]);
      expect(links('abc#12 &#39; ##12 12345678 #12345678')).toEqual([]);
      expect(links('https://example.com/y#12')).toEqual([['https://example.com/y#12', 'https://example.com/y#12']]);
    });

    it('keeps "# 12" a heading, and links only the id inside "# #12 Title"', () => {
      expect(renderMarkdown('# 12', { issueUrlBase: base })).toContain('<h1>12</h1>');
      const root = dom(renderMarkdown('# #12 Title', { issueUrlBase: base }));
      expect(root.querySelector('h1 a')?.getAttribute('href')).toBe(`${base}/issues/12`);
    });

    it('handles a trailing slash, and links nothing without a base', () => {
      expect(links('#5', 'https://redmine.example/')).toEqual([['#5', `${base}/issues/5`]]);
      expect(links('#5', '')).toEqual([]);
      expect(renderMarkdown('#5')).not.toContain('<a');
    });

    it('never emits a dangerous href even if the base is not http(s)', () => {
      // DOMPurify drops the href, leaving an inert <a>; what matters is that no unsafe href survives.
      const hrefs = links('#5', 'javascript:alert(1)//').map(l => l[1]).filter((h): h is string => h !== null);
      expect(hrefs.filter(h => !/^(?:https?:|mailto:)/i.test(h))).toEqual([]);
    });
  });

  it('opens http links safely in a new tab', () => {
    const html = renderMarkdown('[ok](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
