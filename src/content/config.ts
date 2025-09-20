import { z, defineCollection } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string().optional(),
    categories: z.array(z.string()).default(['uncategorized']),
    tags: z.array(z.string()).default([]),
    slug: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    contentType: z.enum(['story', 'poetry', 'guide', 'reflection', 'article']).optional(),
    // Enhanced frontmatter fields (added automatically by plugin)
    readingTime: z.number().optional(),
    wordCount: z.number().optional(),
    pubYear: z.number().optional(),
    pubMonth: z.number().optional(),
    complexity: z.object({
      headings: z.number(),
      paragraphs: z.number(),
      codeBlocks: z.number(),
      lists: z.number(),
      score: z.number()
    }).optional()
  })
});

export const collections = { blog };
