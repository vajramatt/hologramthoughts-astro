import { describe, it, expect } from 'vitest';
import { canonicalizeThemes, type ProposedTags } from '../scripts/02-canonicalize';

describe('canonicalizeThemes', () => {
  it('normalizes proposed tags to a single canonical id', () => {
    const proposed: ProposedTags[] = [
      { slug: 'a', tags: ['holographic-universe', 'oneness'] },
      { slug: 'b', tags: ['holographic universe', 'Oneness'] },
      { slug: 'c', tags: ['the holographic universe'] }
    ];
    const result = canonicalizeThemes(proposed);
    const ids = result.taxonomy.themes.map(t => t.id).sort();
    expect(ids).toEqual(['holographic-universe', 'oneness']);
    expect(result.sidecars.find(s => s.slug === 'b')?.themeIds.sort()).toEqual(['holographic-universe', 'oneness']);
  });

  it('drops tags below minCount threshold', () => {
    const proposed: ProposedTags[] = [
      { slug: 'a', tags: ['oneness', 'rare-tag'] },
      { slug: 'b', tags: ['oneness'] },
      { slug: 'c', tags: ['oneness'] }
    ];
    const result = canonicalizeThemes(proposed, { minCount: 2 });
    expect(result.taxonomy.themes.map(t => t.id)).toEqual(['oneness']);
    expect(result.sidecars.find(s => s.slug === 'a')?.themeIds).toEqual(['oneness']);
  });
});
