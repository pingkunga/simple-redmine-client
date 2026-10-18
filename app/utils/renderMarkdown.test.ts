import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './renderMarkdown';

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
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/onerror|onclick/i);
  });

  it('drops javascript: and data: URLs from links', () => {
    const html = renderMarkdown('[a](javascript:alert(1)) [b](data:text/html;base64,AAAA) [c](JaVaScRiPt:alert(1))');
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/data:/i);
  });

  it('neutralises svg and style payloads', () => {
    const html = renderMarkdown('<svg onload=alert(1)><circle/></svg><style>body{display:none}</style>');
    expect(html).not.toMatch(/<svg|<style|onload/i);
  });

  it('opens http links safely in a new tab', () => {
    const html = renderMarkdown('[ok](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
