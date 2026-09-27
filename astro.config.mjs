// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import tailwind from '@tailwindcss/vite';
import { remarkReadingTime } from './src/utils/reading-time.mjs';
import { remarkEnhanceFrontmatter } from './src/utils/enhance-frontmatter.mjs';
import { rehypeDropEmptyParagraphs } from './src/utils/rehype-drop-empty.mjs';
import remarkSmartypants from 'remark-smartypants';
import rehypePrettyCode from 'rehype-pretty-code';
import remarkToc from 'remark-toc';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { markdownForAgents } from './src/integrations/markdown-for-agents.ts';
import { emitThemeIndex } from './src/integrations/emit-theme-index.ts';
import matter from 'gray-matter';
import fs from 'node:fs';

// Sitemap <lastmod> for posts, from frontmatter pubDate.
const postDates = new Map();
for (const file of fs.readdirSync('src/content/blog').filter((f) => /\.mdx?$/.test(f))) {
  const { data } = matter(fs.readFileSync(`src/content/blog/${file}`, 'utf8'));
  if (data.draft || !data.pubDate) continue;
  const slug = (typeof data.slug === 'string' && data.slug.trim()) || file.replace(/\.mdx?$/, '');
  postDates.set(`https://hologramthoughts.com/blog/${slug}/`, new Date(data.pubDate).toISOString());
}

// https://astro.build/config
export default defineConfig({
  site: 'https://hologramthoughts.com',
  integrations: [sitemap({
    filter: (page) => !page.includes('/og/') && !page.endsWith('/404/') && !page.endsWith('/random/'),
    serialize: (item) => {
      const d = postDates.get(item.url);
      if (d) item.lastmod = d;
      return item;
    },
  }), svelte(), mdx(), markdownForAgents(), emitThemeIndex()],
  vite: { plugins: [tailwind()] },
  devToolbar: {
    enabled: false
  },
  markdown: {
    remarkPlugins: [
      remarkReadingTime,
      remarkEnhanceFrontmatter,
      [remarkSmartypants, {
        quotes: true,
        ellipses: true,
        backticks: true,
        dashes: 'oldschool'
      }],
      [remarkToc, {
        heading: 'contents|table[ -]of[ -]contents?',
        maxDepth: 4,
        tight: true
      }]
    ],
    rehypePlugins: [
      rehypeDropEmptyParagraphs,
      rehypeSlug,
      [rehypeAutolinkHeadings, {
        behavior: 'prepend',
        properties: {
          className: ['heading-link'],
          ariaLabel: 'Link to this heading'
        },
        content: {
          type: 'text',
          value: '#'
        }
      }],
      [rehypePrettyCode, {
        theme: 'tokyo-night',
        keepBackground: false
      }]
    ]
  }
});
