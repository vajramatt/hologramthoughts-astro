# Homepage chips, /how page, SEO/AEO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shorten the homepage (drop Recent, add chips to Latest), add a `/how` colophon page in Matthew's voice, and add site-wide JSON-LD + SEO/AEO polish.

**Architecture:** A pure `src/utils/jsonld.ts` builds/serializes schema.org graphs (the only unit-testable piece — TDD with vitest). A thin `JsonLd.astro` emits them. `Layout.astro` emits a site-wide `WebSite`+`Person` graph on every page plus an optional per-page graph. UI/markup changes (chips, `/how`, footer, robots) are verified by building and inspecting `dist/`.

**Tech Stack:** Astro 5 (SSG), Svelte islands, Tailwind 4, vitest (happy-dom), Cloudflare Pages.

**Conventions (do not violate):**
- No hardcoded hex — use `var(--color-*)` tokens.
- Sidecar lookups use the multi-key pattern; URLs use `p.slug`.
- The ONLY raw-HTML sinks are `themes/[id].astro` (via `renderSynthesis`) and the new `JsonLd.astro` (escaped). Never add others.
- Commit after each task. Direct commits to `main`. Do NOT deploy until the final task's explicit go-ahead.

---

## Task 1: JSON-LD utility + tests (TDD)

**Files:**
- Create: `src/utils/jsonld.ts`
- Create: `tests/jsonld.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/jsonld.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- jsonld`
Expected: FAIL — `Cannot find module '../src/utils/jsonld'`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/jsonld.ts`:

```ts
// schema.org JSON-LD builders + a script-safe serializer.
// The serializer escapes `<` to < so a frontmatter value containing
// "</script>" cannot break out of the <script type="application/ld+json"> tag.
// (HTML entities are NOT decoded inside <script>, so < is the only correct
// escape here — it keeps the payload valid JSON.)

const SITE = 'https://hologramthoughts.com';
const SITE_NAME = 'Hologram Thoughts';
const SITE_DESC =
  'An archive of writing on consciousness, dharma, fatherhood, code, and the strange edges of culture.';

const PERSON = { '@type': 'Person', name: 'Matthew Williamson', url: SITE } as const;

export function serializeJsonLd(data: object | object[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function websiteGraph(): any[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE,
      description: SITE_DESC,
      inLanguage: 'en',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    { '@context': 'https://schema.org', ...PERSON },
  ];
}

export function blogPostingGraph(opts: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  image: string;
  tags?: string[];
  categories?: string[];
  wordCount?: number;
  readingTime?: number;
}): any[] {
  const posting: any = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    mainEntityOfPage: opts.url,
    datePublished: opts.datePublished,
    image: opts.image,
    inLanguage: 'en',
    author: PERSON,
    publisher: PERSON,
  };
  if (opts.tags?.length) posting.keywords = opts.tags.join(', ');
  if (opts.categories?.length) posting.articleSection = opts.categories;
  if (opts.wordCount) posting.wordCount = opts.wordCount;
  if (opts.readingTime) posting.timeRequired = `PT${opts.readingTime}M`;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Archive', item: `${SITE}/archive/` },
      { '@type': 'ListItem', position: 3, name: opts.title, item: opts.url },
    ],
  };
  return [posting, breadcrumb];
}

export function collectionPageGraph(opts: {
  name: string;
  description: string;
  url: string;
  posts: Array<{ title: string; url: string }>;
}): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: 'en',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: opts.posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.title,
        url: p.url,
      })),
    },
  };
}

export function aboutPageGraph(opts: { url: string; description: string }): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'How this gets made',
    url: opts.url,
    description: opts.description,
    inLanguage: 'en',
    author: PERSON,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- jsonld`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/utils/jsonld.ts tests/jsonld.test.ts
git commit -m "feat(seo): JSON-LD builders + script-safe serializer"
```

---

## Task 2: JsonLd.astro component

**Files:**
- Create: `src/components/JsonLd.astro`

- [ ] **Step 1: Create the component**

Create `src/components/JsonLd.astro`:

```astro
---
import { serializeJsonLd } from '../utils/jsonld';
interface Props { data: object | object[]; }
const { data } = Astro.props;
const json = serializeJsonLd(data);
---
<script type="application/ld+json" is:inline set:html={json} />
```

(`is:inline` keeps Astro from trying to bundle/transform the non-JS script.)

