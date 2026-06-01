# Design — Homepage chips, `/how` page, SEO/AEO sweep

**Date:** 2026-06-01
**Author:** Matthew Williamson (with Claude)
**Status:** Approved for planning

## Overview

Three related changes to hologramthoughts.com:

1. **Homepage:** remove the large `Recent` section; add theme chips to the compact `Latest` column to conserve vertical space.
2. **`/how`:** a new colophon page, authored in Matthew's voice, explaining the cast behind the site (Athena, Muse, Claude) and the human-vs-machine provenance line — written for humans *and* AI agents, with a hard security boundary against infrastructure disclosure.
3. **SEO/AEO:** add JSON-LD structured data (currently absent), polish meta tags, welcome AI crawlers in `robots.txt`, and give every page a unique description.

All Muse/LLM/frontmatter content continues to route through Astro `{}` auto-escaping or `renderSynthesis()`. No new `set:html` sinks except controlled JSON-LD (see Security).

---

## Workstream 1 — Homepage

### Goal
Shorter homepage. Kill the `Recent` PostCard list (lines ~115–123 of `src/pages/index.astro`) and its supporting computation (`featured`, `themeIdsBySlug`, ~lines 82–93). Surface theme chips in the `Latest` column instead.

### Latest column — Option B (chosen)
Per item: title (spore-gold link) → one line containing **up to 2 theme chips inline, followed by the publication date in muted ink**. Chips never wrap (cap of 2 keeps the narrow 1/3-width column clean). Date format stays `MMM YYYY`.

Example line: `[Nature] [Spirituality] · Apr 2026`

### Files & changes

**`src/pages/index.astro`**
- Remove the `Recent` `<section>` and the `featured` / `themeIdsBySlug` block.
- Keep `PostCard` import only if still used elsewhere on the page (it is not after removal) — remove the import.
- Build a `themeIdsByLatestSlug: Record<string, string[]>` for the Latest posts (same sidecar-import pattern already used for `featured`), keyed by **URL slug** (`slugOf(p)`), looked up by **sidecar key** (`p.data.slug ?? p.slug ?? id-base`) per the §11 multi-key gotcha.
- Pass `themeIdsBySlug={themeIdsByLatestSlug}` into `<MuseHighlight>`.

**`src/components/MuseHighlight.astro`**
- Add `themeIdsBySlug: Record<string, string[]>` to `Props`.
- In the Latest `<li>`, after the title, render a flex row: up to 2 chips (via `ThemeChip`) + the date as a trailing muted span (`· {date}`).
- Resolve each chip's display name from `taxonomy.json` (import it, build an `id → name` map). Render via `ThemeChip` so the existing `data-theme` → `ThemeDrawer` click-through keeps working.
- Chip styling: smaller than PostCard chips (`text-[10px]`, tighter padding) to fit the column. Keep the moss-dot `::before`.

### Data flow
`index.astro` (latest slugs + per-slug themeIds) → `MuseHighlight` (renders Latest list with chips) → `ThemeChip` (`data-theme`) → `ThemeDrawer.svelte` (existing global click listener; unchanged).

### Notes / gotchas
- URL generation uses `p.slug` (matches `getStaticPaths`); sidecar lookup uses the multi-key resolution. Do not regress this.
- No change to Threads or Stories columns.

---

## Workstream 2 — `/how` page

### File
`src/pages/how.astro` (static route → `/how/`). Uses `Layout` with a unique title + description and `ogType="website"`.

### Voice & cast
First person, Matthew. Literary but structured (Option B). The page states plainly: *every post is human-written; the connective tissue is machine-made and labeled.*

Cast cards (each: role label, name, what it does, a "Does not" line):

- **Athena** — "An AI persona I built and collaborate with across many things. I write to her so she understands me better." *Does not: touch the blog — no posts, no curation.*
- **Muse** — "The curator. She names the themes, writes the blurbs and synthesis, and draws the paths between pieces." *Does not: write the essays. Build-time only — no chat, no live AI, nothing to talk to.*
- **Claude** — "The engine. Moved this off WordPress to Astro in 2025, builds the site, runs Muse at build time." *Does not: author content or speak in my voice.*

