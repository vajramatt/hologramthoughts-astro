# Hologram Thoughts — Astro Blog

**Author:** Matthew Williamson — used in `article:author` meta, OG image, and any byline references. Never truncate to "Matt Williams".

**Site:** https://hologramthoughts.com (Cloudflare Pages, custom domain)
**Repo:** https://github.com/vajramatt/hologramthoughts-astro
**Default branch:** `main` — every push to main triggers Cloudflare auto-deploy via `wrangler pages deploy`. The local deploy command pushes directly; no PR flow.

---

## 1. What this site is

Static blog at hologramthoughts.com. 280+ markdown posts spanning 2006–2026 — spiritual, philosophical, creative writing, AI governance, dharma practice, fatherhood, code. Migrated from WordPress; current iteration is a full solarpunk + mycelium rebuild with a build-time curator persona called **Muse**.

The site has THREE faces:
1. **Standard reader UX** — homepage, archive, search, individual blog posts
2. **Muse editorial layer** — auto-generated themes, blurbs, synthesis, per-post related-posts with rationale, all in Muse's voice, all committed as static JSON before deploy
3. **Agent-readable layer** — Markdown-for-Agents middleware serves clean `.md` versions of every post

---

## 2. Stack

| Layer | Tech |
|---|---|
| Framework | Astro 5 (static SSG) |
| Content | Markdown in `src/content/blog/`, Zod schema in `src/content/config.ts` |
| Components | `.astro` + Svelte 5 islands (drawer, ambient field) |
| Styling | Tailwind 4 (`@tailwindcss/vite`) + custom OKLCH design tokens |
| Search | Custom client-side in-memory search (`search.astro`) — NOT pagefind despite `astro-pagefind` being installed |
| Hosting | Cloudflare Pages |
| Build-time LLM | Workers AI via local relay Worker (no API token, just `wrangler login`) |
| Default model | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| Embedding model | `@cf/baai/bge-base-en-v1.5` |
| Display font | Spectral (Google Fonts) |
| Body font | Newsreader (Google Fonts) |
| UI font | Inter Tight |
| Mono | JetBrains Mono |

---

## 3. Design system — Solarpunk + Mycelium

**Aesthetic concept:** technology as mycelium. Library that grew itself. Forest floor by default; canopy morning when toggled to light. Amber-on-deep-green, bioluminescent teal, mycelial violet. Subtle organic grain. One prismatic moment (the wordmark).

**TokyoNight is the only on-screen theme — there is no light/dark toggle.** The old "canopy morning" light palette is now PRINT-ONLY: a `@media print` block in `tokens.css` (+ print cleanup in `global.css`) renders a post as dark-ink-on-paper. `ThemeToggle.astro` and the FOUC theme script were removed; `<html>` never gets `data-theme`.

### Tokens (`src/styles/tokens.css`)

| Token | Role |
|---|---|
| `--color-bg` / `--color-bg-soft` | Page bg + soft variant (forest black-green on dark, parchment on light) |
| `--color-surface` / `--color-surface-soft` | Cards / panel surfaces |
| `--color-ink` / `--color-ink-soft` / `--color-ink-faint` | Text tiers |
| `--color-amber` / `--color-amber-bright` | Spore-gold accent — primary highlight, link color |
| `--color-magenta` | Secondary accent (TokyoNight magenta) |
| `--color-cyan` | Teal — hover/active state, focus ring |
| `--color-border` / `--color-border-strong` | Panel borders |
| `--font-display` / `--font-body` / `--font-ui` / `--font-mono` | Spectral / Newsreader / Inter Tight / JetBrains Mono |
| `--ease-grow` / `--ease-breathe` | Easings for organic motion |
| `--dur-fast` / `--dur-med` / `--dur-slow` / `--dur-breathe` | 220ms / 480ms / 900ms / 5400ms |
| `--prism` | 4-stop linear gradient (spore → teal → violet → spore) used by `.prismatic` class |

The `@media print` block overrides only the colors that change (to the paper palette); type/motion/prism stay constant.

**Syntax-highlight roles (IDE aesthetic).** The chrome is colored like an editor: numbers (dates, reading time, counts) use `--color-amber-bright` (orange); categories take a per-type hue via `categoryColor()` in `src/utils/category-color.ts` (magenta/green/cyan/blue). Tokens `--color-blue` / `--color-green` back this. Because Tailwind color utilities lose to unlayered `h1{}`/`a{}` rules in `global.css`, apply these via inline `style="color: var(--…)"`, not `text-[var(--…)]` classes.

### Reusable classes (`src/styles/global.css`)

