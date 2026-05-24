import { describe, it, expect } from 'vitest';
import { escapeHtml, isInternalHref, renderSynthesis } from '../src/utils/sanitize-synthesis';

describe('escapeHtml', () => {
  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;'
    );
  });
});

describe('isInternalHref', () => {
  it('allows root-relative paths and in-page anchors', () => {
    expect(isInternalHref('/blog/the-foo/')).toBe(true);
    expect(isInternalHref('#section')).toBe(true);
  });
  it('allows only the canonical site host for absolute URLs', () => {
    expect(isInternalHref('https://hologramthoughts.com/blog/x')).toBe(true);
    expect(isInternalHref('https://www.hologramthoughts.com/blog/x')).toBe(true);
    expect(isInternalHref('https://evil.com/x')).toBe(false);
    expect(isInternalHref('https://hologramthoughts.com.evil.com/x')).toBe(false);
  });
  it('rejects dangerous and off-site schemes', () => {
    expect(isInternalHref('javascript:alert(1)')).toBe(false);
    expect(isInternalHref('JAVASCRIPT:alert(1)')).toBe(false);
    expect(isInternalHref('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isInternalHref('mailto:a@b.com')).toBe(false);
    expect(isInternalHref('//evil.com')).toBe(false);
    expect(isInternalHref('')).toBe(false);
    expect(isInternalHref('   ')).toBe(false);
  });
});

describe('renderSynthesis', () => {
  it('returns empty string for empty input', () => {
    expect(renderSynthesis('')).toBe('');
    expect(renderSynthesis(undefined)).toBe('');
    expect(renderSynthesis(null)).toBe('');
  });

  it('neutralizes raw script tags', () => {
    const out = renderSynthesis('Hello <script>alert(document.cookie)</script> world');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('neutralizes event-handler / img-onerror injection', () => {
    const out = renderSynthesis('<img src=x onerror=alert(1)>');
    expect(out).not.toMatch(/<img/i);
    expect(out).toContain('&lt;img');
  });

  it('drops javascript: links to plain text', () => {
    const out = renderSynthesis('see [this](javascript:alert(1))');
    expect(out).not.toContain('<a');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('this');
  });

  it('drops off-site links to plain text', () => {
    const out = renderSynthesis('read [more](https://evil.com/phish)');
    expect(out).not.toContain('<a');
    expect(out).not.toContain('evil.com');
    expect(out).toContain('more');
  });

  it('keeps internal root-relative links as anchors', () => {
    const out = renderSynthesis('see [the post](/blog/the-foo/)');
    expect(out).toContain('<a href="/blog/the-foo/"');
    expect(out).toContain('>the post</a>');
  });

  it('keeps canonical absolute site links', () => {
    const out = renderSynthesis('see [post](https://hologramthoughts.com/blog/x)');
    expect(out).toContain('<a href="https://hologramthoughts.com/blog/x"');
  });

  it('strips the hyphenated host the model emits, leaving a relative link', () => {
    const out = renderSynthesis('see [post](https://hologram-thoughts.com/blog/x)');
    expect(out).toContain('<a href="/blog/x"');
  });

  it('cannot break out of the href attribute', () => {
    const out = renderSynthesis('[x](/a"><script>alert(1)</script>)');
    // The closing quote/angle brackets in the URL are escaped, so no tag forms.
    expect(out).not.toContain('"><script>');
    expect(out).not.toContain('<script>');
  });

  it('wraps double newlines as paragraph breaks', () => {
    const out = renderSynthesis('first para\n\nsecond para');
    expect(out).toBe('<p>first para</p><p>second para</p>');
  });
});
