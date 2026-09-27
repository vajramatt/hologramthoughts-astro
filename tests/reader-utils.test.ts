import { describe, it, expect } from 'vitest';
import { shouldShowDeck, metaDescription, bodyText } from '../src/utils/deck';
import { matchesFilters, parseFilters, serializeFilters, EMPTY_FILTERS, isFiltered } from '../src/utils/archive-filter';
import { rankEntries, scoreEntry } from '../src/utils/palette-rank';
import { categorySlug } from '../src/utils/categories';

describe('shouldShowDeck', () => {
  const body = 'A good friend and I had a conversation a few days ago that I think is worth sharing. We had spoken about a few things.';
  it('hides a description that is just the opening of the body', () => {
    expect(shouldShowDeck('A good friend and i had a conversation a few days ago that I think is worth sharing', body)).toBe(false);
  });
  it('hides truncated descriptions', () => {
    expect(shouldShowDeck('A poem about letting go and le...', 'Something else entirely.')).toBe(false);
    expect(shouldShowDeck('A poem about letting go and le…', 'Something else entirely.')).toBe(false);
  });
  it('shows a real, distinct deck', () => {
    expect(shouldShowDeck('The river sets its stones down to reach the sea.', 'The river does not carry stones uphill.')).toBe(true);
  });
  it('hides empty descriptions', () => {
    expect(shouldShowDeck('', body)).toBe(false);
    expect(shouldShowDeck(undefined, body)).toBe(false);
  });
  it('ignores markdown and case when comparing', () => {
    expect(shouldShowDeck('Hello world, this is the start of it all and it goes on for a while longer', '**Hello** [world](/x), this is the START of it all and it goes on for a while longer. More.')).toBe(false);
  });
});

describe('metaDescription', () => {
  it('keeps a complete short description', () => {
    expect(metaDescription('A walk through the pantheon.', 'body')).toBe('A walk through the pantheon.');
  });
  it('replaces a truncated description with body text cut at a sentence', () => {
    const body = 'First sentence is here and it is reasonably long for testing purposes. Second sentence keeps going and going well past the limit of the snippet so it must be cut.';
    const out = metaDescription('First sentence is here and it...', body, 100);
    expect(out).toBe('First sentence is here and it is reasonably long for testing purposes.');
  });
  it('word-cuts with an ellipsis when no sentence end fits', () => {
    const body = 'word '.repeat(80);
    const out = metaDescription(undefined, body, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
  it('bodyText strips markdown', () => {
    expect(bodyText('# Title\n\nSome **bold** [link](http://x.com) text.')).toBe('Title Some bold link text.');
  });
});

describe('archive filters', () => {
  const row = { type: 'poetry', cats: ['creative-writing'], text: 'the emptying impermanence inner peace' };
  it('matches with no filters', () => expect(matchesFilters(row, EMPTY_FILTERS)).toBe(true));
  it('filters by type', () => {
    expect(matchesFilters(row, { ...EMPTY_FILTERS, type: 'poetry' })).toBe(true);
    expect(matchesFilters(row, { ...EMPTY_FILTERS, type: 'story' })).toBe(false);
  });
  it('filters by category', () => {
    expect(matchesFilters(row, { ...EMPTY_FILTERS, cat: 'creative-writing' })).toBe(true);
    expect(matchesFilters(row, { ...EMPTY_FILTERS, cat: 'other' })).toBe(false);
  });
  it('requires every text term', () => {
    expect(matchesFilters(row, { ...EMPTY_FILTERS, q: 'Inner  EMPTY' })).toBe(true);
    expect(matchesFilters(row, { ...EMPTY_FILTERS, q: 'inner dragon' })).toBe(false);
  });
  it('round-trips through the URL', () => {
    const f = { type: 'story', cat: 'other', q: 'fire water' };
    expect(parseFilters(serializeFilters(f))).toEqual(f);
    expect(serializeFilters(EMPTY_FILTERS)).toBe('');
    expect(isFiltered(EMPTY_FILTERS)).toBe(false);
    expect(isFiltered(f)).toBe(true);
  });
});

describe('palette ranking', () => {
  const entries = [
    { t: 'The Emptying', u: '/blog/the-emptying/', d: '2026-07-19', y: 'poetry', th: ['Impermanence'] },
    { t: 'Empty Hands', u: '/blog/empty-hands/', d: '2010-01-01', y: 'reflection' },
    { t: 'A Note on Emptiness', u: '/blog/note/', d: '2015-01-01', y: 'article' },
    { t: 'Impermanence', u: '/themes/impermanence/', y: 'theme' },
    { t: 'Fire', u: '/blog/fire/', d: '2020-01-01', y: 'story', x: 'about empty rooms' },
  ];
  it('ranks title prefix above word match above substring above description', () => {
    const out = rankEntries(entries, 'empt').map((e) => e.u);
    expect(out.slice(0, 2)).toEqual(['/blog/empty-hands/', '/blog/the-emptying/']);
    expect(out.indexOf('/blog/fire/')).toBe(out.length - 1);
  });
  it('requires all terms', () => {
    expect(rankEntries(entries, 'emptying zebra')).toEqual([]);
  });
  it('matches themes via metadata', () => {
    expect(scoreEntry(entries[0], ['impermanence'])).toBeGreaterThan(0);
  });
  it('returns nothing for a blank query', () => {
    expect(rankEntries(entries, '   ')).toEqual([]);
  });
});

describe('categorySlug', () => {
  it('maps known names and falls back to other', () => {
    expect(categorySlug('Dharma Writings')).toBe('dharma-writings');
    expect(categorySlug('Unknown')).toBe('other');
  });
});

import { wrap, cardSvg } from '../src/utils/og';

describe('og card', () => {
  it('wraps greedily and ellipsizes overflow', () => {
    expect(wrap('one two three four', 9, 3)).toEqual(['one two', 'three', 'four']);
    const out = wrap('aaaa bbbb cccc dddd eeee', 9, 2);
    expect(out).toHaveLength(2);
    expect(out[1].endsWith('…')).toBe(true);
  });
  it('escapes XML in titles', () => {
    const svg = cardSvg({ kicker: 'x', title: 'Tom & <Jerry>', path: '~/' });
    expect(svg).toContain('Tom &amp; &lt;Jerry&gt;');
    expect(svg).not.toContain('<Jerry>');
  });
});
