import { describe, it, expect } from 'vitest';
import {
  serializeJsonLd,
  websiteGraph,
  blogPostingGraph,
  collectionPageGraph,
  aboutPageGraph,
} from '../src/utils/jsonld';

describe('serializeJsonLd', () => {
  it('escapes < as \\u003c to prevent </script> breakout', () => {
    const out = serializeJsonLd({ headline: '</script><b>x</b>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c/script');
  });
  it('stays valid JSON after escaping', () => {
    const data = { a: '<x>', b: 1 };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});

describe('websiteGraph', () => {
  it('returns a WebSite and a Person', () => {
    const g = websiteGraph();
    const types = g.map((n: any) => n['@type']);
    expect(types).toContain('WebSite');
    expect(types).toContain('Person');
  });
});

describe('blogPostingGraph', () => {
  const base = {
    title: 'The Daimon',
    description: 'about daimons',
    url: 'https://hologramthoughts.com/blog/the-daimon/',
    datePublished: '2026-05-31T00:00:00.000Z',
    image: 'https://hologramthoughts.com/og-image.png',
  };
  it('returns BlogPosting then BreadcrumbList', () => {
    const g = blogPostingGraph(base);
    expect(g[0]['@type']).toBe('BlogPosting');
    expect(g[0].headline).toBe('The Daimon');
    expect(g[1]['@type']).toBe('BreadcrumbList');
    expect(g[1].itemListElement).toHaveLength(3);
  });
  it('omits keywords when no tags, includes when present', () => {
    expect(blogPostingGraph(base)[0].keywords).toBeUndefined();
    expect(blogPostingGraph({ ...base, tags: ['a', 'b'] })[0].keywords).toBe('a, b');
  });
  it('formats readingTime as ISO-8601 duration', () => {
    expect(blogPostingGraph({ ...base, readingTime: 7 })[0].timeRequired).toBe('PT7M');
  });
});

describe('collectionPageGraph', () => {
  it('wraps posts in an ItemList', () => {
    const g = collectionPageGraph({
      name: 'Nature', description: 'd', url: 'https://hologramthoughts.com/themes/nature/',
      posts: [{ title: 'A', url: 'https://hologramthoughts.com/blog/a/' }],
    });
    expect(g['@type']).toBe('CollectionPage');
    expect(g.mainEntity['@type']).toBe('ItemList');
    expect(g.mainEntity.itemListElement[0].position).toBe(1);
  });
});

describe('aboutPageGraph', () => {
  it('is an AboutPage authored by the Person', () => {
    const g = aboutPageGraph({ url: 'https://hologramthoughts.com/how/', description: 'd' });
    expect(g['@type']).toBe('AboutPage');
    expect(g.author['@type']).toBe('Person');
  });
});
