# Hologram Thoughts - Astro Blog

## Project

Static blog at hologramthoughts.com — spiritual, philosophical, and creative writing. Migrated from WordPress (279 posts, 2006–2025). Built with Astro 5.

## Stack

- **Framework**: Astro 5 (static output)
- **Content**: Markdown in `src/content/blog/`, Zod schema in `src/content/config.ts`
- **Search**: Pagefind (astro-pagefind integration)
- **Hosting**: Cloudflare Pages
- **Typography**: Cormorant SC (headings/small caps) + Cormorant Garamond (titles/lists) + IM Fell DW Pica (body text)

## Design System — Parchment Reader

The site uses a "parchment reader" theme with a book-like reading experience:

- **CSS custom properties** for all colors — defined in `Layout.astro` under `html[data-theme="light"]` and `html[data-theme="dark"]`
- **Key tokens**: `--ink`, `--ink-light`, `--ink-faint`, `--page`, `--shell`, `--accent`, `--border`, `--code-bg`, `--toc-bg`
- **Dark/light mode**: Toggle in header, persisted to `localStorage`, read before paint to prevent FOUC
- **Visual effects**: Grain texture overlay (`body::before`), vignette (`body::after`)
- **ReaderShell component**: Book-like `max-width: 64ch` container used on all pages
- **Blog post features**: Drop cap on first paragraph, ornamental `<hr>` dividers (§), end mark (✦), justified text with hyphenation, reading progress bar

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
- All colors use CSS variables — never hardcode hex values in component styles

## Components

- `ReaderShell.astro` — Book-like parchment container (wraps all page content)
- `ThemeToggle.astro` — Sun/moon toggle button for dark/light mode
- `ReadingProgress.astro` — Fixed scroll progress bar (blog posts only)
- `SiteHeader.astro` — Sticky bar with wordmark + nav + theme toggle
- `SiteFooter.astro` — Copyright + links
- `TableOfContents.astro` — Auto-generated from headings (shown when 2+ headings)

## Custom Remark Plugins

- `src/utils/reading-time.mjs` — adds reading time to frontmatter
- `src/utils/enhance-frontmatter.mjs` — auto-generates descriptions, content types, complexity scores

## Environment Note

npm may need: `export PATH="/opt/homebrew/bin:$PATH"`