- **`.prose`** — applied to blog-post bodies. Spectral blockquotes with spore-gold left border, moss dot bullets with soft glow, crystalline gold edge atop code blocks, gradient hr separators
- **`.panel`** — frosted glass surface (backdrop-blur + transparent bg)
- **`.glass`** — alias for `.panel` so legacy refs don't break. Was a `@apply` originally but Tailwind 4 doesn't allow `@apply` of custom classes; expanded to literal CSS
- **`.prismatic`** — 4-stop gradient with bg-clip text. Used on the hero `<h1>` on the homepage. Hover transitions `background-position` 0% → 100%
- **`.wordmark`** — the header logo: JetBrains Mono weight 500, TokyoNight blue→cyan→magenta→cyan→blue gradient clipped to text, continuously shimmering (`wordmark-flow` 8s linear infinite). Deliberately the same family treatment as the Athena (`✦ ATHENA`) and Izakaya sites
- **`.scanline`** — `--prism` background with `scanline-shift` keyframe (18-30s linear infinite hue drift)
- **`.skip-link`** — a11y skip-to-main link

### Atmospheric overlays

- **Body grain** — fixed SVG `feTurbulence` noise at `opacity: 0.035`, `mix-blend-mode: overlay`. Painted via `body::before`
- **CRT scanfield** — `body::after` paints fixed hairline horizontal raster lines (3px period) at `opacity: 0.05`. Static (no animation), hidden in print
- **Ambient data packets** — `ParticleField.svelte` paints ~8–16 packets on a fixed canvas (z-index 0): small glowing square heads traveling invisible circuit traces (straight runs, 45°/90° bends) with short fading trails. The ambient twin of the homepage transit map. Cyan dominant, blue/magenta/green accents, no gold (the solarpunk spore motes are gone). Movement is dt-clamped rAF. `prefers-reduced-motion` → empty canvas
- **Terminal caret** — `SiteHeader.astro` renders a blinking green block caret (with a soft neon glow) after the wordmark, CLI-style. Reduced-motion → steady (no blink). The old canopy-curve / mycelial-root SVGs were removed.
- **Typewriter hero** (`index.astro`) — the homepage opens as a Muse terminal session: a mono prompt line (`muse@hologram:~$ replay ./archive --era 2006..2026`) types itself, then the serif prismatic `<h1>` types under a large glowing green block caret that keeps blinking, then the subline/featured-note fade in. Full text ships in the HTML (SEO / no-JS); a ghost/overlay twin reserves layout so there's no CLS; the inline script is one elapsed-time event timeline driven by rAF + a timeout fallback (background/occluded tabs fast-forward instead of stalling). Skipped entirely under `prefers-reduced-motion`.
- **Hot-pink `::selection`** — selected text inverts to `--color-magenta-hot` on `--color-bg`
- **Footer sign-off** — faint mono `// end of transmission` line at the bottom of every page

### Reduced motion

Tokens have a `@media (prefers-reduced-motion: reduce)` block that clamps all animations/transitions to 0.01ms globally. Components that gate their own animation (ParticleField, the terminal caret) also honor reduced-motion. Always honor it; don't add motion that ignores this.

### Focus + a11y

- `*:focus-visible` rule: 2px bioluminescent outline, 3px offset
- Skip link: rendered as first body child, hidden off-screen until focused
- `<abbr title="...">` used for "MUSE" disclosure (dotted underline, hover reveals "Machine Underground Synthesis Editor")

### What this is NOT

- No `@apply` of custom non-utility classes (Tailwind 4 limitation)
- No `var(--color-moss*)`, `--color-sun*`, `--color-sky*`, `--color-bone*`, `--glass-*` — these were old solarpunk-pastel tokens, purged
- No `dharma://` framing or the old PS1 terminal-mysticism (that legacy aesthetic is dead). NOTE: a light IDE/CLI motif is now deliberate — the blinking terminal caret, `.scanline` gradient, and syntax-highlighted metadata are current, not legacy
- No `ClientRouter`/`ViewTransitions` — was tried, caused homepage HTML to be served at blog URLs; removed
- No runtime LLM calls in the deployed site

---

## 4. Muse — the editorial voice

**MUSE = Machine Underground Synthesis Editor** (revealed via `<abbr>` tooltips throughout the site).

Muse is a **build-time only** curator. She has no chat surface, no runtime Worker, no streaming endpoint. Everything she "says" is generated locally by the build scripts, committed to the repo, hand-reviewable, then shipped as static HTML/JSON. Visitors hit zero LLM endpoints. No abuse surface.

### Persona docs (`src/data/`)

- **`muse-soul.md`** — Identity, voice, stance. Verbatim from author. Title: *Muse — Soul*. Grounding sentence: *"Attention is the first act of love. Naming is the second. Everything else follows."* DO NOT edit without explicit instruction.
- **`matthew-bio.md`** — Frozen biographical sketch derived from the corpus by `scripts/03-derive-bio.ts`. Hand-reviewed. Updates only when re-run + re-reviewed.
- **`muse-build-prompts.md`** — Reference doc for the system prompts each build stage uses. Actual prompts live inline in the relevant `scripts/0*.ts` files.
- **`muse-picks.yaml`** — Matthew's hand to Muse. User-editable. See §6.