### Sections (top → bottom)
1. Eyebrow "Colophon" + prismatic H1 (e.g. "How this gets made").
2. Lede (2–3 sentences, Matthew's voice).
3. Three cast cards (membrane/`.castcard` styling, tokens only).
4. Provenance split — two columns: **Mine (human)** = every post, final say on all Muse text, muse-picks · **Machine** = themes, blurbs, synthesis, related-post rationale.
5. Timeline — static (hand-coded) → WordPress (years) → Astro (2025, Claude) → automated (2026, Muse).
6. Agent note — small monospace block: every page available at `?format=md`, index at `/agent-index.md`, machine-generated text is labeled, posts are human.

### Copy
Author-written by Claude in Matthew's voice, committed as static markup (no LLM at build, no `set:html`). Matthew hand-reviews before commit. Plain Astro `{}` / static elements → auto-escaped.

### Link placement
**Footer** (`SiteFooter.astro`) as a colophon link ("how this is made" → `/how/`). Not added to the header nav.

### Security boundary (HARD)
No infrastructure, hardware, hosting, or repo names. Specifically **excluded**: Mac Mini, `athena-agent`/`athena-brain`, Cloudflare, wrangler/relay mechanics, model IDs tied to internal setup, deploy details. Athena is described purely conceptually. The page may state the *positive* security fact: the deployed site makes zero runtime LLM calls and has no chat/abuse surface.

### Styling
Reuse `.membrane`, prismatic wordmark class, tokens from `tokens.css`. No hardcoded hex. Honor reduced-motion (no new motion needed).

---

## Workstream 3 — SEO/AEO

### 3a. JSON-LD structured data (primary lever)
New `src/components/JsonLd.astro`: accepts an object (or array of objects), emits `<script type="application/ld+json">` with every `<` in the JSON replaced by the literal Unicode escape `<` (valid inside JSON, and the only correct escape inside a `<script>` since HTML entities are not decoded in script context) to prevent `</script>` breakout from any title/description value.

`Layout.astro` gains an optional `jsonLd?: object | object[]` prop, rendered in `<head>` when present.

Per-page schema:
- **Site-wide (Layout default, every page):** `WebSite` (name, url, description, `potentialAction` → `SearchAction` at `/search?q={query}`) + `Person` (Matthew Williamson, `url` = site, `sameAs` omitted for now). Emitted as a `@graph` array.
- **Blog posts (`blog/[slug].astro`):** `BlogPosting` — `headline`, `description`, `datePublished`, `author` (Person Matthew), `publisher` (Person/Organization), `image` (og image), `keywords` (tags), `articleSection` (categories), `wordCount`, `timeRequired` (ISO 8601 from readingTime), `inLanguage: en`, `mainEntityOfPage` (canonical). Plus `BreadcrumbList`: Home › Blog › {title}.
- **Theme pages (`themes/[id].astro`):** `CollectionPage` + `ItemList` of the theme's posts (position, url, name).
- **`/how`:** `AboutPage` with `author` Person.

### 3b. Meta polish (`Layout.astro`)
- `og:image:width` 1200, `og:image:height` 630, `og:image:alt`.
- `twitter:image:alt`.
- `og:locale` en_US.
- `<meta name="robots" content="index,follow">`.
- Keep existing canonical/RSS/markdown-alternate. **Skip** `twitter:creator` (no handle yet).

### 3c. `robots.txt` (`public/robots.txt`)
Keep `User-agent: * / Allow: /` + sitemap. Add explicit allow blocks for AI crawlers (intent signal — the site *wants* agent traffic): `ClaudeBot`, `GPTBot`, `Google-Extended`, `PerplexityBot`, `CCBot`, `Applebot-Extended`, `Bytespider` (allow). Add a comment pointing agents to `/agent-index.md`.

### 3d. Per-page descriptions
Pass a unique, hand-written `description` to `Layout` from: `index.astro`, `archive/[...page].astro`, `themes/index.astro`, `themes/[id].astro` (use the theme blurb), `search.astro`, `how.astro`, `404.astro`. Posts already pass one.

### Out of scope (YAGNI)
FAQ/HowTo/Video schema, i18n/hreflang, AMP, Organization logo schema beyond Person, `sameAs` social profiles.

---

## Security considerations (consolidated)
- **JSON-LD breakout:** all JSON-LD serialized with `<` replaced by `<`. Values originate from frontmatter (author-controlled) but escaped defensively regardless.
- **No new `set:html`** except `JsonLd.astro` (controlled, escaped). `/how` copy is static author markup via auto-escaped `{}`.
- **`/how` infra wall:** no hardware/hosting/repo names (see Workstream 2).
- Existing `renderSynthesis()` / `isSafeSlug` / sanitize rules untouched.

## Testing / verification
- `npm run build` clean; `npm test` (sanitize tests still pass).
- New post-build checks: `/how/` renders (200), footer link present, JSON-LD present + valid JSON on home + a post + a theme + `/how` (parse each `ld+json` block), `og:image:width` present, `robots.txt` has AI-crawler lines.
- Homepage: `Recent` gone, Latest items show ≤2 chips + date, chips open the drawer.
- Validate one BlogPosting against schema.org expectations (required fields present).
- Local preview walk before deploy (per §5 gate 6). Deploy only on explicit go-ahead.

## Build sequence (for the plan)
1. SEO/AEO scaffolding (`JsonLd.astro`, Layout `jsonLd` + meta) — foundational, no visible change.
2. Per-page descriptions + per-page JSON-LD.
3. Homepage Latest chips + remove Recent.
4. `/how` page + footer link.
5. `robots.txt`.
6. Verify, hand-review `/how` copy, deploy on approval.
