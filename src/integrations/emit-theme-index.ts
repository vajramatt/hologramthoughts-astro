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
        for (const bf of (await readdir(blogDir)).filter(f => f.endsWith('.md'))) {
          const { data } = matter(await readFile(join(blogDir, bf), 'utf8'));
          if (data.draft) continue;
          const slug = data.slug ?? bf.replace(/\.md$/, '');
          meta[slug] = { slug, title: data.title, pubDate: new Date(data.pubDate).toISOString() };
        }

        const themesOut = join(dir.pathname, 'themes');
        await mkdir(themesOut, { recursive: true });
        await writeFile(join(themesOut, 'reverse-index.json'), JSON.stringify(reverse));
        await writeFile(join(themesOut, 'post-meta.json'), JSON.stringify(meta));
      }
    }
  };
}
