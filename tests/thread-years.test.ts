import { describe, expect, it } from 'vitest';
import { activeRanges, peakOf, threadSeries, yearCounts } from '../src/utils/thread-years';

const d = (y: number, m = 6) => Date.UTC(y, m - 1, 15);

describe('yearCounts', () => {
  it('buckets by UTC year and ignores out-of-range dates', () => {
    expect(yearCounts([d(2006), d(2006), d(2008), d(2030), d(1999)], 2006, 2008)).toEqual([2, 0, 1]);
  });
  it('uses UTC, not local time, at year boundaries', () => {
    expect(yearCounts([Date.UTC(2007, 0, 1, 0, 30)], 2006, 2007)).toEqual([0, 1]);
  });
});

describe('peakOf', () => {
  it('returns the earliest maximum', () => {
    expect(peakOf([1, 5, 2, 5], 2006)).toEqual({ year: 2007, count: 5 });
  });
});

describe('activeRanges', () => {
  it('merges runs, bridges a single quiet year, keeps isolated years', () => {
    // 2006–2015, then 2019 alone (gap too wide to bridge), then 2024–26
    const c = new Array(21).fill(0);
    for (let y = 2006; y <= 2015; y++) c[y - 2006] = 1;
    c[2019 - 2006] = 1;
    c[2024 - 2006] = c[2025 - 2006] = c[2026 - 2006] = 1;
    expect(activeRanges(c, 2006)).toBe('2006–15 · 2019 · 2024–26');
  });
  it('bridges exactly one empty year', () => {
    expect(activeRanges([1, 0, 1, 0, 0, 1], 2006)).toBe('2006–08 · 2011');
  });
  it('spells out century changes and single years', () => {
    expect(activeRanges([1, 1], 1999)).toBe('1999–2000');
    expect(activeRanges([0, 3, 0], 2006)).toBe('2007');
  });
});

describe('threadSeries', () => {
  it('drops empty threads and sorts by total, then name', () => {
    const dates = new Map([
      ['a', [d(2006)]],
      ['b', [d(2006), d(2007)]],
      ['c', []],
      ['z', [d(2007)]],
    ]);
    const s = threadSeries(
      [{ id: 'z', name: 'Zen' }, { id: 'a', name: 'Art' }, { id: 'b', name: 'Bio' }, { id: 'c', name: 'Cat' }],
      dates, 2006, 2007,
    );
    expect(s.map((t) => t.id)).toEqual(['b', 'a', 'z']);
    expect(s[0]).toMatchObject({ total: 2, counts: [1, 1], peak: { year: 2006, count: 1 }, ranges: '2006–07' });
  });
});