### What Muse produces (`src/content/themes/`)

- **`taxonomy.json`** — array of theme objects. Each has `id`, `name`, `blurb` (one Muse-voice sentence), `synthesis` (3-5 sentence Muse-voice paragraph with markdown links to posts), `postCount`. After the consolidation step, currently 26 themes.
- **`<slug>.json`** sidecars (one per post) — `{ slug, themeIds: string[], related: [{ slug, rationale }] x3 }`. The `rationale` is Muse-voice (max 16 words, concrete verb opener).

### Where Muse shows up in the UI

- **Homepage** — `MuseHighlight` block: "From Muse" eyebrow → "What's alive in the archive" → 3 columns (Latest / Threads / Stories). All driven by `muse-picks.yaml` with sensible fallbacks
- **Homepage hero** — Optional `featured_note` from picks renders as italic Muse-voice quote with spore-gold left border
- **Blog post bottom** — `ThemeChipStrip` + `RelatedPosts` ("If this landed, Muse suggests…"). Each related post has Muse rationale
- **Theme drawer** — Click any theme chip → side drawer with theme name + blurb + synthesis paragraph + chronological post list + link to full theme page
- **`/themes/`** — Index of all themes sorted by post count, blurb under each
- **`/themes/[id]/`** — Per-theme landing page: serif title, blurb, full synthesis paragraph, all posts chronologically
- **Footer** — "curated by Muse" with hover tooltip

### Voice rules (encoded in script system prompts)

- Plain prose. Short sentences when clear, long when the thought turns
- Name specific things — titles, years, names
- Never narrate retrieval ("let me check", "looking at the archive", "in this post")
- No affirmation openers
- Maximum one em-dash per output
- Don't italicize single words for emphasis
- Don't perform enthusiasm
- For blurbs: forbidden openers include "Matthew explores", "Matthew writes about", "exploration", "intersection", "delve", "journey"
- For rationale: forbidden openers include "Explores", "Discusses", "Continues", "Examines"
- Concrete-verb good openers: "Picks up", "Pushes", "Complicates", "Reverses", "Sharpens", "Doubles down", "Answers", "Contradicts"

When voice slips back to generic-AI patterns ("Matthew explores X and Y"), re-run the relevant stage with the tighter prompt. Both `04-write-theme-blurbs.ts` and `07-write-rationale.ts` support `--force-blurbs` / `--force` flags to overwrite existing output.

---

## 5. Build pipeline — running Muse

**Two terminals required.** The relay Worker holds the Workers AI binding (auth via `wrangler login` OAuth, no `CF_API_TOKEN` needed). Build scripts POST to it.

### First-time setup

```sh
npx wrangler login    # browser OAuth, one time
```

### Each pipeline run

**Terminal 1 — relay Worker (leave running):**
```sh
npm run muse:relay
# Internally: cd scripts/relay-worker && npx wrangler dev
# Listens on http://localhost:8787
# Hits real Workers AI (no local emulator exists for AI bindings)
```

**Terminal 2 — pipeline:**
```sh
npm run build:muse    # full pipeline, sequential
npm run build         # then static build
```

### Individual stages (idempotent; can resume / be re-run)

| Stage | Script | Input → Output | LLM | Cost |
|---|---|---|---|---|
| 1. tag | `01-tag-posts.ts` | posts → `.cache/proposed-tags.json` | Llama | ~$0 (Workers AI free tier likely covers) |
| 2. canonicalize | `02-canonicalize.ts` | `.cache/proposed-tags.json` → `src/content/themes/taxonomy.json` + per-slug sidecars | no | — |
| 2b. consolidate | `02b-consolidate-themes.ts` | raw taxonomy → merged 26-ish themes (one LLM consolidation pass) | Llama | ~$0 |
| 3. bio | `03-derive-bio.ts` | corpus → `src/data/matthew-bio.md` | Llama | ~$0 |
| 4. blurbs | `04-write-theme-blurbs.ts` | taxonomy + soul + bio → blurb + synthesis per theme | Llama | ~$0 |
| 5. embed | `05-embed-posts.ts` | posts → `.cache/embeddings.json` (~4MB) | bge-base | ~$0 |
| 6. related | `06-compute-related.ts` | embeddings → top-3 per post in sidecars (cosine) | no | — |
| 7. rationale | `07-write-rationale.ts` | sidecars + soul + bio → rationale per pair (~283×3 calls) | Llama | ~$0 |

