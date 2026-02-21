# Hologram Thoughts - Astro Blog

## Project

Static blog at hologramthoughts.com — spiritual, philosophical, and creative writing. Migrated from WordPress (279 posts, 2006–2025). Built with Astro 5.

## Stack

- **Framework**: Astro 5 (static output)
- **Content**: Markdown in `src/content/blog/`, Zod schema in `src/content/config.ts`
- **Search**: Pagefind (astro-pagefind integration)
- **Hosting**: Cloudflare Pages
- **Typography**: Crimson Text (headings) + Inter (body)

## Commands

```sh
npm run dev       # Local dev server
npm run build     # Build to ./dist
npm run preview   # Preview production build
```

## Deployment

Deployed to Cloudflare Pages via Wrangler CLI:

```sh
npm run build
npx wrangler pages deploy ./dist --project-name=hologramthoughts
```

The `wrangler.toml` sets `pages_build_output_dir = "./dist"`.

Domain: hologramthoughts.com (configured in Cloudflare dashboard).

## Key Conventions

- Link to posts using `post.slug` (from frontmatter), not generated slugs
- Categories are hardcoded: Dharma Writings, Creative Writing, Consciousness & Philosophy, Practice & Inner Life, Other
- Filter drafts on all pages: `getCollection('blog', ({ data }) => !data.draft)`
- Archive lives at `/archive/[...page].astro` to avoid route conflicts with `/blog/[slug].astro`

## Custom Remark Plugins

- `src/utils/reading-time.mjs` — adds reading time to frontmatter
- `src/utils/enhance-frontmatter.mjs` — auto-generates descriptions, content types, complexity scores

## Environment Note

npm may need: `export PATH="/opt/homebrew/bin:$PATH"`
