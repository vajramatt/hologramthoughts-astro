/**
 * Sanitize Muse-generated synthesis text into safe HTML for `set:html`.
 *
 * Threat model: `synthesis` comes from a build-time LLM (Llama via the relay) and
 * is committed to the repo. It is the ONLY raw-HTML sink on the production origin
 * (rendered in src/pages/themes/[id].astro). Even though it is hand-reviewed before
 * commit, a missed payload must never be able to ship. This function guarantees, at
 * the code level, that the output can only contain:
 *   - HTML-escaped text,
 *   - the <p> paragraph wrappers we add,
 *   - <a> anchors whose href points at THIS site (relative paths, #anchors, or
 *     absolute https://hologramthoughts.com URLs).
 * No <script>, no event-handler attributes, no javascript:/data: URIs, and no
 * off-site links — so the page can neither run injected script nor redirect a
 * reader to content that is not the author's own work.
 */

const ANCHOR_CLASS =
  'underline decoration-[var(--color-border-strong)] underline-offset-[3px] hover:text-[var(--color-bioluminescent)]';

/** Escape the five HTML-significant characters. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * True only for links that point at this site. Relative paths and in-page
 * anchors are same-origin by definition; absolute URLs are allowed only for the
 * canonical apex/www host over http(s). Everything else — javascript:/data:
 * URIs, mailto:, protocol-relative //host, and any other off-site URL — is
 * rejected.
 */
export function isInternalHref(url: string): boolean {
  const u = url.trim();
  if (u === '') return false;
  if (u.startsWith('//')) return false; // protocol-relative → off-site
  if (u.startsWith('/')) return true; // root-relative path
  if (u.startsWith('#')) return true; // in-page anchor
  const m = /^https?:\/\/([^/?#]+)/i.exec(u);
  if (m) {
    const host = m[1].toLowerCase();
    return host === 'hologramthoughts.com' || host === 'www.hologramthoughts.com';
  }
  return false;
}

/**
 * Convert one Muse synthesis paragraph-set into safe HTML.
 *
 * Order matters: the bare-domain normalization runs on the raw text, then the
 * WHOLE string is HTML-escaped (this neutralizes any markup or attribute
 * breakout), and only then are markdown links turned into anchors. Because
 * markdown delimiters `[]()` are not HTML-significant they survive escaping, so
 * the link regex still matches; the href is additionally scheme-checked and the
 * already-escaped value cannot break out of the attribute.
 */
export function renderSynthesis(synthesis: string | undefined | null): string {
  if (!synthesis) return '';
  // Strip the hyphenated host the model sometimes emits; collapse it to relative.
  let text = synthesis.replace(/https?:\/\/hologram-thoughts\.com/g, '');
  text = escapeHtml(text);
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
    // href is already escaped; decode &amp; only to run the scheme/host check.
    const rawHref = href.replace(/&amp;/g, '&');
    if (!isInternalHref(rawHref)) return label; // drop the link, keep escaped text
    return `<a href="${href}" class="${ANCHOR_CLASS}">${label}</a>`;
  });
  return `<p>${text.replace(/\n\n+/g, '</p><p>')}</p>`;
}
