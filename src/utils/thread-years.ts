// Thread sparklines — per-thread posts-per-year series for the homepage
// "Lines through the archive" block. Pure functions so the shape of the
// archive (when each thread ran, where it peaked) is testable.

export interface ThreadSeries {
  id: string;
  name: string;
  total: number;
  /** counts[i] = posts in year (from + i) */
  counts: number[];
  peak: { year: number; count: number };
  ranges: string;
}

/** Posts per calendar year (UTC), one slot per year from..to inclusive. */
export function yearCounts(dates: number[], from: number, to: number): number[] {
  const counts = new Array(to - from + 1).fill(0);
  for (const ms of dates) {
    const y = new Date(ms).getUTCFullYear();
    if (y >= from && y <= to) counts[y - from]++;
  }
  return counts;
}

/** Earliest year holding the maximum count. */
export function peakOf(counts: number[], from: number): { year: number; count: number } {
  let i = 0;
  for (let k = 1; k < counts.length; k++) if (counts[k] > counts[i]) i = k;
  return { year: from + i, count: counts[i] ?? 0 };
}

const short = (a: number, b: number) =>
  a === b ? `${a}` : Math.floor(a / 100) === Math.floor(b / 100) ? `${a}–${String(b).slice(2)}` : `${a}–${b}`;

/**
 * Active years as compact runs: "2006–15 · 2019 · 2024–26". A single quiet year
 * inside a run doesn't break it (`bridge` = longest gap of empty years absorbed).
 */
export function activeRanges(counts: number[], from: number, bridge = 1): string {
  const runs: [number, number][] = [];
  counts.forEach((c, i) => {
    if (!c) return;
    const y = from + i;
    const last = runs[runs.length - 1];
    if (last && y - last[1] - 1 <= bridge) last[1] = y;
    else runs.push([y, y]);
  });
  return runs.map(([a, b]) => short(a, b)).join(' · ');
}

export function threadSeries(
  themes: { id: string; name: string }[],
  datesById: Map<string, number[]>,
  from: number,
  to: number,
): ThreadSeries[] {
  return themes
    .map((t) => {
      const counts = yearCounts(datesById.get(t.id) ?? [], from, to);
      const total = counts.reduce((a, b) => a + b, 0);
      return { id: t.id, name: t.name, total, counts, peak: peakOf(counts, from), ranges: activeRanges(counts, from) };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
