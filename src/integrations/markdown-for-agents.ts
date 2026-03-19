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

        const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
        let count = 0;

        for (const file of files) {
          const raw = fs.readFileSync(path.join(contentDir, file), 'utf-8');
          const { data, content } = matter(raw);

          // Skip drafts
          if (data.draft) continue;

          // Use the frontmatter slug (all posts have one)
          const slug = data.slug;
          if (!slug) {
            logger.warn(`No slug found in ${file}, skipping`);
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
            `url: /blog/${slug}/`,
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
