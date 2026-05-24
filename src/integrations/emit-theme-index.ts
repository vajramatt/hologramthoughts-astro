import type { AstroIntegration } from 'astro';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';

// URLs that should be 410 Gone — overrides any cached file at edge.
// Add a slug here to permanently kill it from production.
const KILLED_SLUGS = [
  '2041-nw-48th-street'
];

// A slug is only safe to interpolate into a _redirects line if it is a plain
// path segment. This forbids whitespace/newlines (which could inject an extra
// redirect rule) and slashes/colons (which could turn a target into an external
// or protocol-relative URL). Guarantees every emitted redirect stays same-origin.
const SAFE_SLUG = /^[A-Za-z0-9._~-]+$/;
const isSafeSlug = (s: unknown): s is string => typeof s === 'string' && SAFE_SLUG.test(s);

export function emitThemeIndex(): AstroIntegration {
  return {
    name: 'emit-theme-index',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const themeDir = 'src/content/themes';
        const blogDir = 'src/content/blog';
        const reverse: Record<string, string[]> = {};
        const meta: Record<string, { slug: string; title: string; pubDate: string }> = {};

        let themeFiles: string[] = [];
        try {
          themeFiles = (await readdir(themeDir)).filter(f => f.endsWith('.json') && f !== 'taxonomy.json');
        } catch { themeFiles = []; }
        for (const f of themeFiles) {
          const sc = JSON.parse(await readFile(join(themeDir, f), 'utf8'));
          for (const id of sc.themeIds) {
            (reverse[id] ??= []).push(sc.slug);
          }
        }
        const redirects: string[] = [];
        for (const bf of (await readdir(blogDir)).filter(f => f.endsWith('.md'))) {
          const { data } = matter(await readFile(join(blogDir, bf), 'utf8'));
          if (data.draft) continue;
          const filenameBase = bf.replace(/\.md$/, '');
          const slug = data.slug ?? filenameBase;
          meta[slug] = { slug, title: data.title, pubDate: new Date(data.pubDate).toISOString() };
          // Legacy URL redirect: filename-based slug (often YYYY-MM-DD-foo) → clean frontmatter slug.
          // Only emit when both sides are safe path segments — never let a malformed slug
          // inject an extra rule or point a reader off-site.
          if (filenameBase !== slug) {
            if (isSafeSlug(filenameBase) && isSafeSlug(slug)) {
              redirects.push(`/blog/${filenameBase}/ /blog/${slug}/ 301`);
              redirects.push(`/blog/${filenameBase} /blog/${slug}/ 301`);
            } else {
              console.warn(`[emit-theme-index] skipping redirect for unsafe slug: ${JSON.stringify({ filenameBase, slug })}`);
            }
          }
        }

        const themesOut = join(dir.pathname, 'themes');
        await mkdir(themesOut, { recursive: true });
        await writeFile(join(themesOut, 'reverse-index.json'), JSON.stringify(reverse));
        await writeFile(join(themesOut, 'post-meta.json'), JSON.stringify(meta));

        // Killed slugs: emit BEFORE other rules so they win the match.
        // Use 301 to /404 so users see the styled 404 page (CF Pages _redirects
        // doesn't support standalone 410 status — redirect to 404 is cleaner).
        const killed: string[] = [];
        for (const k of KILLED_SLUGS) {
          if (!isSafeSlug(k)) {
            console.warn(`[emit-theme-index] skipping unsafe killed slug: ${JSON.stringify(k)}`);
            continue;
          }
          killed.push(`/blog/${k}/ /404 301`);
          killed.push(`/blog/${k} /404 301`);
        }

        const all = [...killed, ...redirects];
        if (all.length > 0) {
          await writeFile(join(dir.pathname, '_redirects'), all.join('\n') + '\n');
        }
      }
    }
  };
}
