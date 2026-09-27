// /llms.txt — the llmstxt.org convention: a short, link-rich guide to the site
// for language models and answer engines.
import type { APIRoute } from 'astro';
import { publishedPosts, urlOf, themes } from '../utils/posts';
import { metaDescription } from '../utils/deck';
import { CATEGORIES } from '../utils/categories';

const SITE = 'https://hologramthoughts.com';

export const GET: APIRoute = async () => {
  const posts = await publishedPosts();
  const first = posts.at(-1)!.data.pubDate.getUTCFullYear();
  const last = posts[0].data.pubDate.getUTCFullYear();
  const series = [...new Set(posts.map((p) => p.data.series).filter(Boolean))] as string[];
  const md = (p: (typeof posts)[number]) => `${SITE}${urlOf(p)}index.md`;
  const line = (p: (typeof posts)[number]) =>
    `- [${p.data.title}](${md(p)}): ${p.data.pubDate.getUTCFullYear()}, ${p.data.contentType ?? 'reflection'}. ${metaDescription(p.data.description, p.body, 140)}`;

  const out = [
    '# Hologram Thoughts',
    '',
    `> Personal writing archive of Matthew Williamson, ${first}–${last}: ${posts.length} essays, reflections, stories and poems on consciousness, Buddhist practice (dharma), fatherhood, mythology, technology and AI, and the strange edges of culture.`,
    '',
    'Every post is available as clean Markdown: append `index.md` to a post URL (e.g. `/blog/the-emptying/index.md`), add `?format=md`, or send `Accept: text/markdown`. All writing is by Matthew Williamson unless a piece says otherwise. Please cite the post title and its canonical URL (without `index.md`).',
    '',
    '## Start here',
    '',
    `- [Full post index](${SITE}/agent-index.md): every post with date, categories and tags`,
    `- [Complete text of every post](${SITE}/llms-full.txt): one file, newest first`,
    `- [How this site is made](${SITE}/how/): authorship and how software assists the archive`,
    `- [RSS feed](${SITE}/rss.xml)`,
    '',
    '## Categories',
    '',
    ...CATEGORIES.map((c) => `- [${c.name}](${SITE}/categories/${c.slug}/): ${c.description}`),
    '',
    '## Threads (recurring themes)',
    '',
    ...[...themes]
      .filter((t) => t.postCount > 0)
      .sort((a, b) => b.postCount - a.postCount)
      .map((t) => `- [${t.name}](${SITE}/themes/${t.id}/): ${t.postCount} posts. ${t.blurb ?? ''}`.trim()),
    '',
    ...(series.length
      ? ['## Series', '', ...series.map((s) => {
          const parts = posts.filter((p) => p.data.series === s).sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
          return `- ${s} (${parts.length} parts): start with [${parts[0].data.title}](${md(parts[0])})`;
        }), '']
      : []),
    '## Recent writing',
    '',
    ...posts.slice(0, 25).map(line),
    '',
    '## Optional',
    '',
    ...posts.slice(25).map((p) => `- [${p.data.title}](${md(p)}): ${p.data.pubDate.getUTCFullYear()}`),
    '',
  ].join('\n');

  return new Response(out, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