- [ ] **Step 2: Commit**

```bash
git add src/components/JsonLd.astro
git commit -m "feat(seo): JsonLd component"
```

---

## Task 3: Layout — jsonLd prop, site-wide graph, meta polish

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Add imports + prop**

In `src/layouts/Layout.astro` frontmatter, after the existing component imports (after the `ThemeDrawer` import line), add:

```ts
import JsonLd from '../components/JsonLd.astro';
import { websiteGraph } from '../utils/jsonld';
```

In the `Props` interface, add a field after `canonicalUrl?: string;`:

```ts
  jsonLd?: object | object[];
```

In the destructure (the `const { ... } = Astro.props;` block), add `jsonLd` after `canonicalUrl`:

```ts
  canonicalUrl,
  jsonLd,
```

- [ ] **Step 2: Polish OG/meta tags**

Replace this block:

```astro
    <meta property="og:image" content={ogImage} />
    <meta property="og:url" content={canonical} />
    <meta property="og:site_name" content="Hologram Thoughts" />
    <meta property="og:logo" content="https://hologramthoughts.com/favicon.svg" />
```

with:

```astro
    <meta property="og:image" content={ogImage} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content={title} />
    <meta property="og:url" content={canonical} />
    <meta property="og:site_name" content="Hologram Thoughts" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:logo" content="https://hologramthoughts.com/favicon.svg" />
    <meta name="robots" content="index,follow" />
```

And add an alt to the Twitter image — replace:

```astro
    <meta name="twitter:image" content={ogImage} />
```

with:

```astro
    <meta name="twitter:image" content={ogImage} />
    <meta name="twitter:image:alt" content={title} />
```

- [ ] **Step 3: Emit JSON-LD in <head>**

Immediately before the closing `</head>` tag (after the inline theme `<script>`), add:

```astro
    <JsonLd data={websiteGraph()} />
    {jsonLd && <JsonLd data={jsonLd} />}
```

- [ ] **Step 4: Build to verify**

Run: `npm run build`
Expected: Complete, no errors.

Run: `node -e "const fs=require('fs');const h=fs.readFileSync('dist/index.html','utf8');const m=[...h.matchAll(/<script type=\"application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/g)];console.log('blocks:',m.length);m.forEach(b=>JSON.parse(b[1]));console.log('all valid JSON');"`
Expected: `blocks: 1` (the WebSite+Person graph), `all valid JSON`.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat(seo): site-wide JSON-LD graph + OG/meta polish in Layout"
```

---

## Task 4: ThemeChip — small variant

**Files:**
- Modify: `src/components/ThemeChip.astro`

- [ ] **Step 1: Add the `small` prop**

Replace the entire frontmatter + button of `src/components/ThemeChip.astro` with:

```astro
---
interface Props { id: string; name: string; small?: boolean; }
const { id, name, small = false } = Astro.props;
const sizeCls = small ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-3 py-1 text-xs gap-1.5';
---
<button
  type="button"
  class={`theme-chip inline-flex items-center ${sizeCls} rounded-full font-medium text-[var(--color-ink)] border border-[var(--color-border-strong)] transition-all duration-[var(--dur-med)] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--color-bioluminescent)] hover:text-[var(--color-bioluminescent)]`}
  style="background: color-mix(in oklch, var(--color-spore) 8%, transparent); font-family: var(--font-ui);"
  data-theme={id}
  aria-label={`Explore theme: ${name}`}
>
  <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3" fill="currentColor" opacity="0.55"/></svg>
  <span>{name}</span>
</button>
```

(Default `small=false` preserves all existing call sites — PostCard, ThemeChipStrip.)

- [ ] **Step 2: Build to verify nothing broke**

Run: `npm run build`
Expected: Complete, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeChip.astro
git commit -m "feat(ui): ThemeChip small variant"
```

---

## Task 5: MuseHighlight — chips in the Latest column (Option B)

**Files:**
- Modify: `src/components/MuseHighlight.astro`

- [ ] **Step 1: Add prop + taxonomy name map**

In the frontmatter, replace:

```ts
interface Props {
  latestSlugs: string[];
  activeThemes: { id: string; name: string; blurb: string; postCount: number }[];
  stories: StoryItem[];
}
const { latestSlugs, activeThemes, stories } = Astro.props;
import { getCollection } from 'astro:content';
```

with:

