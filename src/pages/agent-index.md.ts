import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  // Sort by date descending
  posts.sort((a, b) =>
    new Date(b.data.pubDate).valueOf() - new Date(a.data.pubDate).valueOf()
  );

  // Group by category
  const byCategory = new Map<string, typeof posts>();
  for (const post of posts) {
    const cats = post.data.categories?.length ? post.data.categories : ['Uncategorized'];
    for (const cat of cats) {
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(post);
    }
  }

  const formatDate = (d: Date) => new Date(d).toISOString().split('T')[0];

  // Build the index
  const lines: string[] = [
    '# Hologram Thoughts — Agent Index',
    '',
    `> ${posts.length} posts on Buddhism, meditation, consciousness, philosophy, and creative writing.`,
    '> Updated at build time. Request any post URL with `Accept: text/markdown` for markdown.',
    '',
    '---',
    '',
    '## All Posts',
    '',
  ];

  for (const post of posts) {
    const date = formatDate(post.data.pubDate);
    const cats = post.data.categories?.join(', ') || '';
    const tags = post.data.tags?.length ? ` | tags: ${post.data.tags.join(', ')}` : '';
    lines.push(`- **[${post.data.title}](/blog/${post.slug}/)** (${date}) — ${cats}${tags}`);
  }

  lines.push('', '---', '');

  // Category sections
  const categoryOrder = [
    'Dharma Writings',
    'Creative Writing',
    'Consciousness & Philosophy',
    'Practice & Inner Life',
    'Other',
  ];

  for (const cat of categoryOrder) {
    const catPosts = byCategory.get(cat);
    if (!catPosts?.length) continue;

    lines.push(`## ${cat} (${catPosts.length})`, '');
    for (const post of catPosts) {
      lines.push(`- [${post.data.title}](/blog/${post.slug}/)`);
    }
    lines.push('');
  }

  // Any categories not in the predefined order
  for (const [cat, catPosts] of byCategory) {
    if (categoryOrder.includes(cat)) continue;
    lines.push(`## ${cat} (${catPosts.length})`, '');
    for (const post of catPosts) {
      lines.push(`- [${post.data.title}](/blog/${post.slug}/)`);
    }
    lines.push('');
  }

  const body = lines.join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
};
