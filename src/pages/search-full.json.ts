// Full-text index for /search — fetched on first keystroke (or focus) and
// cached by the browser, instead of being inlined into the page HTML.
import type { APIRoute } from 'astro';
import { publishedPosts, urlOf } from '../utils/posts';
import { bodyText } from '../utils/deck';

export const GET: APIRoute = async () => {
  const posts = await publishedPosts();
  const docs = posts.map((p) => ({
    title: p.data.title,
    url: urlOf(p),
    categories: p.data.categories ?? [],
    tags: p.data.tags ?? [],
    description: p.data.description ?? '',
    content: bodyText(p.body.replace(/^(import|export)\s.*$/gm, '')),
    date: p.data.pubDate.toISOString(),
    year: p.data.pubDate.getUTCFullYear(),
    type: p.data.contentType ?? 'reflection',
  }));
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