```ts
interface Props {
  latestSlugs: string[];
  activeThemes: { id: string; name: string; blurb: string; postCount: number }[];
  stories: StoryItem[];
  themeIdsBySlug: Record<string, string[]>;
}
const { latestSlugs, activeThemes, stories, themeIdsBySlug } = Astro.props;
import { getCollection } from 'astro:content';
import ThemeChip from './ThemeChip.astro';
import taxonomy from '../content/themes/taxonomy.json';
const themeName = new Map<string, string>((taxonomy as any).themes.map((t: any) => [t.id, t.name]));
```

- [ ] **Step 2: Render chips + trailing date in the Latest list**

Replace the Latest `<ul>` block:

```astro
      <ul class="space-y-3 text-sm">
        {latest.map(p => (
          <li><a href={`/blog/${(p as any).slug ?? p!.id.replace(/\.md$/, '')}/`} class="no-underline hover:text-[var(--color-bioluminescent)]">
            <p>{p!.data.title}</p>
            <p class="text-xs text-[var(--color-ink-soft)]">{new Date(p!.data.pubDate).toLocaleDateString('en', { year: 'numeric', month: 'short' })}</p>
          </a></li>
        ))}
      </ul>
```

with:

```astro
      <ul class="space-y-3 text-sm">
        {latest.map(p => {
          const urlSlug = (p as any).slug ?? p!.id.replace(/\.md$/, '');
          const ids = (themeIdsBySlug[urlSlug] ?? []).slice(0, 2);
          const date = new Date(p!.data.pubDate).toLocaleDateString('en', { year: 'numeric', month: 'short' });
          return (
            <li>
              <a href={`/blog/${urlSlug}/`} class="no-underline hover:text-[var(--color-bioluminescent)]">
                <p>{p!.data.title}</p>
              </a>
              <div class="flex flex-wrap items-center gap-1.5 mt-1">
                {ids.map(id => themeName.has(id) && <ThemeChip id={id} name={themeName.get(id)!} small />)}
                <span class="text-xs text-[var(--color-ink-soft)]">· {date}</span>
              </div>
            </li>
          );
        })}
      </ul>
```

- [ ] **Step 3: Commit (build verified in Task 6 once index passes the prop)**

```bash
git add src/components/MuseHighlight.astro
git commit -m "feat(ui): theme chips in homepage Latest column"
```

---

## Task 6: index.astro — pass Latest themeIds, remove Recent, add description

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Compute Latest themeIds; delete the `featured` block**

Replace this block (the `featured` computation):

```ts
const featured = all.slice(0, 6);
const themeIdsBySlug: Record<string, string[]> = {};
for (const p of featured) {
  const urlSlug = slugOf(p);
  const key = sidecarKey(p);
  try {
    const sc = await import(`../content/themes/${key}.json`);
    themeIdsBySlug[urlSlug] = sc.default.themeIds ?? [];
  } catch {
    themeIdsBySlug[urlSlug] = [];
  }
}
```

with:

```ts
// themeIds for each Latest post (URL-slug keyed; sidecar looked up by multi-key)
const themeIdsByLatestSlug: Record<string, string[]> = {};
for (const s of latestSlugs) {
  const p = postBySlug.get(s);
  if (!p) { themeIdsByLatestSlug[s] = []; continue; }
  try {
    const sc = await import(`../content/themes/${sidecarKey(p)}.json`);
    themeIdsByLatestSlug[s] = sc.default.themeIds ?? [];
  } catch {
    themeIdsByLatestSlug[s] = [];
  }
}
```

- [ ] **Step 2: Remove the PostCard import**

Delete this line from the imports:

```ts
import PostCard from '../components/PostCard.astro';
```

- [ ] **Step 3: Pass description to Layout + themeIds to MuseHighlight; delete Recent section**

Replace:

```astro
<Layout title="Hologram Thoughts">
```

with:

```astro
<Layout title="Hologram Thoughts" description="Twenty years of writing on consciousness, dharma, fatherhood, code, and the strange edges of culture — an archive of attention, curated by Muse.">
```

Replace:

```astro
  <MuseHighlight latestSlugs={latestSlugs} activeThemes={activeThemes} stories={stories} />

  <section class="my-16">
    <h2 class="text-3xl mb-8" style="font-family: var(--font-display);">Recent</h2>
    <div class="space-y-2">
      {featured.map(p => {
        const s = slugOf(p);
        return <PostCard slug={s} title={p.data.title} pubDate={p.data.pubDate} themeIds={themeIdsBySlug[s]} />;
      })}
    </div>
  </section>
</Layout>
```

