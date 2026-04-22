# Hologram Thoughts - Astro Blog

**Author: Matthew Williamson** — used in `article:author` meta, OG image, and any byline references. Never truncate to "Matt Williams".

## Project

Static blog at hologramthoughts.com — spiritual, philosophical, and creative writing. Migrated from WordPress (279 posts, 2006–2025). Built with Astro 5.

## Stack

- **Framework**: Astro 5 (static output)
- **Content**: Markdown in `src/content/blog/`, Zod schema in `src/content/config.ts`
- **Search**: Client-side search (custom, in `search.astro`)
- **Hosting**: Cloudflare Pages
- **Typography**:
  - **Fraunces** — display serif. Used for the site wordmark, post titles, page titles, section headings, eyebrows. Variable axes (opsz, wght, SOFT, WONK). Set with `font-variation-settings` for per-context warmth.
  - **Newsreader** — body serif. Used for all long-form prose, UI text, metadata, navigation, paragraphs, lists, blockquotes. Designed by Production Type for on-screen reading. Variable (opsz, wght, ital).
  - **Space Mono** — mono, code only (`<code>`, `<pre>`). Not used for UI anywhere else.

## Design System — Parchment & Lamplight

The site is a literary publication. A warm palette, generous measure, and confident typography — meant to feel like a well-made book, not a terminal. No CRT chrome, no shell prompts, no `→` nav prefix. The reader is the audience; the typography is the room.

### Palette

All colors defined as CSS custom properties in `Layout.astro`:

| Token | Dark (lamplight on paper) | Light (paper in sun) | Role |
|---|---|---|---|
| `--bg` | `#1a1713` | `#f5efe2` | Page background |
| `--bg-soft` | `#201c17` | `#ede6d5` | Inset backgrounds |
| `--fg` | `#e8dcc4` | `#2a211a` | Body text |
| `--fg-dim` | `#9d8e73` | `#6a5b47` | Secondary text |
| `--fg-bright` | `#f5ead2` | `#1a130d` | Titles, emphasis |
| `--accent` | `#c8956d` (copper) | `#8b3a1a` (oxblood) | Links, accent, drop cap |
| `--accent-hover` | `#d9a87d` | `#6b2c12` | Hover |
| `--border` | `#2e2822` | `#e4d8c2` | Strong rules |
| `--rule` | `#3b3328` | `#d4c7ac` | Soft section dividers |
| `--muted` | `#6a5d48` | `#a39373` | Dates, metadata, eyebrows |
| `--code-bg` | `#221d17` | `#ede4d1` | Code blocks |
| `--selection` | copper @ 28% | oxblood @ 18% | Selection |

### Typography tokens

| Token | Value | Use |
|---|---|---|
| `--font-display` | Fraunces, Source Serif 4, Georgia | Titles, headings, eyebrows, wordmark |
| `--font-body` | Newsreader, Source Serif 4, Georgia | Prose, UI, metadata |
| `--font-mono` | Space Mono, IBM Plex Mono | Code only |
| `--measure` | `38rem` | Reading column (~65 chars of serif at body size) |
| `--measure-wide` | `48rem` | Listings, page max-width |
| `--size-body` | `clamp(1.0625rem, 0.95rem + 0.45vw, 1.25rem)` | Fluid reading size |

### Key design elements

- **Container**: `.page` — `max-width: var(--measure-wide)` (48rem), horizontal padding fluid
- **Reading column**: `.post`, `.home`, `.archive`, `.search`, `.categories` — `max-width: var(--measure)` (38rem) centered. Everything the reader reads sits inside this measure.
- **Header**: ☸ dharma wheel + wordmark left ("Hologram Thoughts" in Fraunces), tagline "ideas last forever" italic underneath, right-aligned nav: `archive / categories / search / feed` + theme toggle. Single `border-bottom` rule.
- **Post header**: eyebrow (category in all-caps tracked small caps) → large Fraunces title (up to 3.25rem, variable opsz 144, SOFT 40) → optional italic dek (from `description`) → small byline (date · reading time · series).
- **Drop cap**: first paragraph of every post. Fraunces, 4.5em, accent color, floated left. Scales down to 3.5em under 30rem viewport.
- **End mark**: `✦` centered at 1.25rem, accent color at 65% opacity, marks the end of prose.
- **Section breaks in prose**: `<hr>` renders as `· · ·` centered, tracked, muted.
- **Post nav**: previous / next side-by-side in the measure column at the bottom of each post. Italic eyebrow direction, Fraunces title.
- **Light default**: new visitors land on light; saved preference respected via `localStorage`, FOUC-prevented with an inline script in `<head>`.

### Variable font settings

Fraunces is set with explicit `font-variation-settings` per context:
- **Wordmark (header)**: `"opsz" 144, "SOFT" 30` — cold, big
- **Featured / post title**: `"opsz" 144, "SOFT" 40` — warm, big
- **Page titles**: `"opsz" 96, "SOFT" 40`
- **Section headings (inside posts)**: `"opsz" 72, "SOFT" 50` — softer at mid-size
- **Post-list titles**: `"opsz" 48, "SOFT" 40`
- **Eyebrows**: `"opsz" 36, "SOFT" 30` — crisp for small-caps tracking
- **Drop cap**: `"opsz" 144, "SOFT" 50, "wght" 500`

### DO NOT

- Hardcode hex colors in component `<style>` blocks — use the CSS variables
- Use Space Mono outside of `code` / `pre` / programmatic IDs. It is the code voice, not the UI voice.
- Revive terminal chrome (shell prompts, `→ link` nav prefixes, CRT scanlines, `#` heading prefix glyphs, `matt@samsara:~/dharma →` PS1, `read DHARMA.md` framing, `ls -lt posts/` command framing). That aesthetic is retired.
- Add bare `#rrggbb` to a scoped `<style>` block. If you need a new color, add a token.
- Use emojis as icons. SVG only.

### Reading column

Post body prose is centered in `var(--measure)` (38rem, ≈65 characters of Newsreader at `var(--size-body)`). Line height is `1.75` for prose, `1.7` elsewhere. Post-body paragraphs get `text-wrap: pretty` (prevents orphans) and `hanging-punctuation: first last`. Headings in posts get `text-wrap: balance`. OpenType features: `"kern", "liga", "onum" 1` (old-style numerals for warmer body feel).

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
- Every page wraps its content in `<div class="page">` (from `Layout.astro` globals — 48rem max-width container with fluid horizontal padding). Inner reading content (post body, homepage feed, archive, category listings, search) is further constrained to `var(--measure)` (38rem).

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
