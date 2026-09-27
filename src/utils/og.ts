// Build-time Open Graph card renderer (1200×630 PNG) in the site's TokyoNight
// terminal style. Fonts are vendored (OFL) under scripts/og-fonts so output
// doesn't depend on the build machine. Rendered PNGs are cached in .cache/og
// keyed by content hash, so unchanged cards are free on rebuild.
import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const FONT_DIR = resolve('scripts/og-fonts');
const FONT_FILES = [
  'Spectral-Regular.ttf',
  'Spectral-Medium.ttf',
  'Spectral-Italic.ttf',
  'JetBrainsMono-Regular.ttf',
  'JetBrainsMono-Medium.ttf',
].map((f) => join(FONT_DIR, f));
const CACHE_DIR = resolve('.cache/og');
const TEMPLATE_VERSION = 'v1';

export interface OgCard {
  kicker: string;       // e.g. "poetry · 2026"
  title: string;
  subtitle?: string;    // one line, italic
  path: string;         // e.g. "~/blog/the-emptying"
  footRight?: string;   // e.g. "4 min read"
  accent?: string;      // kicker dot color
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Greedy word wrap by an average glyph width estimate. */
export function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s,;:.–—-]*$/, '').slice(0, maxChars - 1) + '…';
    return kept;
  }
  return lines;
}

const KICKER_Y = 178;
const BOTTOM_LIMIT = 468;

/** Largest title size whose wrapped lines (plus optional subtitle) fit above the rule. */
function fitTitle(title: string, hasSub: boolean) {
  const sizes = [96, 84, 74, 66, 58, 52];
  for (const size of sizes) {
    const maxChars = Math.floor(1000 / (size * 0.47));
    const lines = wrap(title, maxChars, 3);
    const lh = Math.round(size * 1.06);
    const y0 = KICKER_Y + 26 + size * 0.8;
    const bottom = y0 + (lines.length - 1) * lh + (hasSub ? 56 : 0);
    if (bottom <= BOTTOM_LIMIT && !lines.at(-1)!.endsWith('…')) return { size, lines, lh, y0 };
  }
  const size = sizes.at(-1)!;
  const lh = Math.round(size * 1.06);
  const lines = wrap(title, Math.floor(1000 / (size * 0.47)), hasSub ? 3 : 4);
  return { size, lines, lh, y0: KICKER_Y + 26 + size * 0.8 };
}

export function cardSvg(card: OgCard): string {
  let sub = card.subtitle ? wrap(card.subtitle, 70, 1)[0] : '';
  let fit = fitTitle(card.title, !!sub);
  if (sub && fit.y0 + (fit.lines.length - 1) * fit.lh + 56 > BOTTOM_LIMIT) {
    sub = '';
    fit = fitTitle(card.title, false);
  }
  const { size, lines, lh, y0: titleTop } = fit;
  const subY = titleTop + (lines.length - 1) * lh + 56;
  const accent = card.accent ?? '#bb9af7';
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wm" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7aa2f7"/><stop offset="45%" stop-color="#7dcfff"/><stop offset="100%" stop-color="#bb9af7"/>
    </linearGradient>
    <linearGradient id="rule" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7dcfff"/><stop offset="60%" stop-color="#bb9af7"/><stop offset="100%" stop-color="#bb9af7" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="bloomA" cx="12%" cy="18%" r="60%">
      <stop offset="0%" stop-color="#7aa2f7" stop-opacity="0.16"/><stop offset="100%" stop-color="#7aa2f7" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bloomB" cx="92%" cy="88%" r="55%">
      <stop offset="0%" stop-color="#bb9af7" stop-opacity="0.13"/><stop offset="100%" stop-color="#bb9af7" stop-opacity="0"/>
    </radialGradient>
    <pattern id="scan" x="0" y="0" width="4" height="3" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="#c0caf5" fill-opacity="0.04"/>
    </pattern>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="#1a1b26"/>
  <rect width="1200" height="630" fill="url(#bloomA)"/>
  <rect width="1200" height="630" fill="url(#bloomB)"/>
  <rect x="28" y="28" width="1144" height="574" rx="18" fill="none" stroke="#c0caf5" stroke-opacity="0.09"/>

  <g fill="none" stroke-width="1.2">
    <polyline points="1172,112 1060,112 1016,156 1016,236" stroke="#7dcfff" opacity="0.28"/>
    <polyline points="1172,188 1104,188 1072,220" stroke="#bb9af7" opacity="0.24"/>
  </g>
  <g filter="url(#glow)">
    <rect x="1012" y="232" width="7" height="7" fill="#7dcfff" opacity="0.85"/>
    <rect x="1068" y="216" width="6" height="6" fill="#bb9af7" opacity="0.8"/>
  </g>

  <text x="100" y="118" font-family="JetBrains Mono" font-size="22">
    <tspan fill="#9ece6a">archive@hologram</tspan><tspan fill="#737aa2">:</tspan><tspan fill="#7aa2f7">${esc(card.path)}</tspan><tspan fill="#737aa2">$</tspan><tspan fill="#a9b1d6"> cat</tspan>
  </text>

  <circle cx="106" cy="${KICKER_Y - 6}" r="5" fill="${accent}" filter="url(#glow)"/>
  <text x="122" y="${KICKER_Y}" font-family="JetBrains Mono" font-size="18" letter-spacing="2.5" fill="#a9b1d6">${esc(card.kicker.toUpperCase())}</text>

  <text font-family="Spectral" font-weight="500" font-size="${size}" fill="#c0caf5" letter-spacing="-1">
    ${lines.map((l, i) => `<tspan x="98" y="${titleTop + i * lh}">${esc(l)}</tspan>`).join('')}
  </text>
  ${sub ? `<text x="100" y="${subY}" font-family="Spectral" font-style="italic" font-size="28" fill="#a9b1d6">${esc(sub)}</text>` : ''}

  <rect x="100" y="506" width="220" height="2" fill="url(#rule)"/>
  <text x="100" y="556" font-family="JetBrains Mono" font-size="26" font-weight="500" fill="url(#wm)">hologram thoughts</text>
  <rect x="371" y="534" width="13" height="26" fill="#9ece6a" filter="url(#glow)"/>
  <text x="1100" y="556" text-anchor="end" font-family="JetBrains Mono" font-size="20">
    <tspan fill="#bb9af7">author</tspan><tspan fill="#737aa2">: "</tspan><tspan fill="#9ece6a">Matthew Williamson</tspan><tspan fill="#737aa2">"</tspan>${card.footRight ? `<tspan fill="#737aa2">  ·  </tspan><tspan fill="#ff9e64">${esc(card.footRight)}</tspan>` : ''}
  </text>

  <rect width="1200" height="630" fill="url(#scan)"/>
</svg>`;
}

export async function renderCard(card: OgCard): Promise<Uint8Array> {
  const svg = cardSvg(card);
  const key = createHash('sha1').update(TEMPLATE_VERSION).update(svg).digest('hex');
  const cached = join(CACHE_DIR, `${key}.png`);
  try {
    return new Uint8Array(await readFile(cached));
  } catch { /* miss */ }
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Spectral' },
  }).render().asPng();
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cached, png);
  return new Uint8Array(png);
}