with:

```astro
  <MuseHighlight latestSlugs={latestSlugs} activeThemes={activeThemes} stories={stories} themeIdsBySlug={themeIdsByLatestSlug} />
</Layout>
```

- [ ] **Step 4: Build + verify homepage**

Run: `npm run build`
Expected: Complete, no errors.

Run: `node -e "const h=require('fs').readFileSync('dist/index.html','utf8'); console.log('Recent removed:', !h.includes('>Recent<')); console.log('chips present:', h.includes('theme-chip'));"`
Expected: `Recent removed: true`, `chips present: true`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): drop Recent section, chips in Latest, page description"
```

---

## Task 7: Blog posts — BlogPosting + BreadcrumbList

**Files:**
- Modify: `src/pages/blog/[slug].astro`

- [ ] **Step 1: Import the builder + build the graph**

In the frontmatter, after the `import RelatedPosts ...` line, add:

```ts
import { blogPostingGraph } from '../../utils/jsonld';
```

After the existing `const isSeries = !!post.data.series;` line, add:

```ts
const jsonLd = blogPostingGraph({
  title: post.data.title,
  description: ogDescription,
  url: canonicalUrl,
  datePublished: publishedTime!,
  image: 'https://hologramthoughts.com/og-image.png',
  tags: post.data.tags,
  categories: post.data.categories,
  wordCount: remarkPluginFrontmatter?.wordCount ?? post.data.wordCount,
  readingTime,
});
```

- [ ] **Step 2: Pass it to Layout**

Replace:

```astro
<Layout
  title={`${post.data.title} — Hologram Thoughts`}
  description={ogDescription}
  ogType="article"
  publishedTime={publishedTime}
  tags={post.data.tags}
  canonicalUrl={canonicalUrl}
>
```

with:

```astro
<Layout
  title={`${post.data.title} — Hologram Thoughts`}
  description={ogDescription}
  ogType="article"
  publishedTime={publishedTime}
  tags={post.data.tags}
  canonicalUrl={canonicalUrl}
  jsonLd={jsonLd}
>
```

- [ ] **Step 3: Build + verify a post has 3 JSON-LD blocks**

Run: `npm run build`
Expected: Complete, no errors.

Run: `node -e "const h=require('fs').readFileSync('dist/blog/the-demonization-of-the-daimon/index.html','utf8');const m=[...h.matchAll(/application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/g)];const types=m.flatMap(b=>{const j=JSON.parse(b[1]);return Array.isArray(j)?j.map(x=>x['@type']):[j['@type']]});console.log(types);"`
Expected: array containing `WebSite`, `Person`, `BlogPosting`, `BreadcrumbList`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/blog/\[slug\].astro
git commit -m "feat(seo): BlogPosting + BreadcrumbList JSON-LD on posts"
```

---

## Task 8: Theme pages — CollectionPage + ItemList

**Files:**
- Modify: `src/pages/themes/[id].astro`

- [ ] **Step 1: Import builder + build graph after `posts`**

After the `import { renderSynthesis } ...` line, add:

```ts
import { collectionPageGraph } from '../../utils/jsonld';
```

After the `const posts = ...` assignment (the `.sort(...)` chain ending the frontmatter), add:

```ts
const jsonLd = collectionPageGraph({
  name: theme.name,
  description: theme.blurb || `Posts on ${theme.name}.`,
  url: `https://hologramthoughts.com/themes/${theme.id}/`,
  posts: posts.map((p: any) => ({
    title: p.data.title,
    url: `https://hologramthoughts.com/blog/${(p as any).slug ?? p.id.replace(/\.md$/, '')}/`,
  })),
});
```

- [ ] **Step 2: Pass to Layout**

Replace:

```astro
<Layout title={`${theme.name} — Hologram Thoughts`} description={theme.blurb}>
```

with:

```astro
<Layout title={`${theme.name} — Hologram Thoughts`} description={theme.blurb} jsonLd={jsonLd}>
```

- [ ] **Step 3: Build + verify**

Run: `npm run build`
Expected: Complete, no errors.

Run: `node -e "const h=require('fs').readFileSync('dist/themes/nature/index.html','utf8');const m=[...h.matchAll(/application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/g)];const has=m.some(b=>JSON.parse(b[1])['@type']==='CollectionPage');console.log('CollectionPage:',has);"`
Expected: `CollectionPage: true`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/themes/\[id\].astro
git commit -m "feat(seo): CollectionPage JSON-LD on theme pages"
```

