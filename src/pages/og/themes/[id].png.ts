// Per-thread Open Graph card: /og/themes/<id>.png
import type { APIRoute, GetStaticPaths } from 'astro';
import { themes } from '../../../utils/posts';
import { renderCard } from '../../../utils/og';

export const getStaticPaths = (() =>
  themes.map((theme) => ({ params: { id: theme.id }, props: { theme } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { theme } = props as any;
  const png = await renderCard({
    kicker: `thread · ${theme.postCount} posts`,
    title: theme.name,
    subtitle: theme.blurb,
    path: '~/themes',
    accent: '#7dcfff',
  });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
