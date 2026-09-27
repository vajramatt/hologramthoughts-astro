// Command-palette ranking — pure so it can be unit-tested and shared.

export interface PaletteEntry {
  t: string;       // title
  u: string;       // url
  d?: string;      // ISO date (posts only)
  y?: string;      // content type (posts) or entry kind ('theme', 'page')
  c?: string[];    // categories
  th?: string[];   // theme names
  x?: string;      // description / subtitle
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

const wordStarts = (hay: string, term: string) =>
  hay.startsWith(term) || hay.includes(` ${term}`) || hay.includes(`-${term}`);

export function scoreEntry(e: PaletteEntry, terms: string[]): number {
  if (!terms.length) return 0;
  const title = norm(e.t);
  const meta = norm([...(e.th ?? []), ...(e.c ?? []), e.y ?? ''].join(' '));
  const desc = norm(e.x ?? '');
  let score = 0;
  for (const term of terms) {
    let s = 0;
    if (title.startsWith(term)) s = 100;
    else if (wordStarts(title, term)) s = 60;
    else if (title.includes(term)) s = 35;
    else if (wordStarts(meta, term)) s = 22;
    else if (meta.includes(term)) s = 14;
    else if (desc.includes(term)) s = 8;
    if (s === 0) return 0; // every term must hit somewhere
    score += s;
  }
  // Non-post destinations (themes, pages) get a small nudge so "themes" finds the page.
  if (e.y === 'theme' || e.y === 'page') score += 5;
  return score;
}

export function rankEntries(entries: PaletteEntry[], query: string, limit = 12): PaletteEntry[] {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return entries
    .map((e) => ({ e, s: scoreEntry(e, terms) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || (b.e.d ?? '').localeCompare(a.e.d ?? ''))
    .slice(0, limit)
    .map((r) => r.e);
}
