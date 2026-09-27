# Reader Experience Overhaul — Design

**Date:** 2026-09-26
**Status:** Approved and implemented 2026-09-26
**Scope:** Site-wide UI/UX pass, even depth across reading and discovery pages.

## Intent

Make hologramthoughts.com easier and calmer to read and easier to move through, without changing its identity.

**Keep (non-negotiable):** TokyoNight dark palette and existing tokens; serif-for-reading / mono-for-chrome split; blinking terminal caret; homepage typewriter hero; syntax-colored metadata (`categoryColor()`, amber numbers); grain, CRT scanfield and data-packet atmosphere; print theme; reduced-motion support; static build with no runtime LLM; `renderSynthesis()` as the only raw-HTML sink; no `ClientRouter`.

**Success criteria:**
1. On every page at 390×844 and 1440×900, real content (post text, list rows, results) is visible in the first viewport.
2. Search with a query shows results in the first viewport.
3. Archive page height drops by more than half (~29,000px → ≤ 13,000px at 1440 wide).
4. No duplicated/truncated deck on migrated posts.
5. Any page: ⌘K / Ctrl-K / `/` opens a keyboard-operable search palette.
6. `npm run build` and `npm test` pass; no new console errors; reduced-motion honored.

## Observed problems (baseline, 2026-09-26)

- Each page opens with a large bordered hero card (post, archive, search, themes, categories). On mobile the post hero fills the whole first screen.
- Migrated posts show an auto excerpt as the italic deck, truncated mid-word, then repeat it as paragraph one.
- Desktop post: narrow column in a wide void; the decorative "20/26" aside and left rail add little; no persistent TOC for long essays.
- Post ending: related grid renders 2+1 with an orphan card; prev/next box is half empty when one side is missing; three stacked "go elsewhere" blocks.
- Homepage year strip shows 10 of the archive's years; "Selected paths" is a box inside a box; transit map labels only some stations, has no counts or keyboard access.
- Archive: one 299-row list at ~90px per row, no filtering.
- Search: results start below the fold.
- `⌘K` only focuses the input on `/search` or navigates there.

## Section 1 — Shared foundation

### Tokens (`src/styles/tokens.css`)
- Fluid type scale `--step--2` … `--step-5` using `clamp()`.
- Spacing scale `--space-3xs` … `--space-3xl`.
- Post title caps at ~4.5rem desktop, ~2.4rem at 390px.
- Existing token names and hues unchanged.

### New shared components
| Component | Purpose |
|---|---|
| `PageHeader.astro` | Kicker (mono), title (serif, slot-able for italic span), optional lede, optional stats row. No bordered card or grid backdrop. Target height 200–280px desktop. Used by archive, search, themes index, theme page, categories index/detail, how, 404. |
| `SectionLabel.astro` | Mono `// label` eyebrow with optional right-aligned aside. |
| `PostRow.astro` | Dense row (~48px): date (amber mono) · title (serif) · type · reading time; optional theme chips revealed on hover/focus. Used by archive, theme page, categories. Emits `data-*` attributes for client filtering. |
| `PostCard.astro` (refresh) | Adds excerpt line + reading time; keeps theme chips. |

Pages delete their bespoke hero/list CSS in favor of these.

### Atmosphere dial
- `Layout.astro` accepts `reading` prop → `<body data-reading>`.
- When `data-reading` and scrolled past the post header: `ParticleField` fades to ~30% opacity and `body::after` scanfield opacity drops to ~0.02, via a CSS class toggled by one IntersectionObserver. Restores near page end.
- `ParticleField` pauses its rAF loop when `document.hidden`.

### Header
- `SiteHeader.astro` gains a post mode: after the post title leaves the viewport, the header shows the post title (truncated) and a thin progress line along its bottom edge, plus "~N min left" at ≥ 900px.
- `ReadingProgress.astro` is removed.
- Mobile header gets a search button that opens the palette.

## Section 2 — Reading page (`src/pages/blog/[slug].astro`)

### Opening
- Breadcrumb `← archive / YYYY`, kicker (type, and "Part N of M" for series), title, meta line (date · N min read · N words), byline `author: "Matthew Williamson"` in syntax colors.
- At 390×844, the first paragraph is at least partly visible.

### Deck rule
Show `description` as the deck only if all hold:
- It is not a prefix of the body's normalized plain text (case/whitespace/punctuation-insensitive, first 60 chars).
- It does not end with `…` or `...`.
Logic lives in `src/utils/deck.ts` (pure, unit-tested). OG/meta description is unaffected.

### Layout
- Prose measure ~66ch, centered.
- Remove `.reading-aside` ("20/26").
- Reader toolbar under the meta line: category links (category colors) + text-size control (existing `ht-story-scale` localStorage behavior and inline pre-paint script preserved).
- TOC: when headings (h2/h3) ≥ 3 — sticky left rail at ≥ 1200px with active-section highlight (IntersectionObserver); below 1200px an inline `<details>` "Contents" disclosure above the body. Fewer than 3 headings: no TOC. `TableOfContents.astro` is rewritten accordingly.
- Poetry keeps display-serif mode, narrower measure.

