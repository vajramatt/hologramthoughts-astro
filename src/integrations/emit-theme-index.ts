import type { AstroIntegration } from 'astro';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';

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

        // Cloudflare Pages _redirects file
        if (redirects.length > 0) {
          await writeFile(join(dir.pathname, '_redirects'), redirects.join('\n') + '\n');
        }
      }
    }
  };
}
