// /llms-full.txt — the complete text of every published post in one file,
// newest first, each with a small metadata header. For answer engines and
// agents that prefer one fetch over hundreds.
import type { APIRoute } from 'astro';
import { publishedPosts, urlOf, themeNamesFor } from '../utils/posts';

const SITE = 'https://hologramthoughts.com';

const clean = (body: string) =>
  body
    .replace(/^(import|export)\s.*$/gm, '')
    .replace(/<([A-Z][\w.]*)\b[^>]*\/>/gs, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const GET: APIRoute = async () => {
  const posts = await publishedPosts();
  const parts = [
    `# Hologram Thoughts — complete archive`,
    '',
    `> ${posts.length} posts by Matthew Williamson. Canonical site: ${SITE}. Newest first.`,
    '',
  ];
  for (const p of posts) {
    const themes = themeNamesFor(p);
    parts.push(
      '---',
      '',
      `# ${p.data.title}`,
      '',
      `- URL: ${SITE}${urlOf(p)}`,
      `- Date: ${p.data.pubDate.toISOString().slice(0, 10)}`,
      `- Author: Matthew Williamson`,
      `- Type: ${p.data.contentType ?? 'reflection'}`,
      p.data.categories?.length ? `- Categories: ${p.data.categories.join(', ')}` : '',
      themes.length ? `- Threads: ${themes.join(', ')}` : '',
      p.data.series ? `- Series: ${p.data.series}${p.data.seriesOrder ? `, part ${p.data.seriesOrder}` : ''}` : '',
      '',
      clean(p.body),
      '',
    );
  }
  return new Response(parts.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
