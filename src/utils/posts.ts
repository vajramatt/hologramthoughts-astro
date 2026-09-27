// Shared post helpers for .astro pages and endpoints. Centralises the
// three-slug dance described in CLAUDE.md §11:
//   - URLs always use Astro's `post.slug` (matches getStaticPaths)
//   - Muse sidecars are keyed by `data.slug ?? filename-base`
import { getCollection, type CollectionEntry } from 'astro:content';
import taxonomy from '../content/themes/taxonomy.json';
import type { PostSidecar, Theme } from '../lib/themes';

export type Post = CollectionEntry<'blog'>;

const sidecarModules = import.meta.glob<{ default: PostSidecar }>('../content/themes/*.json', { eager: true });
const sidecarByKey = new Map<string, PostSidecar>();
for (const [path, mod] of Object.entries(sidecarModules)) {
  const key = path.split('/').pop()!.replace(/\.json$/, '');
  if (key === 'taxonomy') continue;
  sidecarByKey.set(key, mod.default);
}

export const themes: Theme[] = (taxonomy as any).themes;
export const themeById = new Map<string, Theme>(themes.map((t) => [t.id, t]));

export const idBase = (p: Post) => p.id.replace(/\.mdx?$/, '');
export const routeSlug = (p: Post) => (p as any).slug ?? idBase(p);
export const urlOf = (p: Post) => `/blog/${routeSlug(p)}/`;
export const sidecarKey = (p: Post) => p.data.slug ?? routeSlug(p);

export function sidecarFor(p: Post): PostSidecar {
  return (
    sidecarByKey.get(sidecarKey(p)) ??
    sidecarByKey.get(routeSlug(p)) ??
    sidecarByKey.get(idBase(p)) ?? { slug: sidecarKey(p), themeIds: [], related: [] }
  );
}

export const themeIdsFor = (p: Post) => sidecarFor(p).themeIds.filter((id) => themeById.has(id));
export const themeNamesFor = (p: Post) => themeIdsFor(p).map((id) => themeById.get(id)!.name);

let cache: Post[] | null = null;
/** All published posts, newest first. */
export async function publishedPosts(): Promise<Post[]> {
  if (!cache) {
    // Same-day series parts: the later part counts as newer, so chapter order holds.
    cache = (await getCollection('blog', ({ data }) => !data.draft)).sort(
      (a, b) =>
        b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
        (b.data.seriesOrder ?? 0) - (a.data.seriesOrder ?? 0) ||
        a.data.title.localeCompare(b.data.title),
    );
  }
  return cache;
}

/** Multi-key lookup: frontmatter slug, Astro slug, filename base. */
export function slugIndex(posts: Post[]): Map<string, Post> {
  const m = new Map<string, Post>();
  for (const p of posts) {
    m.set(idBase(p), p);
    if ((p as any).slug) m.set((p as any).slug, p);
    if (p.data.slug) m.set(p.data.slug, p);
  }
  return m;
}