---

## Task 9: Per-page descriptions (themes index, archive, search)

**Files:**
- Modify: `src/pages/themes/index.astro`
- Modify: `src/pages/archive/[...page].astro`
- Modify: `src/pages/search.astro`

- [ ] **Step 1: themes/index.astro**

Replace:

```astro
<Layout title="Themes — Hologram Thoughts">
```

with:

```astro
<Layout title="Themes — Hologram Thoughts" description="The threads running through twenty years of writing — themes Muse drew across the archive, each with the posts that grow it.">
```

- [ ] **Step 2: archive/[...page].astro**

Replace:

```astro
<Layout title={`Archive${page.currentPage > 1 ? ` — Page ${page.currentPage}` : ''} — Hologram Thoughts`}>
```

with:

```astro
<Layout title={`Archive${page.currentPage > 1 ? ` — Page ${page.currentPage}` : ''} — Hologram Thoughts`} description="Every post, newest to oldest — the full archive of Hologram Thoughts.">
```

- [ ] **Step 3: search.astro**

Replace:

```astro
<Layout title="Search — Hologram Thoughts">
```

with:

```astro
<Layout title="Search — Hologram Thoughts" description="Search the full archive of Hologram Thoughts.">
```

- [ ] **Step 4: Build + commit**

Run: `npm run build`
Expected: Complete, no errors.

```bash
git add src/pages/themes/index.astro src/pages/archive/\[...page\].astro src/pages/search.astro
git commit -m "feat(seo): unique meta descriptions for themes, archive, search"
```

---

## Task 10: `/how` page

**Files:**
- Create: `src/pages/how.astro`

- [ ] **Step 1: Create the page**