**Flags:**
- `--limit N` on `01-tag-posts.ts` for smoke runs
- `--force-blurbs` / `--force-synthesis` on `04-write-theme-blurbs.ts` (re-run only blurbs OR only synthesis)
- `--only=<theme-id>` on `04` (test a single theme)
- `--force` on `07-write-rationale.ts` (rewrite existing rationale)
- `MUSE_MODEL=<id>` env var to override default model (e.g. external providers via AI Gateway — needs gateway setup with provider key)

**Caches in `.cache/`** (gitignored):
- `proposed-tags.json` — raw tag proposals; tagger resumes from here, skipping done slugs
- `embeddings.json` — vector cache; embed step recomputes everything but you can manually prune if a post is removed
- `theme-merges.json` — consolidation map from last `02b` run

### Hand-review gates (DO NOT SKIP)

1. **After `01+02`** — open `taxonomy.json`, look at sample sidecars, decide if tag prompt needs tweaking before consolidating
2. **After `02b`** — verify consolidated taxonomy makes sense; merged correctly
3. **After `03`** — open `matthew-bio.md`, correct errors, soften over-confident claims, redact anything to keep private. This file ships verbatim — quality matters
4. **After `04`** — read every `blurb` and `synthesis` in `taxonomy.json`. Edit any that drift into "Matthew explores X" pattern. This text is the most-visible Muse output
5. **After `07`** — spot-check 10 random sidecar `related[].rationale` entries. Edit howlers
6. **Before deploy** — full local preview walk

### Adding a new post

