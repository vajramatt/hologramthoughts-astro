// Per-post Open Graph card: /og/<route-slug>.png
import type { APIRoute, GetStaticPaths } from 'astro';
import { publishedPosts, routeSlug } from '../../utils/posts';
import { renderCard } from '../../utils/og';
import { shouldShowDeck } from '../../utils/deck';
import { readingMinutesOf } from '../../utils/reading';
import { categoryColor } from '../../utils/category-color';
import { CONTENT_TYPE_LABEL, type ContentType } from '../../utils/categories';

// SVG can't read CSS vars — resolve the category accent to its TokyoNight hex.
const HEX: Record<string, string> = {
  'var(--color-magenta)': '#bb9af7',
  'var(--color-green)': '#9ece6a',
  'var(--color-cyan)': '#7dcfff',
  'var(--color-blue)': '#7aa2f7',
  'var(--color-amber)': '#e0af68',
};

export const getStaticPaths = (async () => {
  const posts = await publishedPosts();
  return posts.map((post) => ({ params: { slug: routeSlug(post) }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as any;
  const type = (post.data.contentType ?? 'reflection') as ContentType;
  const year = post.data.pubDate.getUTCFullYear();
  const kicker = post.data.series && post.data.seriesOrder
    ? `${post.data.series} · part ${post.data.seriesOrder}`
    : `${CONTENT_TYPE_LABEL[type]} · ${year}`;
  const subtitle = shouldShowDeck(post.data.description, post.body) ? post.data.description : undefined;
  const png = await renderCard({
    kicker,
    title: post.data.title,
    subtitle,
    path: `~/archive/${year}`,
    footRight: `${readingMinutesOf(post.body)} min read`,
    accent: HEX[categoryColor(post.data.categories?.[0] ?? 'Other')] ?? '#bb9af7',
  });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