Create `src/pages/how.astro` (copy is final, in Matthew's voice; tokens only; no infra; no `set:html`):

```astro
---
import Layout from '../layouts/Layout.astro';
import { aboutPageGraph } from '../utils/jsonld';

const jsonLd = aboutPageGraph({
  url: 'https://hologramthoughts.com/how/',
  description:
    'How Hologram Thoughts is made: Matthew writes every post; an AI curator named Muse tends the connections; Claude is the engine. The line between human and machine, stated plainly.',
});

const cast = [
  {
    role: 'Thinking partner',
    name: 'Athena',
    does: 'An AI persona I built and keep building. I think with her across all kinds of things, and I write to her so she comes to know me. She is company and counsel.',
    not: 'She does not touch the blog — no posts, no curation, no say in what you read here.',
  },
  {
    role: 'Curator',
    name: 'Muse',
    does: 'She reads the whole archive and tends the paths through it: names the themes, writes the short blurbs and the synthesis paragraphs, and suggests where to go after a piece lands.',
    not: 'She does not write the essays, and she is build-time only — assembled once before the site ships. There is no Muse to chat with, nothing listening, no live model behind a page.',
  },
  {
    role: 'Engine',
    name: 'Claude',
    does: 'The hands. Carried the whole thing off WordPress onto Astro in 2025, builds the site, and runs Muse each time before deploy.',
    not: 'It does not author the writing or speak in my voice. When Muse sounds like Muse, it is because I read her lines and kept or cut them.',
  },
];

const timeline = [
  { when: 'The early days', what: 'Hand-coded static pages.' },
  { when: 'For years', what: 'WordPress.' },
  { when: '2025', what: 'Claude moved everything to Astro.' },
  { when: '2026', what: 'We automated the tending with Muse.' },
];
---
<Layout title="How this gets made — Hologram Thoughts" description="How Hologram Thoughts is made — the line between what I write and what the machines do. For readers and for the agents who find this." jsonLd={jsonLd}>
  <article>
    <header class="mb-12">
      <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)] mb-3">Colophon</p>
      <h1 class="text-4xl md:text-5xl tracking-tight leading-[1.1]" style="font-family: var(--font-display);">
        How this <span class="prismatic">gets made</span>
      </h1>
      <p class="text-lg text-[var(--color-ink-soft)] mt-6 max-w-xl leading-relaxed">
        I'm Matthew. I write every word of every post here — twenty years of it. What I've handed off is
        everything around the writing. Here is exactly who does what, so you always know what is mine and
        what is made by a machine.
      </p>
    </header>

    <section class="space-y-6 mb-16">
      {cast.map(c => (
        <div class="membrane rounded-2xl p-6">
          <p class="text-xs uppercase tracking-[0.12em] text-[var(--color-bioluminescent)] mb-1" style="font-family: var(--font-ui);">{c.role}</p>
          <h2 class="text-2xl mb-2" style="font-family: var(--font-display);">{c.name}</h2>
          <p class="text-[var(--color-ink)] leading-relaxed">{c.does}</p>
          <p class="text-sm text-[var(--color-ink-soft)] mt-2 leading-relaxed">{c.not}</p>
        </div>
      ))}
    </section>

    <section class="mb-16">
      <h2 class="text-xl mb-4" style="font-family: var(--font-display);">The line between us</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <div class="rounded-2xl p-5 border border-[var(--color-border)]" style="background: color-mix(in oklch, var(--color-spore) 6%, transparent);">
          <p class="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)] mb-3" style="font-family: var(--font-ui);">Mine — human</p>
          <ul class="space-y-1.5 text-sm text-[var(--color-ink)]">
            <li>Every post, every word</li>
            <li>The final say on everything Muse writes</li>
            <li>What gets featured</li>
          </ul>
        </div>
        <div class="rounded-2xl p-5 border border-[var(--color-border)]" style="background: color-mix(in oklch, var(--color-bioluminescent) 5%, transparent);">
          <p class="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)] mb-3" style="font-family: var(--font-ui);">Machine</p>
          <ul class="space-y-1.5 text-sm text-[var(--color-ink)]">
            <li>Theme names and blurbs</li>
            <li>Synthesis paragraphs</li>
            <li>The "read this next" suggestions</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="mb-16">
      <h2 class="text-xl mb-4" style="font-family: var(--font-display);">How it got here</h2>
      <ol class="border-l border-[var(--color-border-strong)] pl-5 space-y-4">
        {timeline.map(t => (
          <li>
            <p class="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]" style="font-family: var(--font-ui);">{t.when}</p>
            <p class="text-[var(--color-ink)]">{t.what}</p>
          </li>
        ))}
      </ol>
    </section>

    <section class="rounded-2xl p-6 border border-dashed border-[var(--color-border-strong)]">
      <p class="text-xs uppercase tracking-[0.12em] text-[var(--color-bioluminescent)] mb-2" style="font-family: var(--font-mono);">for agents</p>
      <p class="text-sm text-[var(--color-ink-soft)] leading-relaxed" style="font-family: var(--font-mono);">
        Every page is available as clean Markdown — append <code>?format=md</code> or send <code>Accept: text/markdown</code>.
        An index of all posts lives at <a href="/agent-index.md" class="text-[var(--color-spore-bright)] no-underline hover:text-[var(--color-bioluminescent)]">/agent-index.md</a>.
        Machine-generated text on this site is labeled as Muse's. The essays are human.
      </p>
    </section>
  </article>
</Layout>
```

- [ ] **Step 2: Build + verify the page renders with AboutPage schema and no infra leaks**

Run: `npm run build`
Expected: Complete; output lists `/how/index.html`.

Run: `node -e "const h=require('fs').readFileSync('dist/how/index.html','utf8');const m=[...h.matchAll(/application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/g)];console.log('AboutPage:',m.some(b=>JSON.parse(b[1])['@type']==='AboutPage'));console.log('no infra leak:', !/Mac Mini|athena-agent|athena-brain|Cloudflare|wrangler/i.test(h));"`
Expected: `AboutPage: true`, `no infra leak: true`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/how.astro
git commit -m "feat(content): /how colophon page"
```

---

## Task 11: Footer — link to /how

**Files:**
- Modify: `src/components/SiteFooter.astro`

- [ ] **Step 1: Add the link**

Replace:

```astro
      <nav class="flex gap-6">
        <a href="/rss.xml" class="no-underline hover:text-[var(--color-bioluminescent)]">rss</a>
        <a href="/agent-index.md" class="no-underline hover:text-[var(--color-bioluminescent)]">agents</a>
        <a href="/archive/" class="no-underline hover:text-[var(--color-bioluminescent)]">archive</a>
      </nav>
```

with:

```astro
      <nav class="flex gap-6">
        <a href="/how/" class="no-underline hover:text-[var(--color-bioluminescent)]">how it's made</a>
        <a href="/rss.xml" class="no-underline hover:text-[var(--color-bioluminescent)]">rss</a>
        <a href="/agent-index.md" class="no-underline hover:text-[var(--color-bioluminescent)]">agents</a>
        <a href="/archive/" class="no-underline hover:text-[var(--color-bioluminescent)]">archive</a>
      </nav>
```

- [ ] **Step 2: Build + commit**

Run: `npm run build`
Expected: Complete, no errors.

```bash
git add src/components/SiteFooter.astro
git commit -m "feat(ui): footer link to /how"
```

---

## Task 12: robots.txt — welcome AI crawlers

**Files:**
- Modify: `public/robots.txt`

- [ ] **Step 1: Replace contents**

Overwrite `public/robots.txt` with:

```
# Hologram Thoughts — humans and agents both welcome.
# Clean Markdown for any page: append ?format=md or send Accept: text/markdown.
# Post index: /agent-index.md

User-agent: *
Allow: /

# AI / agent crawlers — explicitly welcome
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: CCBot
Allow: /
User-agent: Applebot-Extended
Allow: /

Sitemap: https://hologramthoughts.com/sitemap-index.xml
```

- [ ] **Step 2: Build + verify it ships**

Run: `npm run build`
Expected: Complete.

Run: `node -e "const r=require('fs').readFileSync('dist/robots.txt','utf8');console.log('ClaudeBot:',r.includes('ClaudeBot'),'sitemap:',r.includes('sitemap-index'));"`
Expected: `ClaudeBot: true sitemap: true`.

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat(aeo): welcome AI crawlers in robots.txt"
```

---

## Task 13: Final verification, hand-review, deploy

**Files:** none (verification + deploy)

- [ ] **Step 1: Full test + build**

Run: `npm test`
Expected: all suites pass (sanitize + jsonld).

Run: `npm run build`
Expected: Complete, no errors; `/how/index.html` and the usual page count built.

- [ ] **Step 2: Verify JSON-LD validity across page types**

Run:
```bash
node -e "
const fs=require('fs');
for (const f of ['dist/index.html','dist/how/index.html','dist/blog/the-demonization-of-the-daimon/index.html','dist/themes/nature/index.html']) {
  const h=fs.readFileSync(f,'utf8');
  const m=[...h.matchAll(/application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/g)];
  m.forEach(b=>JSON.parse(b[1]));
  const types=m.flatMap(b=>{const j=JSON.parse(b[1]);return Array.isArray(j)?j.map(x=>x['@type']):[j['@type']]});
  console.log(f, '→', types.join(', '));
}
console.log('ALL JSON-LD VALID');
"
```
Expected: each file lists its types (home: WebSite, Person; how: + AboutPage; post: + BlogPosting, BreadcrumbList; theme: + CollectionPage), ending `ALL JSON-LD VALID`.

- [ ] **Step 3: Local preview walk (HUMAN GATE)**

Run: `npm run preview`
Manually confirm: homepage has no Recent section and Latest shows ≤2 chips + date; clicking a Latest chip opens the theme drawer; `/how/` reads correctly in Matthew's voice with the footer link working; light/dark both fine.

**STOP — Matthew hand-reviews `/how` copy and the homepage before deploy.**

- [ ] **Step 4: Deploy (only on explicit go-ahead)**

```bash
npm run build
npx wrangler pages deploy ./dist --project-name=hologramthoughts --branch=main
git push origin main
```

- [ ] **Step 5: Verify live**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://hologramthoughts.com/how/
curl -s https://hologramthoughts.com/robots.txt | grep -c ClaudeBot
curl -s https://hologramthoughts.com/ | grep -c 'application/ld+json'
```
Expected: `200`; `1`; at least `1`.

---

## Notes
- If `npm`/`node` hit `command not found`: `export PATH="/opt/homebrew/bin:$PATH"`.
- The Muse pipeline is NOT touched by this plan — no relay needed, no tagging/embedding.
- SearchAction in the WebSite graph points at `/search?q=`. The search page need not parse `q` for the markup to be valid; wiring `/search` to prefill from `?q=` is an optional future enhancement, out of scope here.
