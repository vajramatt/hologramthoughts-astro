import type { AstroIntegration } from 'astro';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';

// URLs that should be 410 Gone — overrides any cached file at edge.
// Add a slug here to permanently kill it from production.
const KILLED_SLUGS = [
  '2041-nw-48th-street'
];

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
          // Legacy URL redirect: filename-based slug (often YYYY-MM-DD-foo) → clean frontmatter slug
          if (filenameBase !== slug) {
            redirects.push(`/blog/${filenameBase}/ /blog/${slug}/ 301`);
            redirects.push(`/blog/${filenameBase} /blog/${slug}/ 301`);
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
