import type { AstroIntegration } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export function markdownForAgents(): AstroIntegration {
  return {
    name: 'markdown-for-agents',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const contentDir = path.resolve('src/content/blog');
        const outDir = dir.pathname;

        const files = fs.readdirSync(contentDir).filter(f => /\.mdx?$/.test(f));
        let count = 0;

        for (const file of files) {
          const raw = fs.readFileSync(path.join(contentDir, file), 'utf-8');
          const parsed = matter(raw);
          const data = parsed.data;
          // MDX: drop import/export lines and capitalised component tags — agents get prose only.
          const content = file.endsWith('.mdx')
            ? parsed.content
                .replace(/^(import|export)\s.*$/gm, '')
                .replace(/<([A-Z][\w.]*)\b[^>]*\/>/gs, '')
                .replace(/<([A-Z][\w.]*)\b[^>]*>[\s\S]*?<\/\1>/g, '')
                .replace(/\n{3,}/g, '\n\n')
            : parsed.content;

          // Skip drafts
          if (data.draft) continue;

          // Route slug: frontmatter slug, else the filename (matches Astro's p.slug)
          const slug = (typeof data.slug === 'string' && data.slug.trim()) || file.replace(/\.mdx?$/, '');
          if (!/^[A-Za-z0-9._~-]+$/.test(slug)) {
            logger.warn(`Unsafe slug in ${file}, skipping`);
            continue;
          }

          // Format the pubDate
          const pubDate = data.pubDate
            ? new Date(data.pubDate).toISOString().split('T')[0]
            : 'unknown';

          // Build clean frontmatter for agent consumption
          const agentFrontmatter = [
            '---',
            `title: "${(data.title || '').replace(/"/g, '\\"')}"`,
            `date: ${pubDate}`,
            data.description ? `description: "${String(data.description).replace(/"/g, '\\"').replace(/\n/g, ' ').trim()}"` : null,
            data.categories?.length ? `categories: [${data.categories.map((c: string) => `"${c}"`).join(', ')}]` : null,
            data.tags?.length ? `tags: [${data.tags.map((t: string) => `"${t}"`).join(', ')}]` : null,
            `author: "Matthew Williamson"`,
            data.series ? `series: "${String(data.series).replace(/"/g, '\\"')}"` : null,
            `url: https://hologramthoughts.com/blog/${slug}/`,
            '---',
          ].filter(Boolean).join('\n');

          const markdown = `${agentFrontmatter}\n\n# ${data.title}\n\n${content.trim()}\n`;

          // Write to dist/blog/[slug]/index.md
          const outPath = path.join(outDir, 'blog', slug, 'index.md');
          const outDirPath = path.dirname(outPath);

          // The HTML directory should already exist from the Astro build
          if (!fs.existsSync(outDirPath)) {
            fs.mkdirSync(outDirPath, { recursive: true });
          }

          fs.writeFileSync(outPath, markdown, 'utf-8');
          count++;
        }

        logger.info(`Generated ${count} markdown files for agents`);
      },
    },
  };
}
