// @ts-check
import { defineConfig } from 'astro/config';
import pagefind from 'astro-pagefind';
import sitemap from '@astrojs/sitemap';
import { remarkReadingTime } from './src/utils/reading-time.mjs';
import { remarkEnhanceFrontmatter } from './src/utils/enhance-frontmatter.mjs';
import remarkSmartypants from 'remark-smartypants';
import rehypePrettyCode from 'rehype-pretty-code';
import remarkToc from 'remark-toc';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// https://astro.build/config
export default defineConfig({
  site: 'https://hologramthoughts.com',
  integrations: [pagefind(), sitemap()],
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
        theme: 'github-light',
        keepBackground: false
      }]
    ]
  }
});