> **⚠️ DESTRUCTIVE-COMMAND WARNING — do NOT run these to add a post:**
> `build:canonicalize`, `build:consolidate`, `build:related`. They are **global regenerations**, not incremental:
> - `02-canonicalize` rebuilds the **raw 166-theme** taxonomy (wipes every blurb + synthesis) and overwrites **every** sidecar with `related: []` + raw themeIds.
> - `06-compute-related` blanks `related` + rationale on **every** sidecar.
>
> Running either throws away the curated 26-theme taxonomy and all ~850 hand-reviewed rationales, and forces a full re-review (gates #2/#4/#5). They are only for a deliberate from-scratch taxonomy rebuild. The curated taxonomy + sidecars are committed to git — if you nuke them, `git restore src/content/themes/` recovers everything.
>
> **These three stages are guarded** (`scripts/lib/guard.ts`): they abort with instructions if a curated taxonomy (non-empty blurbs) or hand-reviewed rationale is present. Pass `--force` (or use `npm run build:muse:force`) only for an intentional from-scratch rebuild.

Use this **incremental** flow instead (touches only the new post, preserves the curated taxonomy):

1. Drop the `.md` file in `src/content/blog/` with proper frontmatter (`title` + `pubDate` required; optional `slug`, `categories`, `tags`, `series`/`seriesOrder`, `contentType`). The LLM does NOT write frontmatter — you do; remark plugins auto-add `description`/`readingTime`/`wordCount`/`complexity`.
2. Make sure relay is running
3. `npm run build:tag` — resumes from cache, only new posts hit Llama (note: the merge-map remap in `.cache/theme-merges.json` won't map a new post's novel raw tags, so assign themeIds by hand in step 4b)
4. Add the new post incrementally — **do not** regenerate the corpus:
   - a. `npm run build:embed` — recomputes `.cache/embeddings.json` (safe; writes only the cache, no sidecars)
   - b. Hand-write `src/content/themes/<slug>.json` = `{ slug, themeIds: [...], related: [{slug, rationale: ''} × 3] }`. Pick `themeIds` by fit from the 26 in `taxonomy.json`; pick `related` as cosine top-3 (compute against the cache) or hand-pick. Leave `rationale: ''`.
   - c. `npm run build:rationale` — idempotent; fills ONLY the new empty pairs, skips all existing
   - d. Recompute `postCount` for every theme from the sidecars and write back into `taxonomy.json` (don't hand-edit counts). Spot-check the new rationale (gate #5).
5. Optionally re-run `04` if you want the new post mentioned in synthesis paragraphs (existing syntheses won't auto-include new posts)
6. `npm run build && npx wrangler pages deploy ./dist --project-name=hologramthoughts --branch=main`

---

## 6. `muse-picks.yaml` — feeding Muse

User-editable YAML at `src/data/muse-picks.yaml`. Overrides homepage defaults. Empty arrays = use defaults.

```yaml
# Stories column — single posts OR series groups
stories:
  - the-fire-between-us            # single post (frontmatter slug)
  - the-willow-and-the-river
  - series: 'The Emergence'         # auto-collects all posts with this frontmatter `series:`, sorted by seriesOrder, rendered in <details> expander

# Latest column — empty = 5 most recent
latest: []

# Threads column — empty = top-6 themes by postCount
threads:
  - spirituality
  - artificial-intelligence

# Italic Muse-voice note rendered on the hero (spore-gold left border)
featured_note: "This week I'm thinking about the line between presence and devotion."
```

The schema is enforced loosely in `src/pages/index.astro`. To add new picks fields:
1. Extend the `MusePicks` interface in `index.astro`
2. Read the new field
3. Either render directly or pass to `MuseHighlight.astro`

Rebuild + redeploy to apply. No LLM call needed for picks changes.

---

## 7. Relay Worker — local-only Workers AI proxy

`scripts/relay-worker/` is a minimal Cloudflare Worker that exists only on Matthew's laptop. Never deployed. Mirrors the pattern from athena-agent: holds the `[ai]` binding, exposes `POST /run { model, body }` → `env.AI.run(model, body)` → JSON response.

**Why:** Workers AI from a node script otherwise requires a `CF_API_TOKEN`. The relay lets you use `wrangler login` OAuth instead. No tokens to manage.

**Wrangler config:** `scripts/relay-worker/wrangler.toml` — only `[ai] binding = "AI"`. No routes, no domain, never deployed.

**Endpoints:**
- `GET /health` → `"ok"` (smoke test)
- `POST /run` → `{ model, body }` payload, returns Workers AI result JSON

**Build script client:** `scripts/lib/llm.ts` exports `chat()` (text-gen) and `embed()` (embeddings). Both POST to the relay. Have built-in retry on 5xx (wrangler dev sometimes restarts mid-request). Honor these env vars:
- `MUSE_RELAY_URL` (default `http://localhost:8787`)
- `MUSE_MODEL` (default `@cf/meta/llama-3.3-70b-instruct-fp8-fast`)
- `MUSE_EMBED_MODEL` (default `@cf/baai/bge-base-en-v1.5`)

The `chat()` helper handles two response shapes: when the model returns JSON-mode `response` as a parsed object (Llama 3.3 70B does this for JSON-asking prompts), the helper stringifies so callers can `JSON.parse` it.

---

## 8. Deploy

### Manual command (current flow)

```sh
npm run build
npx wrangler pages deploy ./dist --project-name=hologramthoughts --branch=main
git add -A && git commit -m "<msg>" && git push origin main
```

`--branch=main` deploys to the production alias. Cloudflare maps `hologramthoughts.com` to the latest `main` deployment.

### Cache invalidation gotcha

Cloudflare Pages keeps static HTML at the edge **even after the source file is deleted**. Two ways to invalidate:
1. Wait for natural TTL (slow)
2. Use the `KILLED_SLUGS` array in `src/integrations/emit-theme-index.ts` — emits `_redirects` rules that fire before the cached file is served. Add a slug, rebuild, redeploy, edge-cached version is bypassed by the redirect

### `_redirects` file (auto-generated)

The `emit-theme-index` integration writes `dist/_redirects` at every build. Contains:
1. **KILLED_SLUGS** redirects (`/blog/<slug>/ → /404 301`) — top of file so they win the match
2. **Legacy URL redirects** — for every post where the filename slug differs from the frontmatter slug, emits `/blog/<filename-slug>/ → /blog/<frontmatter-slug>/ 301`. Catches old date-prefixed URLs that used to work

The `KILLED_SLUGS` list currently contains `2041-nw-48th-street` (post Matthew deleted).

### Git lock-in

Direct commits to `main` only. No PRs. Force-push only when matching prod (`git push --force-with-lease`).

---

## 9. Component map

### Layouts (`src/layouts/`)
- **`Layout.astro`** — root shell. Manages `<head>` (meta, OG, Twitter, fonts), FOUC theme script (dark default), skip link, mounts `<ParticleField>`, `<SiteHeader>`, `<main>`, `<SiteFooter>`, `<ThemeDrawer>`
- **`BlogPostLayout.astro`** — legacy, mostly unused. The active blog post template is `src/pages/blog/[slug].astro`. Kept around for safety; mirrors the new pattern

### Components (`src/components/`)
- **`SiteHeader.astro`** — sticky frosted header. Mono shimmer-gradient wordmark (`.wordmark`, Athena/Izakaya family look) + blinking terminal caret. Nav (`home`, `archive`, `themes`, `search`). No theme toggle (TokyoNight-only)
- **`SiteFooter.astro`** — © line + nav + Muse attribution (static; the animated roots SVG was removed)
- **`ParticleField.svelte`** — fixed canvas, data packets on circuit traces (square heads, angular bends, fading trails). Reduced-motion gate
- **`ThemeDrawer.svelte`** — global click listener for `.theme-chip` elements. Opens side drawer with theme details fetched from `/themes/reverse-index.json` + `/themes/post-meta.json`
- **`ThemeChip.astro`** — single theme chip. `data-theme="<id>"` triggers drawer
- **`ThemeChipStrip.astro`** — chip strip rendered at end of blog posts (themes for this post)
- **`RelatedPosts.astro`** — "If this landed, Muse suggests" block. Renders sidecar `related[]`. **Critical**: uses multi-key `bySlug` map because sidecar slugs and Astro post slugs sometimes diverge (see Gotchas §11)
- **`PostCard.astro`** — listing card with date / title / excerpt / chip preview. Used on homepage Recent, archive, categories
- **`MuseHighlight.astro`** — 3-column block on homepage (Latest / Threads / Stories). Stories column supports series groups via `<details>` expander
- **`ReadingProgress.astro`** — fixed-position progress bar at top of blog posts. `scanline-shift` gradient animation
- **`TableOfContents.astro`** — auto-generated from headings, shown when 2+ exist. Glass card

### Pages (`src/pages/`)
- **`index.astro`** — homepage. Loads `muse-picks.yaml`, builds Latest/Stories/Threads, renders hero with `featured_note` if present, MuseHighlight, then 6 PostCards
- **`blog/[slug].astro`** — individual post. Loads sidecar JSON, renders prose body + ThemeChipStrip + RelatedPosts + prev/next nav (series-aware)
- **`archive/[...page].astro`** — paginated listing (Astro's `paginate()`)
- **`categories/index.astro`** + **`categories/[category].astro`** — category browse
- **`themes/index.astro`** — theme overview
- **`themes/[id].astro`** — per-theme landing. Renders synthesis with markdown link conversion (`[text](url)` → anchors). Sidesteps bare `https://hologram-thoughts.com` prefixes from Llama
- **`search.astro`** — custom in-memory search (NOT pagefind)
- **`404.astro`** — Muse-voice 404 ("This thread doesn't grow here")
- **`rss.xml.js`** — RSS feed
- **`agent-index.md.ts`** — agent-readable index of all posts

### Integrations (`src/integrations/`)
- **`markdown-for-agents.ts`** — emits `.md` version of each post to `dist/blog/<slug>/index.md`
- **`emit-theme-index.ts`** — emits `dist/themes/reverse-index.json`, `dist/themes/post-meta.json`, AND `dist/_redirects` (kill-list + legacy URL redirects)

### Edge functions (`functions/`)
- **`_middleware.ts`** — Cloudflare Pages Function. Intercepts requests. Serves the `.md` version when `Accept: text/markdown` OR `?format=md` is present. Otherwise passes through

---

## 10. Content conventions

### Frontmatter schema (`src/content/config.ts`)

```ts
{
  title: string,
  pubDate: Date,
  description?: string,
  categories?: string[],         // default: ['uncategorized']
  tags?: string[],
  slug?: string,                 // optional override; otherwise filename-based
  draft?: boolean,               // default: false
  featured?: boolean,
  series?: string,               // e.g. 'The Emergence'
  seriesOrder?: number,
  contentType?: 'story' | 'poetry' | 'guide' | 'reflection' | 'article',
  readingTime?: number,          // auto-added by remark plugin
  wordCount?: number,            // auto-added
  pubYear?: number, pubMonth?: number,
  complexity?: { ... }           // auto-added
}
```

### Filename convention

Most posts use `YYYY-MM-DD-<slug-words>.md`. Astro derives the post `slug` from the filename (without `.md`). Frontmatter `slug` overrides this and becomes the URL segment. URLs end up like `/blog/the-foo/` (not `/blog/2024-01-15-the-foo/`).

### Drafts

Always filter: `getCollection('blog', ({ data }) => !data.draft)`. Built-in.

### Categories

Currently hardcoded set: *Dharma Writings*, *Creative Writing*, *Consciousness & Philosophy*, *Practice & Inner Life*, *Other*. New categories work fine but break the category landing pages until those pages know about them.

### Series

```yaml
series: 'The Emergence'
seriesOrder: 1
```

When `series` is set, `[slug].astro` replaces global date-based prev/next with series-scoped prev/next sorted by `seriesOrder`. Nav labels become `← previous` / `next →`. Currently "The Emergence" has 9 entries (8 parts + NotebookLM podcast at order 9).

### Stories

Posts with `contentType: 'story'` automatically join the Stories column when `muse-picks.yaml` `stories: []` is empty. When the picks array is populated, it overrides.

---

## 11. Gotchas (read before debugging)

### Slug confusion — the most common bug

Three different "slugs" exist for a post:
1. **`data.slug`** — frontmatter `slug:` field (may be undefined; may be malformed YAML like `slug: >-`)
2. **`p.slug`** — Astro's derived slug (top-level on the collection entry). Usually filename without `.md`. Frontmatter `slug` overrides
3. **`p.id`** — Astro's id (filename including `.md`)

Muse sidecars (`src/content/themes/<slug>.json`) use `data.slug ?? filename-base` as their key. Astro routes (`/blog/<x>/`) use `p.slug`. These can DIVERGE when frontmatter `slug` is malformed.

**Rule:** Anywhere a `bySlug` Map is built for sidecar lookup, index by all three keys. Already done in `RelatedPosts`, `MuseHighlight`, `themes/[id].astro`, `index.astro`. If you add new sidecar-driven UI, follow the same pattern:

```ts
const bySlug = new Map<string, any>();
for (const p of all) {
  if (p.data.slug) bySlug.set(p.data.slug, p);
  if ((p as any).slug) bySlug.set((p as any).slug, p);
  bySlug.set(p.id.replace(/\.md$/, ''), p);
}
```

For URL generation, always use `p.slug` (matches `getStaticPaths`). For sidecar import, use `p.data.slug ?? p.slug ?? p.id.replace(/\.md$/, '')`.

### Tailwind 4: `@apply` of custom classes

Tailwind 4 doesn't allow `@apply .my-custom-class`. Only utility classes work. If you need composition, expand literally:
```css
/* bad */ .foo { @apply panel; }
/* good */ .foo { background: var(--panel-bg); backdrop-filter: blur(var(--panel-blur)); /* ... */ }
```

### Cloudflare Pages edge cache vs deleted files

When you delete a post and redeploy, the edge may keep serving the stale HTML for a long time. Always add the slug to `KILLED_SLUGS` in `src/integrations/emit-theme-index.ts` to force a 301 → /404 that beats the cache.

### View transitions are NOT enabled

The site previously had `<ClientRouter />` (Astro view transitions). Caused homepage HTML to be served at blog URLs because the SPA-style interception conflicted with static routes. Removed. Theme toggle inline script also wouldn't re-bind across SPA navigations. **Do not re-enable without solving both problems first.**

### Posts with empty frontmatter slug

Several legacy posts have `slug: >-` (YAML folded-block syntax for empty/next-line scalar). These end up with NO `data.slug`, so the build falls back to filename. Multi-key bySlug fixes lookups, but be aware these posts have URLs like `/blog/2013-08-22-foo/` (date-prefixed), and a `_redirects` rule would fail to generate for them (filename matches the route).

### Workers AI JSON-mode response shape

Llama 3.3 70B auto-parses JSON when the prompt asks for JSON. The Workers AI response field `response` is an OBJECT, not a string. `scripts/lib/llm.ts` stringifies in this case so caller `JSON.parse` still works. If a new model is plugged in, verify the response shape.

### Wrangler dev restarts mid-request

`wrangler dev` reloads the Worker periodically, dropping in-flight requests with a 503. `callRelay` in `scripts/lib/llm.ts` retries 5xx up to 5 times with backoff. Long batches (rationale, tagging) may print one or two retry lines — normal.

### zsh `#` is not a comment by default

Avoid copy-pasting multi-line shell snippets with `# comments` inline. zsh treats `#` as literal and passes it to commands. Either prefix with `setopt interactivecomments` or strip comments from CLI examples.

### Raw-HTML output must go through `sanitize-synthesis`

`set:html` / `{@html}` / `innerHTML` are XSS sinks. The corpus is LLM-shaped (post bodies feed the model, output is committed), so a missed payload in `synthesis`/`blurb`/`rationale` would otherwise ship verbatim to the production origin. The **only** sanctioned raw-HTML sink is `src/pages/themes/[id].astro`, which renders `synthesis` via `renderSynthesis()` in `src/utils/sanitize-synthesis.ts` — it HTML-escapes the whole string and allow-lists links to this site only (relative, `#`, `hologramthoughts.com`). Drop-anything-else. Tests live in `tests/sanitize-synthesis.test.ts`.

**Rule:** never interpolate Muse/LLM/frontmatter content into raw HTML directly. Route it through `renderSynthesis()` (or `escapeHtml()` for non-link text). Everywhere else, keep using Astro/Svelte `{...}` interpolation, which auto-escapes — do not switch those to `set:html`.

### `_redirects` slugs are validated

`emit-theme-index.ts` only emits a redirect line when both the filename base and frontmatter slug match `^[A-Za-z0-9._~-]+$` (`isSafeSlug`). This blocks whitespace/newline (rule injection) and slash/colon (external or protocol-relative targets), keeping every redirect same-origin. A malformed slug is skipped with a `console.warn`, not silently emitted — if a post stops redirecting, check the build log for that warning.

---

## 12. Markdown for Agents (existing system, preserved)

DIY implementation of Cloudflare's "Markdown for Agents" (which requires a paid plan). Lets AI agents request any blog post as clean markdown.

**Flow:**
1. Build-time generation (`src/integrations/markdown-for-agents.ts`) writes a `.md` file for each non-draft post to `dist/blog/[slug]/index.md`
2. Agent index endpoint (`src/pages/agent-index.md.ts`) generates `/agent-index.md`
3. Edge middleware (`functions/_middleware.ts`) intercepts requests; serves markdown when `Accept: text/markdown` OR `?format=md`
4. Every page has `<link rel="alternate" type="text/markdown">` in head + HTML comment after body pointing to the agent index

**Response headers on markdown:**
- `Content-Type: text/markdown; charset=utf-8`
- `x-markdown-tokens: <estimated count>` (chars / 4)
- `Content-Signal: ai-input=yes, search=yes`
- `Cache-Control: public, max-age=3600`

**Test:**
```sh
curl -H "Accept: text/markdown" https://hologramthoughts.com/blog/the-holographic-universe/
curl https://hologramthoughts.com/agent-index.md
```

---

## 13. OpenGraph image

`public/og-image.svg` — solarpunk light-theme OG. Prismatic wordmark, canopy + root curves, spore-mote dots, warm parchment bg with bottom green vignette.

Rendered to `public/og-image.png` (1200×630) via:
```sh
npm run render:og
# Internally: node scripts/render-og.mjs (uses @resvg/resvg-js)
```

Edit the SVG, re-render, commit both files. The `<head>` references `og-image.png` for compatibility with Twitter/Facebook validators.

---

## 14. Custom remark plugins (`src/utils/`)

- **`reading-time.mjs`** — computes reading time from word count, injects into frontmatter
- **`enhance-frontmatter.mjs`** — auto-generates description (excerpt), content type, complexity scores

---

## 15. Environment note

If you hit `command not found` on `npx`/`node`, your PATH may not have Homebrew prefix loaded:
```sh
export PATH="/opt/homebrew/bin:$PATH"
```

---

## 16. DO NOT

- Hardcode hex colors — use CSS variables from `tokens.css`
- Use terminal aesthetics (PS1, scanlines, monospace-as-default, dharma:// framing) — that era is dead
- Add runtime LLM calls — Muse stays build-time only. No chat surface. No streaming endpoint
- Re-enable `ClientRouter` / view transitions without solving the static-route conflict + script re-binding
- Skip hand-review of Muse-generated text before commit — taxonomy.json and per-post sidecars ship verbatim
- Render Muse/LLM/frontmatter content via `set:html`/`{@html}` directly — route it through `renderSynthesis()`/`escapeHtml()` in `src/utils/sanitize-synthesis.ts` (the lone sanctioned raw-HTML sink is `themes/[id].astro`)
- Loosen the `isSafeSlug` allow-list in `emit-theme-index.ts` to emit redirect lines for slugs containing whitespace, `/`, or `:` — that re-opens redirect injection / off-site targets
- Skip the legacy `_redirects` generation (the integration is silent but critical for inbound links from old URLs)
- Deploy without the user's explicit go-ahead — Cloudflare deploy is direct-to-prod
- Force-push `main` without `--force-with-lease`
- Use `@apply` of custom (non-utility) classes — Tailwind 4 forbids it
- Add posts without re-running `npm run build:tag` afterward (otherwise they have no theme chips / related posts)
- Treat `data.slug` as canonical for URLs — use `p.slug` for routes, multi-key map for sidecar lookups

---

## 17. Quick command reference

```sh
# Local dev
npm run dev                          # astro dev server (localhost:4321)
npm run build                        # static build → dist/
npm run preview                      # serve dist/ (localhost:4321)
npm test                             # vitest run

# Muse pipeline (requires `npm run muse:relay` in another terminal)
npm run muse:relay                   # start the relay (leave running)
npm run build:tag                    # tag posts (resumes from cache)
npm run build:tag -- --limit=5       # smoke 5 posts
npm run build:canonicalize           # DESTRUCTIVE: rebuilds raw taxonomy, wipes blurbs + all sidecar related/rationale
npm run build:consolidate            # DESTRUCTIVE: re-rolls taxonomy via LLM, blanks all blurbs/synthesis
npm run build:bio                    # derive matthew-bio.md
npm run build:blurbs                 # write theme blurbs + synthesis
npm run build:blurbs -- --force-blurbs   # rewrite only blurbs
npm run build:embed                  # embed all posts (safe: writes only .cache/embeddings.json)
npm run build:related                # DESTRUCTIVE: blanks ALL sidecar related + rationale, recomputes cosine top-3
npm run build:rationale              # write Muse rationale for related-post pairs
npm run build:rationale -- --force   # rewrite all rationale
npm run build:muse                   # full pipeline (GUARDED: aborts if curated taxonomy/rationale exists)
npm run build:muse:force             # intentional from-scratch rebuild (passes --force to destructive stages)

# OG image
npm run render:og                    # public/og-image.svg → public/og-image.png

# Deploy (direct to prod)
npm run build
npx wrangler pages deploy ./dist --project-name=hologramthoughts --branch=main

# Git
git add -A
git commit -m "<msg>"
git push origin main
```
