# Hologram Thoughts - Astro Blog

## Project

Static blog at hologramthoughts.com — spiritual, philosophical, and creative writing. Migrated from WordPress (279 posts, 2006–2025). Built with Astro 5.

## Stack

- **Framework**: Astro 5 (static output)
- **Content**: Markdown in `src/content/blog/`, Zod schema in `src/content/config.ts`
- **Search**: Client-side search (custom, in `search.astro`)
- **Hosting**: Cloudflare Pages
- **Typography**: Space Mono (Google Fonts) — monospace throughout

## Design System — Far Future Dharma Terminal

The site uses a terminal aesthetic rooted in a "far future dharma" concept: you're jacked into the dharma net, navigating teachings from a node called `samsara`. Inspired by (but deliberately distinct from) blog.rice.is — the footer credits the homage.

### Palette (dark default)

All colors via CSS custom properties defined in `Layout.astro`:

| Token | Dark | Light | Role |
|---|---|---|---|
| `--term-bg` | `#090b12` | `#f0f4ff` | Page background |
| `--term-fg` | `#c8d0e8` | `#1e2538` | Body text |
| `--term-fg-dim` | `#8892b0` | `#4a5568` | Muted text |
| `--term-fg-bright` | `#eef2ff` | `#090b12` | Emphasis |
| `--term-accent` | `#fbbf24` | `#d97706` | Electric saffron — headings, titles, links |
| `--term-green` | `#34d399` | `#059669` | PS1 username |
| `--term-border` | `#1e2538` | `#c8d0e8` | Borders |
| `--term-code-bg` | `#0d1020` | `#e4e9f7` | Code blocks, TOC |
| `--term-muted` | `#4a5568` | `#94a3b8` | Prompt symbols, markers |
| `--term-glow` | amber text-shadow | none | Holographic glow on accent elements |

### Key design elements

- **Terminal window**: `max-width: 72rem` container with subtle amber outer glow (`box-shadow`)
- **Titlebar**: `☸` dharma wheel left + `dharma://hologram.thoughts` centered + theme toggle right — no Mac-style dots
- **Nav prefix**: `→ link` (not `$ link`)
- **Shell session framing**: every page opens with a PS1 prompt — `matt@samsara:~/dharma →`
- **Commands**: `read ./slug.md` (posts), `ls -lt ~/dharma/posts/` (listings), `read DHARMA.md` (homepage README)
- **Markdown-as-HTML**: headings show `# `, `## `, `### ` prefixes via `::before` pseudo-elements in muted color; `>` on blockquotes; `---` on `<hr>`; `›` list bullets
- **Glow**: `text-shadow: var(--term-glow)` on headings, post titles, active nav — amber holographic effect
- **CRT scanlines**: `repeating-linear-gradient` overlay on `.terminal-window::after`
- **Dark default**: localStorage-persisted, FOUC-prevented with inline script
- **Post excerpts**: first ~160 chars of `post.body` with markdown stripped, shown in listings

### Prompt format

```
matt@samsara:~/dharma → read ./slug.md
```

- Username (`ps1-user`): `var(--term-green)`
- Directory (`ps1-dir`): `#818cf8` (indigo-violet)
- Arrow (`ps1-dollar`): `var(--term-muted)`

### DO NOT

- Hardcode hex colors in component `<style>` blocks — use CSS variables
- Use serif fonts anywhere — Space Mono only
- Add Mac-style colored dots to the titlebar
- Use `$` as the prompt terminator — use `→`

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
- `.terminal-main` padding is defined globally in `Layout.astro` (not in `ReaderShell.astro`) so it applies to all pages including `[slug].astro` which has its own wrapper div

## Content Series

Posts can belong to a named series using two frontmatter fields:

```yaml
series: 'The Emergence'
seriesOrder: 1
```

- Both fields are optional in `src/content/config.ts` (Zod schema)
- When a post has `series` set, `[slug].astro` replaces global date-based prev/next with series-scoped prev/next sorted by `seriesOrder`
- Nav labels change to `← previous` / `next →` for series posts (vs `← older` / `newer →` for standalone)
- Currently only "The Emergence" (parts 1–8) uses this system

## OpenGraph & Meta

`Layout.astro` accepts these optional props (all have sensible defaults):

| Prop | Type | Default |
|---|---|---|
| `description` | string | Site-level tagline |
| `ogType` | `'website' \| 'article'` | `'website'` |
| `ogImage` | string | `/og-image.png` |
| `publishedTime` | string (ISO 8601) | — |
| `tags` | string[] | `[]` |
| `canonicalUrl` | string | `https://hologramthoughts.com{pathname}` |

Blog posts (`[slug].astro`) pass `ogType="article"`, post description (from frontmatter or auto-excerpted from body), `publishedTime`, `tags`, and a clean canonical URL. A `<link rel="canonical">` is included on every page.

## Components

- `ReaderShell.astro` — Terminal main content wrapper (padding only, no background)
- `SiteHeader.astro` — Sticky terminal header: titlebar (☸ + site URL + toggle) + nav
- `SiteFooter.astro` — Terminal footer bar with copyright + nav + rice homage credit
- `ThemeToggle.astro` — Sun/moon SVG toggle, dark default
- `ReadingProgress.astro` — Fixed amber progress bar (blog posts only)
- `TableOfContents.astro` — Auto-generated from headings (shown when 2+ headings), terminal-styled

## Custom Remark Plugins

- `src/utils/reading-time.mjs` — adds reading time to frontmatter
- `src/utils/enhance-frontmatter.mjs` — auto-generates descriptions, content types, complexity scores

## Markdown for Agents

DIY implementation of Cloudflare's "Markdown for Agents" (which requires a paid plan). Lets AI agents request any blog post as clean markdown.

### How it works

1. **Build-time generation** (`src/integrations/markdown-for-agents.ts`): Astro integration that hooks into `astro:build:done` and writes a `.md` file for each non-draft post to `dist/blog/[slug]/index.md`. Uses `gray-matter` to parse the source markdown from `src/content/blog/`.

2. **Agent index** (`src/pages/agent-index.md.ts`): Static endpoint that generates a structured markdown index of all posts (title, date, URL, categories, tags) at `/agent-index.md`.

3. **Edge middleware** (`functions/_middleware.ts`): Cloudflare Pages Function that intercepts requests and serves markdown when:
   - `Accept: text/markdown` header is present, OR
   - `?format=md` query parameter is appended to the URL

4. **Discoverability**: Every page includes `<link rel="alternate" type="text/markdown">` in `<head>` and an HTML comment after `<body>` pointing agents to `?format=md` and `/agent-index.md`.

### Response headers on markdown responses

- `Content-Type: text/markdown; charset=utf-8`
- `x-markdown-tokens: <estimated token count>` (chars / 4)
- `Content-Signal: ai-input=yes, search=yes`
- `Cache-Control: public, max-age=3600`

### Key files

- `src/integrations/markdown-for-agents.ts` — Build-time .md file generator
- `src/pages/agent-index.md.ts` — Agent index endpoint
- `functions/_middleware.ts` — Cloudflare Pages edge middleware
- `functions/tsconfig.json` — TypeScript config for functions dir

### Testing

```sh
# Browser: append ?format=md to any post URL
# curl: use Accept header
curl -H "Accept: text/markdown" https://hologramthoughts.com/blog/the-holographic-universe/
curl https://hologramthoughts.com/agent-index.md
```

## Environment Note

npm may need: `export PATH="/opt/homebrew/bin:$PATH"`
