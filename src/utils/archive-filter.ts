// Archive filtering — pure, shared by the archive page script and tests.

export interface ArchiveFilters {
  type: string; // 'all' or a content type
  cat: string;  // 'all' or a category slug
  q: string;    // free text, matched against title + themes
}

export interface ArchiveRowData {
  type: string;
  cats: string[]; // category slugs
  text: string;   // lowercase searchable text (title + theme names)
}

export const EMPTY_FILTERS: ArchiveFilters = { type: 'all', cat: 'all', q: '' };

export const normalizeText = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

export function matchesFilters(row: ArchiveRowData, f: ArchiveFilters): boolean {
  if (f.type !== 'all' && row.type !== f.type) return false;
  if (f.cat !== 'all' && !row.cats.includes(f.cat)) return false;
  const terms = normalizeText(f.q).split(' ').filter(Boolean);
  return terms.every((t) => row.text.includes(t));
}

export function parseFilters(search: string): ArchiveFilters {
  const p = new URLSearchParams(search);
  return {
    type: p.get('type') || 'all',
    cat: p.get('cat') || 'all',
    q: p.get('q') || '',
  };
}

export function serializeFilters(f: ArchiveFilters): string {
  const p = new URLSearchParams();
  if (f.type !== 'all') p.set('type', f.type);
  if (f.cat !== 'all') p.set('cat', f.cat);
  if (f.q.trim()) p.set('q', f.q.trim());
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const isFiltered = (f: ArchiveFilters) => f.type !== 'all' || f.cat !== 'all' || !!f.q.trim();
