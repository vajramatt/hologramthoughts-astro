// Lightweight index for the ⌘K command palette. Fetched lazily on first open.
// Titles, dates, types, themes and a short description — no body text.
import type { APIRoute } from 'astro';
import { publishedPosts, urlOf, themeNamesFor, themes } from '../utils/posts';
import { metaDescription } from '../utils/deck';

export const GET: APIRoute = async () => {
  const posts = await publishedPosts();
  const entries = [
    ...posts.map((p) => ({
      t: p.data.title,
      u: urlOf(p),
      d: p.data.pubDate.toISOString().slice(0, 10),
      y: p.data.contentType ?? 'reflection',
      c: p.data.categories,
      th: themeNamesFor(p),
      x: metaDescription(p.data.description, p.body, 110),
      ...(p.data.series ? { s: p.data.series } : {}),
    })),
    ...themes
      .filter((t) => t.postCount > 0)
      .map((t) => ({ t: t.name, u: `/themes/${t.id}/`, y: 'theme', x: `${t.postCount} posts · ${t.blurb ?? ''}`.trim() })),
  ];
  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