### Typography
- Body ~1.2rem desktop / ~1.08rem mobile, line-height ~1.75, `text-wrap: pretty`, `hanging-punctuation: first`.
- Blockquotes stay inside the column at all widths.
- Images: centered, full measure width max, rounded, subtle border. No auto-captions (would need a rehype step that changes markup).
- Footnotes (`.footnotes`) styled small, with back-links.
- Headings keep magenta `//` marker and `scroll-margin-top` clearing the sticky header.

### Series
- Kicker shows "Part N of M · Series name".
- Collapsible parts list (`<details>`) under the header; current part highlighted.

### Ending (single block, in order)
1. End mark ◇.
2. Thread chips (`ThemeChipStrip`).
3. **Read next:** if in a series and a next part exists, a large primary card for it. Then related posts in a 3-column row (1 column < 720px) with rationale text. Never renders an orphaned 2+1 grid.
4. Older/newer as one compact row; a missing side collapses rather than leaving an empty cell.
5. "Browse all N entries".

## Section 3 — Discovery pages and palette

### Homepage (`src/pages/index.astro`)
- Keep typewriter hero + "Latest writing" panel; tighten vertical spacing.
- Year strip covers every year from first to latest post; empty years render faint; bar height proportional to count; horizontally scrollable on narrow screens.
- "Selected paths": remove outer panel; three columns with `SectionLabel`s.
- Transit map (`NetworkMap.svelte`): every station focusable; label + post count on hover/focus; arrow-key traversal between stations; "All 26 threads →" link below. Below 720px, render the thread list instead of the map.
- New optional `start_here:` array in `muse-picks.yaml` (post slugs). Rendered as a "Start here" row of 3–4 `PostCard`s. Empty/missing → first 4 entries of `stories`. `MusePicks` interface extended.

### Archive (`src/pages/archive/[...page].astro`)
- `PageHeader` with counts.
- Filter bar: type segmented control, category select, text filter. Client-side filtering over `PostRow` `data-*` attributes; state synced to URL query (`?type=poetry&cat=dharma-writings&q=...`). Year groups with zero visible rows hide; counts update. No-JS: full list renders.
- Sticky year-jump rail retained.
- Pure filter logic in `src/utils/archive-filter.ts`, unit-tested.

### Search (`src/pages/search.astro`)
- Compact header; input at top; results in first viewport.
- Keep type filters and sort.
- Highlight matched terms in excerpts (text nodes + `<mark>`, no `innerHTML` with unescaped content).
- Empty state: "Nothing found" + top thread links.

### Themes and categories
- Themes index: grid of thread cards — name, post count, blurb, year-span mini bar.
- Theme page: `PageHeader`, synthesis (still via `renderSynthesis()`), posts as `PostRow`s grouped by year.
- Categories index/detail: `PageHeader` + `PostRow` lists.

### Command palette (new)
- `src/components/CommandPalette.svelte`, mounted in `Layout.astro` with `client:idle`.
- Opens on ⌘K, Ctrl-K, `/` (not while typing in a field), or the header search button. On `/search`, ⌘K still focuses the page input.
- Data: `emit-theme-index.ts` also writes `dist/search-index.json` — `[{ t: title, u: url, d: ISO date, y: type, c: categories, th: themeIds, x: description }]`. Target ≤ 100KB. Fetched lazily on first open, cached in memory.
- Ranking: pure function in `src/utils/palette-rank.ts` — title prefix > title word > theme/category > description; ties by recency. Unit-tested.
- Static actions: Archive, Themes, each theme, Random post, RSS.
- Keyboard: ↑/↓, Enter, Esc; focus trapped; `role="dialog"`, `aria-modal`, listbox with `aria-activedescendant`; restores focus on close. Footer row: "Search full text for "…" →" → `/search?q=`.
- All rendering via Svelte interpolation (auto-escaped).
- Reduced motion: no open/close animation.

### Other
- 404 embeds an inline palette trigger + suggestions.
- Footer adds "random post" (`/random/` static page that picks client-side from the index; no-JS fallback links to archive).

## Out of scope
- Muse pipeline, taxonomy, sidecars, prompts.
- New fonts, palette changes, light theme.
- View transitions / SPA routing.
- `BlogPostLayout.astro` (legacy, unused) — left alone.
- Deploy. Nothing is deployed without explicit go-ahead.

## Testing
- Vitest: `deck.ts`, `archive-filter.ts`, `palette-rank.ts`; existing `sanitize-synthesis` tests keep passing.
- `npm run build` passes; spot-check `dist/search-index.json` size and `_redirects` unchanged.
- Playwright screenshots at 390×844 and 1440×900, before vs after: home; post (poem, 4,800-word essay, series part); archive (plain + filtered); search with query; themes index; a theme page.
- Manual checks: keyboard-only palette use; reduced-motion emulation; print preview of a post.

## Risks
- Large diff across many pages → implement in slices (foundation → post page → discovery → palette), each building and screenshotted before the next.
- Header post-mode + atmosphere dial add scroll listeners → use IntersectionObserver only, no scroll handlers.
