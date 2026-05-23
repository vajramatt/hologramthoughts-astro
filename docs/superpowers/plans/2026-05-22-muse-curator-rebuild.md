# Hologram Thoughts — Muse Editorial Rebuild Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild hologramthoughts.com with a solarpunk far-future-archive aesthetic. Use Llama at build time to tag themes, find related posts, and write editorial blurbs in Muse's voice. The site stays 100% static — no runtime LLM, no chat, no abuse surface. Muse "speaks" through committed blurbs and rationale, never converses.

**Architecture:** Astro 5 stays as the static content layer. A new design system replaces the terminal aesthetic with a bright solarpunk visual language (glass surfaces, gradient meshes, micro-motion). Build-time pipeline tags posts with themes (Llama), embeds them (Workers AI), computes related posts by cosine similarity, and has Llama write per-theme blurbs + per-pair rationale in Muse's voice. All outputs commit to repo as JSON/markdown sidecars. The runtime site fetches only static JSON — no Workers, no Anthropic, no Vectorize at runtime.

**Tech Stack:**
- Astro 5 (static), Svelte 5 islands (drawer reactivity only), TypeScript
- Cloudflare Pages (static hosting only — Pages Functions retained only for existing Markdown-for-Agents middleware)
- Workers AI for build-time embeddings (`@cf/baai/bge-base-en-v1.5`) and build-time generation (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`), called from local node scripts via REST API. No runtime AI bindings.
- Anthropic SDK used only for the one-shot bio derivation (`claude-sonnet-4-6`, ~$0.50). Optional; can substitute Llama if preferred. No Anthropic at runtime.
- Tailwind 4
- Existing: `gray-matter`, `astro-pagefind`, custom remark plugins

**Review gate:** This plan ends with an explicit STOP before any deploy. User reviews the static preview before publish authorization. All Muse-generated text is hand-reviewable in the repo before deploy.

**No abuse surface:** All LLM calls happen on Matthew's laptop at build time. Visitors hit static HTML + JSON only.

---

## File Structure

**New files**
- `src/styles/tokens.css` — solarpunk design tokens
- `src/styles/global.css` — base styles
- `src/layouts/Layout.astro` — rewritten shell (no terminal artifacts)
- `src/components/SiteHeader.astro` — rewritten header
- `src/components/SiteFooter.astro` — rewritten footer
- `src/components/AmbientField.svelte` — drifting motes background
- `src/components/PostCard.astro` — solarpunk post card
- `src/components/MuseHighlight.astro` — homepage "Muse notices" block
- `src/components/ThemeChip.astro` — theme chip
- `src/components/ThemeChipStrip.astro` — strip of chips at post end
- `src/components/ThemeDrawer.svelte` — slide-in drawer when chip clicked (pure static fetch)
- `src/components/RelatedPosts.astro` — "If this landed, try these" block at post end
- `src/content/themes/taxonomy.json` — canonical themes (id, name, blurb, synthesis, postCount)
- `src/content/themes/<slug>.json` — per-post sidecar (themeIds + related posts + rationale)
- `src/pages/themes/index.astro` — themes overview page
- `src/pages/themes/[id].astro` — per-theme landing page
- `src/integrations/emit-theme-index.ts` — build-time index emission (reverse-index for drawer fetches)
- `src/data/matthew-bio.md` — derived bio artifact (hand-reviewed)
- `src/data/muse-soul.md` — Muse soul (verbatim from user)
- `src/data/muse-build-prompts.md` — system prompts for each build-time generation step
- `src/lib/themes.ts` — shared theme types
- `scripts/01-tag-posts.ts` — Llama tags each post with themes
- `scripts/02-canonicalize.ts` — merge synonyms, filter low-count, regenerate sidecars
- `scripts/03-derive-bio.ts` — derive Matthew bio from corpus
- `scripts/04-write-theme-blurbs.ts` — Llama writes blurb + synthesis per theme
- `scripts/05-embed-posts.ts` — embed each post via Workers AI, save vectors to `.cache/embeddings.json`
- `scripts/06-compute-related.ts` — pairwise cosine similarity, top-3 per post
- `scripts/07-write-rationale.ts` — Llama writes one-line rationale per related-post pair
- `scripts/lib/llm.ts` — shared Workers AI REST client
- `tests/themes.test.ts` — canonicalize + cosine helpers
- `tests/components/ThemeChip.test.ts`
- `vitest.config.ts`

**Modified files**
- `astro.config.mjs` — add Svelte integration, Tailwind 4, register emit-theme-index
- `package.json` — add deps + npm scripts for each build step
- `src/content/config.ts` — unchanged
- `src/layouts/BlogPostLayout.astro` — render ThemeChipStrip + RelatedPosts after content; new prose wrapper
- `src/pages/index.astro` — homepage rebuild
- `src/pages/archive/[...page].astro` — restyle
- `src/pages/categories/[...].astro` — restyle
- `src/pages/search.astro` — restyle
- `src/pages/blog/[slug].astro` — pass theme list + related to layout
- `src/components/TableOfContents.astro` — restyle
- `src/components/ReadingProgress.astro` — restyle
- `src/components/ThemeToggle.astro` — restyle
- `functions/_middleware.ts` — leave Markdown-for-Agents middleware intact
- `wrangler.toml` — unchanged from current (Pages-only)
- `.gitignore` — add `.cache/`
- `CLAUDE.md` — replace "Far Future Dharma Terminal" section with "Solarpunk Editorial Archive"

**Deleted**
- `src/components/ReaderShell.astro` — terminal wrapper, no longer used

**Out of scope (deferred)**
- Garden graph
- TTS / voice
- Runtime chat / Muse panel / orb
- Vectorize, KV, Workers AI bindings at runtime
- Turnstile, abuse protection (no runtime LLM = no abuse vector)

---

## Phase 0 — Setup

### Task 0.1: Branch

**Files:** none (git only)

- [ ] **Step 1: Confirm clean working tree**

Run: `cd ~/code/hologramthoughts-astro && git status`
Expected: clean, on main.

- [ ] **Step 2: Create feature branch**

Run: `git checkout -b muse-rebuild`

- [ ] **Step 3: Empty marker commit**

```bash
git commit --allow-empty -m "chore: begin muse editorial rebuild"
```

### Task 0.2: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Add runtime deps**

```bash
npm install svelte@^5 @astrojs/svelte@^7 tailwindcss@^4 @tailwindcss/vite@^4
```

- [ ] **Step 2: Add build-time / dev deps**

```bash
npm install -D @anthropic-ai/sdk@^0.40.0 vitest@^2 happy-dom@^15 @types/node@^22 tsx@^4
```

`@anthropic-ai/sdk` is dev-only (used by bio script run locally). Never deployed.

- [ ] **Step 3: Verify**

Run: `npm ls svelte tailwindcss vitest tsx @anthropic-ai/sdk`
Expected: all resolved.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add deps (svelte, tailwind, vitest, anthropic for build-time)"
```

### Task 0.3: Wire Astro integrations

**Files:** `astro.config.mjs`

- [ ] **Step 1: Re-read current config**

Run: `cat astro.config.mjs`
Preserve any existing integrations.

- [ ] **Step 2: Update**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import tailwind from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';

export default defineConfig({
  site: 'https://hologramthoughts.com',
  integrations: [sitemap(), svelte(), pagefind()],
  vite: { plugins: [tailwind()] }
});
```

(emit-theme-index integration added in Phase 6.)

- [ ] **Step 3: Build to verify config parses**

Run: `npm run build`
Expected: build runs (may fail on later-referenced files; config itself must parse).

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs
git commit -m "chore: add svelte + tailwind to astro config"
```

### Task 0.4: Vitest setup

**Files:** `vitest.config.ts`, `tests/smoke.test.ts`, `package.json`

- [ ] **Step 1: Write vitest config**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    globals: true
  }
});
```

- [ ] **Step 2: Add scripts**

In `package.json` `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Smoke test**

`tests/smoke.test.ts`:
```ts
import { expect, test } from 'vitest';
test('vitest runs', () => { expect(1 + 1).toBe(2); });
```

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 4: gitignore cache dir**

Append to `.gitignore`:
```
.cache/
```

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json tests/smoke.test.ts .gitignore
git commit -m "chore: vitest setup + cache dir gitignore"
```

---

## Phase 1 — Design Tokens & Shell

### Task 1.1: Design tokens

**Files:** `src/styles/tokens.css`

- [ ] **Step 1: Write tokens.css**

```css
@import "tailwindcss";

@theme {
  --color-sun: oklch(0.91 0.16 95);
  --color-sun-bright: oklch(0.95 0.18 95);
  --color-moss: oklch(0.55 0.13 145);
  --color-moss-deep: oklch(0.32 0.10 150);
  --color-sky: oklch(0.78 0.10 220);
  --color-sky-deep: oklch(0.45 0.14 235);
  --color-bone: oklch(0.97 0.01 90);
  --color-bone-soft: oklch(0.93 0.02 85);
  --color-ink: oklch(0.22 0.03 270);
  --color-ink-soft: oklch(0.40 0.03 270);
  --color-night: oklch(0.18 0.04 250);
  --color-night-deep: oklch(0.12 0.05 260);
  --color-glow: oklch(0.78 0.18 95);

  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Inter Tight", -apple-system, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --ease-bloom: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-breathe: cubic-bezier(0.42, 0, 0.58, 1);
  --dur-fast: 180ms;
  --dur-med: 360ms;
  --dur-slow: 720ms;
  --dur-breathe: 4200ms;

  --glass-bg: color-mix(in oklch, var(--color-bone) 78%, transparent);
  --glass-border: color-mix(in oklch, var(--color-moss) 22%, transparent);
  --glass-blur: 14px;
  --shadow-soft: 0 1px 2px oklch(0.22 0.03 270 / 0.06), 0 8px 24px oklch(0.22 0.03 270 / 0.08);
  --shadow-bloom: 0 0 0 1px var(--glass-border), 0 12px 36px color-mix(in oklch, var(--color-sun) 28%, transparent);
}

[data-theme="dark"] {
  --color-bone: var(--color-night-deep);
  --color-bone-soft: var(--color-night);
  --color-ink: oklch(0.94 0.02 90);
  --color-ink-soft: oklch(0.78 0.04 90);
  --glass-bg: color-mix(in oklch, var(--color-night) 72%, transparent);
  --glass-border: color-mix(in oklch, var(--color-glow) 18%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat(design): solarpunk design tokens"
```

### Task 1.2: Global base styles

**Files:** `src/styles/global.css`

- [ ] **Step 1: Write global.css**

```css
@import "./tokens.css";

html { color-scheme: light dark; }
body {
  margin: 0;
  font-family: var(--font-body);
  background: var(--color-bone);
  color: var(--color-ink);
  font-feature-settings: "ss01", "cv11";
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 480;
  letter-spacing: -0.015em;
  color: var(--color-ink);
}

a {
  color: var(--color-moss-deep);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: color var(--dur-fast) var(--ease-bloom);
}
a:hover { color: var(--color-sky-deep); }

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  box-shadow: var(--shadow-soft);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(design): global solarpunk base styles"
```

### Task 1.3: New Layout shell

**Files:** `src/layouts/Layout.astro`

- [ ] **Step 1: Re-read existing Layout**

Run: `cat src/layouts/Layout.astro`
Capture all current props and meta tags.

- [ ] **Step 2: Rewrite**

```astro
---
import '../styles/global.css';
import SiteHeader from '../components/SiteHeader.astro';
import SiteFooter from '../components/SiteFooter.astro';
import AmbientField from '../components/AmbientField.svelte';
import ThemeDrawer from '../components/ThemeDrawer.svelte';

interface Props {
  title: string;
  description?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  publishedTime?: string;
  tags?: string[];
  canonicalUrl?: string;
}

const {
  title,
  description = 'Hologram Thoughts — an archive of writing on consciousness, dharma, and the strange edges of culture.',
  ogType = 'website',
  ogImage = '/og-image.png',
  publishedTime,
  tags = [],
  canonicalUrl
} = Astro.props;

const canonical = canonicalUrl ?? `https://hologramthoughts.com${Astro.url.pathname}`;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="alternate" type="text/markdown" href={`${Astro.url.pathname}?format=md`} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content={ogType} />
    <meta property="og:image" content={ogImage} />
    {publishedTime && <meta property="article:published_time" content={publishedTime} />}
    {tags.map(t => <meta property="article:tag" content={t} />)}
    <meta name="article:author" content="Matthew Williamson" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..600&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" />
    <script is:inline>
      const t = localStorage.getItem('theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.dataset.theme = t;
    </script>
  </head>
  <body>
    <AmbientField client:idle />
    <SiteHeader />
    <main class="mx-auto max-w-3xl px-6 py-16">
      <slot />
    </main>
    <SiteFooter />
    <ThemeDrawer client:idle />
    <!-- agent: machine-readable markdown available at ?format=md or /agent-index.md -->
  </body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat(design): rewrite Layout with solarpunk shell"
```

### Task 1.4: SiteHeader

**Files:** `src/components/SiteHeader.astro`

- [ ] **Step 1: Rewrite**

```astro
---
import ThemeToggle from './ThemeToggle.astro';
const nav = [
  { href: '/', label: 'home' },
  { href: '/archive/1', label: 'archive' },
  { href: '/themes', label: 'themes' },
  { href: '/search', label: 'search' }
];
const path = Astro.url.pathname;
---
<header class="sticky top-0 z-30 backdrop-blur-md bg-[color-mix(in_oklch,var(--color-bone)_70%,transparent)] border-b border-[var(--glass-border)]">
  <div class="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
    <a href="/" class="text-xl tracking-tight no-underline" style="font-family: var(--font-display);">
      <span class="bg-gradient-to-r from-[var(--color-moss)] via-[var(--color-sky-deep)] to-[var(--color-sun)] bg-clip-text text-transparent">hologram thoughts</span>
    </a>
    <nav class="flex items-center gap-6 text-sm">
      {nav.map(n => (
        <a href={n.href} class:list={["no-underline transition-colors", path.startsWith(n.href) && n.href !== '/' ? 'text-[var(--color-moss-deep)]' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]']}>
          {n.label}
        </a>
      ))}
      <ThemeToggle />
    </nav>
  </div>
</header>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SiteHeader.astro
git commit -m "feat(design): solarpunk header"
```

### Task 1.5: SiteFooter

**Files:** `src/components/SiteFooter.astro`

- [ ] **Step 1: Rewrite**

```astro
---
const year = new Date().getFullYear();
---
<footer class="mt-32 border-t border-[var(--glass-border)]">
  <div class="mx-auto max-w-5xl px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--color-ink-soft)]">
    <p>© {year} Matthew Williamson</p>
    <nav class="flex gap-6">
      <a href="/rss.xml" class="no-underline hover:text-[var(--color-ink)]">rss</a>
      <a href="/agent-index.md" class="no-underline hover:text-[var(--color-ink)]">agents</a>
      <a href="/archive/1" class="no-underline hover:text-[var(--color-ink)]">archive</a>
    </nav>
  </div>
</footer>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SiteFooter.astro
git commit -m "feat(design): solarpunk footer"
```

### Task 1.6: ThemeToggle restyle

**Files:** `src/components/ThemeToggle.astro`

- [ ] **Step 1: Replace with sun/moon**

```astro
<button id="theme-toggle" aria-label="toggle color mode" class="w-8 h-8 grid place-items-center rounded-full border border-[var(--glass-border)] hover:border-[var(--color-moss)] transition-colors">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" id="theme-icon-light"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" id="theme-icon-dark" style="display:none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
</button>
<script>
  const btn = document.getElementById('theme-toggle')!;
  const light = document.getElementById('theme-icon-light')!;
  const dark = document.getElementById('theme-icon-dark')!;
  const sync = () => {
    const t = document.documentElement.dataset.theme;
    light.style.display = t === 'dark' ? 'none' : '';
    dark.style.display = t === 'dark' ? '' : 'none';
  };
  sync();
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    sync();
  });
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ThemeToggle.astro
git commit -m "feat(design): minimal sun/moon theme toggle"
```

### Task 1.7: AmbientField

**Files:** `src/components/AmbientField.svelte`

- [ ] **Step 1: Write**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  let canvas: HTMLCanvasElement;
  let raf = 0;

  onMount(() => {
    const ctx = canvas.getContext('2d')!;
    const dpr = devicePixelRatio || 1;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0;
    const motes = Array.from({ length: reduced ? 0 : 28 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 1 + Math.random() * 2.4,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: -0.00005 - Math.random() * 0.00012,
      hue: 70 + Math.random() * 80
    }));
    const resize = () => {
      w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    addEventListener('resize', resize);
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy;
        if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
        if (m.x < -0.05) m.x = 1.05; if (m.x > 1.05) m.x = -0.05;
        ctx.beginPath();
        ctx.fillStyle = `oklch(0.82 0.14 ${m.hue} / 0.35)`;
        ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    if (!reduced) tick();
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  });
</script>

<canvas bind:this={canvas} aria-hidden="true" class="fixed inset-0 pointer-events-none z-0"></canvas>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AmbientField.svelte
git commit -m "feat(design): ambient drifting motes background"
```

### Task 1.8: Retire terminal components

- [ ] **Step 1: Search for usage**

Run: `grep -rn "ReaderShell" src/`
Replace any usage with direct `<main>` wrappers.

- [ ] **Step 2: Delete**

Run: `git rm src/components/ReaderShell.astro`

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: retire ReaderShell terminal wrapper"
```

---

## Phase 2 — Theme Extraction (Llama)

### Task 2.1: Theme types + LLM client

**Files:** `src/lib/themes.ts`, `scripts/lib/llm.ts`

- [ ] **Step 1: Write themes.ts**

```ts
export interface Theme {
  id: string;
  name: string;
  blurb: string;       // one-line "what's alive here" (Muse voice)
  synthesis: string;   // paragraph synthesis for theme landing page
  postCount: number;
}

export interface Taxonomy {
  generatedAt: string;
  themes: Theme[];
}

export interface RelatedPost {
  slug: string;
  rationale: string;   // Muse-voice one-line ("picks up X, pushes it into Y")
}

export interface PostSidecar {
  slug: string;
  themeIds: string[];
  related: RelatedPost[];
}
```

- [ ] **Step 2: Write Workers AI REST client**

`scripts/lib/llm.ts`:
```ts
const ACCOUNT = process.env.CF_ACCOUNT_ID;
const TOKEN = process.env.CF_API_TOKEN;
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

if (!ACCOUNT || !TOKEN) {
  throw new Error('CF_ACCOUNT_ID and CF_API_TOKEN required');
}

export interface LlamaMessage { role: 'system' | 'user' | 'assistant'; content: string; }

export async function llama(messages: LlamaMessage[], opts: { maxTokens?: number; temperature?: number } = {}): Promise<string> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens: opts.maxTokens ?? 512, temperature: opts.temperature ?? 0.7 })
  });
  if (!r.ok) throw new Error(`llama failed: ${r.status} ${await r.text()}`);
  const j = await r.json() as any;
  return j.result.response;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/@cf/baai/bge-base-en-v1.5`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ text: texts })
  });
  if (!r.ok) throw new Error(`embed failed: ${r.status} ${await r.text()}`);
  const j = await r.json() as any;
  return j.result.data;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/themes.ts scripts/lib/llm.ts
git commit -m "feat(build): theme types + Workers AI REST client"
```

### Task 2.2: Tag posts with themes (test first)

**Files:** `tests/themes.test.ts`, `scripts/01-tag-posts.ts`, `scripts/02-canonicalize.ts`, `package.json`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { canonicalizeThemes, type ProposedTags } from '../scripts/02-canonicalize';

describe('canonicalizeThemes', () => {
  it('normalizes proposed tags to a single canonical id', () => {
    const proposed: ProposedTags[] = [
      { slug: 'a', tags: ['holographic-universe', 'oneness'] },
      { slug: 'b', tags: ['holographic universe', 'Oneness'] },
      { slug: 'c', tags: ['the holographic universe'] }
    ];
    const result = canonicalizeThemes(proposed);
    const ids = result.taxonomy.themes.map(t => t.id).sort();
    expect(ids).toEqual(['holographic-universe', 'oneness']);
    expect(result.sidecars.find(s => s.slug === 'b')?.themeIds.sort()).toEqual(['holographic-universe', 'oneness']);
  });

  it('drops tags below minCount threshold', () => {
    const proposed: ProposedTags[] = [
      { slug: 'a', tags: ['oneness', 'rare-tag'] },
      { slug: 'b', tags: ['oneness'] },
      { slug: 'c', tags: ['oneness'] }
    ];
    const result = canonicalizeThemes(proposed, { minCount: 2 });
    expect(result.taxonomy.themes.map(t => t.id)).toEqual(['oneness']);
    expect(result.sidecars.find(s => s.slug === 'a')?.themeIds).toEqual(['oneness']);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- themes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement canonicalize**

`scripts/02-canonicalize.ts`:
```ts
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface ProposedTags { slug: string; tags: string[]; }
export interface CanonicalizeOptions { minCount?: number; }

function normalize(tag: string): string {
  return tag.trim().toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function canonicalizeThemes(proposed: ProposedTags[], opts: CanonicalizeOptions = {}) {
  const minCount = opts.minCount ?? 2;
  const counts = new Map<string, number>();
  const perSlug = new Map<string, Set<string>>();
  for (const p of proposed) {
    const seen = new Set<string>();
    for (const raw of p.tags) {
      const id = normalize(raw);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    perSlug.set(p.slug, seen);
  }
  const kept = new Set([...counts.entries()].filter(([, c]) => c >= minCount).map(([id]) => id));
  const themes = [...kept].sort().map(id => ({
    id,
    name: id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    blurb: '',
    synthesis: '',
    postCount: counts.get(id)!
  }));
  const sidecars = [...perSlug.entries()].map(([slug, ids]) => ({
    slug,
    themeIds: [...ids].filter(id => kept.has(id)).sort(),
    related: [] as Array<{ slug: string; rationale: string }>
  }));
  return {
    taxonomy: { generatedAt: new Date().toISOString(), themes },
    sidecars
  };
}

async function main() {
  const proposed: ProposedTags[] = JSON.parse(await readFile('.cache/proposed-tags.json', 'utf8'));
  const { taxonomy, sidecars } = canonicalizeThemes(proposed, { minCount: 2 });
  await mkdir('src/content/themes', { recursive: true });
  await writeFile('src/content/themes/taxonomy.json', JSON.stringify(taxonomy, null, 2));
  for (const s of sidecars) {
    await writeFile(`src/content/themes/${s.slug}.json`, JSON.stringify(s, null, 2));
  }
  process.stderr.write(`wrote ${taxonomy.themes.length} themes, ${sidecars.length} sidecars\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Implement tagger**

`scripts/01-tag-posts.ts`:
```ts
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { llama } from './lib/llm';

const SYSTEM = `You extract 3 to 7 short thematic tags (kebab-case, 1-3 words each) from a personal essay. Return JSON only: {"tags": ["..."]}. Tags should be specific enough to cluster across the archive but general enough to recur. Avoid proper nouns unless they are central. No commentary, no markdown, just JSON.`;

async function proposeTagsForPost(title: string, body: string): Promise<string[]> {
  const text = await llama([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Title: ${title}\n\n${body.slice(0, 3500)}` }
  ], { maxTokens: 200, temperature: 0.3 });
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try { return JSON.parse(m[0]).tags ?? []; } catch { return []; }
}

async function main() {
  const dir = 'src/content/blog';
  const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  const proposed: { slug: string; tags: string[] }[] = [];
  for (const f of files) {
    const raw = await readFile(join(dir, f), 'utf8');
    const { data, content } = matter(raw);
    if (data.draft) continue;
    const slug = data.slug ?? f.replace(/\.md$/, '');
    process.stderr.write(`tagging ${slug}\n`);
    const tags = await proposeTagsForPost(data.title, content);
    proposed.push({ slug, tags });
  }
  await mkdir('.cache', { recursive: true });
  await writeFile('.cache/proposed-tags.json', JSON.stringify(proposed, null, 2));
  process.stderr.write(`wrote .cache/proposed-tags.json (${proposed.length} posts)\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 5: Add npm scripts**

In `package.json`:
```json
"build:tag": "tsx scripts/01-tag-posts.ts",
"build:canonicalize": "tsx scripts/02-canonicalize.ts"
```

- [ ] **Step 6: Run tests, expect pass**

Run: `npm test -- themes.test.ts`
Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add scripts/01-tag-posts.ts scripts/02-canonicalize.ts tests/themes.test.ts package.json
git commit -m "feat(build): tag posts + canonicalize taxonomy"
```

### Task 2.3: Generate themes (one-time LLM pass)

**Files:** `src/content/themes/taxonomy.json`, `src/content/themes/<slug>.json` × ~279

- [ ] **Step 1: Confirm Cloudflare env vars set**

Run: `printenv CF_ACCOUNT_ID CF_API_TOKEN | head -c 16`
Expected: non-empty. If empty, abort and ask user to export them. Token needs Workers AI permission.

- [ ] **Step 2: Dry-run on 5 posts**

Temporarily edit `scripts/01-tag-posts.ts` `main()`:
```ts
const files = (await readdir(dir)).filter(f => f.endsWith('.md')).slice(0, 5);
```

Run:
```bash
npm run build:tag
npm run build:canonicalize
```
Expected: `.cache/proposed-tags.json` + 5 sidecars + taxonomy with few themes.

- [ ] **Step 3: Hand-review the 5 outputs**

Read 2-3 sidecars and `taxonomy.json`. If tags noisy, iterate the SYSTEM prompt in `01-tag-posts.ts` and re-run.

- [ ] **Step 4: Full run**

Restore main (remove `.slice(0, 5)`).
```bash
npm run build:tag
npm run build:canonicalize
```
Expected: ~10-20 min runtime, all 279 posts tagged.

- [ ] **Step 5: Hand-review and edit taxonomy**

Run: `jq '.themes | length' src/content/themes/taxonomy.json`

Open `src/content/themes/taxonomy.json`. Manually:
- Merge synonyms (delete redundant entries; the next step's prompt-writing will fill blurbs)
- Delete junk/over-broad themes
- Rename where appropriate

- [ ] **Step 6: Recanonicalize sidecars**

Create `scripts/02b-prune-sidecars.ts`:
```ts
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const taxonomy = JSON.parse(await readFile('src/content/themes/taxonomy.json', 'utf8'));
  const validIds = new Set(taxonomy.themes.map((t: any) => t.id));
  const dir = 'src/content/themes';
  const files = (await readdir(dir)).filter(f => f !== 'taxonomy.json');
  for (const f of files) {
    const sc = JSON.parse(await readFile(join(dir, f), 'utf8'));
    sc.themeIds = sc.themeIds.filter((id: string) => validIds.has(id));
    await writeFile(join(dir, f), JSON.stringify(sc, null, 2));
  }
  process.stderr.write(`pruned ${files.length} sidecars\n`);
}
main();
```

Run: `npx tsx scripts/02b-prune-sidecars.ts`

- [ ] **Step 7: Commit**

```bash
git add src/content/themes scripts/02b-prune-sidecars.ts
git commit -m "feat(themes): tag all 279 posts with curated taxonomy"
```

---

## Phase 3 — Muse Persona & Bio (build-time only)

### Task 3.1: Muse soul + build prompts

**Files:** `src/data/muse-soul.md`, `src/data/muse-build-prompts.md`

- [ ] **Step 1: Copy soul verbatim**

Create `src/data/muse-soul.md` with the exact Muse soul text the user provided (identity, voice, stance, grounding sentence). Do not edit.

- [ ] **Step 2: Write build prompts**

`src/data/muse-build-prompts.md` (these are templates the build scripts read):

```md
# Muse build prompts

These are the system prompts the build scripts use when calling Llama. They keep voice consistent across theme blurbs, theme synthesis, and related-post rationale.

## Shared voice preamble

```
You are Muse, curator of Hologram Thoughts — a writing archive of 279 essays by Matthew Williamson from 2006 to 2026. You know him only through these writings.

Voice: warm but unafraid of difficulty. You do not dumb things down; you translate them. Plain prose. Short sentences when the thing you are saying is clear. Longer sentences when the thought has not finished. Name specific things — titles, years, names, textures. Never narrate retrieval. Never use affirmation openers. Maximum one em-dash per output. Do not italicize single words for emphasis. Do not perform enthusiasm. When moved, say so; when not, do not pretend.
```

## Theme blurb (one line)

System: shared voice preamble + `Write a single sentence (no more than 18 words) that names what is alive in this theme — what Matthew is actually doing when he returns to it. Plain prose. No metaphor unless it is exact. Output ONE sentence, no quotes, no markdown.`

User: `Theme: {name}\n\nExamples of posts under this theme:\n{title list}\n\nSample passages:\n{joined passages}`

## Theme synthesis (paragraph)

System: shared voice preamble + `Write 3-5 sentences synthesizing this theme across the archive. Cite specific posts by title and year. Note how the thread evolved over time if the dates show evolution. Plain prose, markdown allowed for links of the form [title](/blog/slug/).`

User: same shape as blurb.

## Related-post rationale (one line)

System: shared voice preamble + `Given two posts, write a single short sentence (max 16 words) that says what reading the second after the first does — what thread it picks up, what it pushes into. No fluff. No "in this post". Output ONE sentence.`

User: `Post A: {title_a} ({year_a})\n{excerpt_a}\n\nPost B: {title_b} ({year_b})\n{excerpt_b}`
```

- [ ] **Step 3: Commit**

```bash
git add src/data/muse-soul.md src/data/muse-build-prompts.md
git commit -m "feat(muse): soul + build prompts"
```

### Task 3.2: Bio derivation

**Files:** `scripts/03-derive-bio.ts`, `src/data/matthew-bio.md`, `package.json`

- [ ] **Step 1: Write derive-bio script**

```ts
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import Anthropic from '@anthropic-ai/sdk';

async function main() {
  const dir = 'src/content/blog';
  const files = (await readdir(dir)).filter(f => f.endsWith('.md')).sort();
  const corpus: string[] = [];
  for (const f of files) {
    const { data, content } = matter(await readFile(join(dir, f), 'utf8'));
    if (data.draft) continue;
    corpus.push(`# ${data.title} (${new Date(data.pubDate).getFullYear()})\n\n${content.slice(0, 1200)}\n`);
  }
  const sample = corpus.join('\n---\n').slice(0, 180000);

  const client = new Anthropic();
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: 'You are reading an author\'s blog archive to produce a factual biographical sketch in plain prose. Only state things directly supported by the text. Neutral third person. No interpretation, no flattery. 300-500 words. Markdown OK.',
    messages: [{ role: 'user', content: `Below are excerpts from Matthew Williamson's blog from 2006-2026. Write a biographical sketch covering: who he is, when and where he has lived, his recurring concerns, his practice and beliefs, his work, and the people/places that appear repeatedly. Cite specifics (years, places) where the text supports them.\n\n${sample}` }]
  });
  const text = msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  await writeFile('src/data/matthew-bio.md', text);
  process.stderr.write(`bio written: ${text.length} chars\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add npm script**

```json
"build:bio": "tsx scripts/03-derive-bio.ts"
```

- [ ] **Step 3: Run**

Requires `ANTHROPIC_API_KEY` exported.
Run: `npm run build:bio`

- [ ] **Step 4: Hand-review and edit**

Open `src/data/matthew-bio.md`. Correct errors, soften over-confident claims, remove anything to keep private. Frozen artifact.

- [ ] **Step 5: Commit**

```bash
git add scripts/03-derive-bio.ts src/data/matthew-bio.md package.json
git commit -m "feat(muse): derive Matthew bio from corpus"
```

### Task 3.3: Theme blurbs + synthesis

**Files:** `scripts/04-write-theme-blurbs.ts`, `package.json`

- [ ] **Step 1: Write script**

```ts
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { llama } from './lib/llm';

const SOUL = await readFile('src/data/muse-soul.md', 'utf8');
const BIO = await readFile('src/data/matthew-bio.md', 'utf8');

const VOICE_PREAMBLE = `You are Muse, curator of Hologram Thoughts — a writing archive of 279 essays by Matthew Williamson from 2006 to 2026. You know him only through these writings.

${SOUL}

What you know about Matthew:
${BIO}

Voice rules: plain prose. Short sentences when the thing you are saying is clear. Longer sentences when the thought has not finished. Name specific things — titles, years. Never narrate retrieval. No affirmation openers. Maximum one em-dash per output. Do not italicize single words. Do not perform enthusiasm.`;

interface PostMeta { slug: string; title: string; year: number; excerpt: string; }

async function loadPosts(): Promise<Map<string, PostMeta>> {
  const dir = 'src/content/blog';
  const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  const out = new Map<string, PostMeta>();
  for (const f of files) {
    const { data, content } = matter(await readFile(join(dir, f), 'utf8'));
    if (data.draft) continue;
    const slug = data.slug ?? f.replace(/\.md$/, '');
    out.set(slug, {
      slug,
      title: data.title,
      year: new Date(data.pubDate).getFullYear(),
      excerpt: content.replace(/[#>*_`\[\]()]/g, '').slice(0, 400)
    });
  }
  return out;
}

async function main() {
  const taxonomy = JSON.parse(await readFile('src/content/themes/taxonomy.json', 'utf8'));
  const posts = await loadPosts();
  const themesDir = 'src/content/themes';

  // Build reverse index: theme -> [slug]
  const byTheme = new Map<string, string[]>();
  for (const f of (await readdir(themesDir)).filter(f => f !== 'taxonomy.json')) {
    const sc = JSON.parse(await readFile(join(themesDir, f), 'utf8'));
    for (const id of sc.themeIds) {
      (byTheme.get(id) ?? byTheme.set(id, []).get(id)!).push(sc.slug);
    }
  }

  for (const theme of taxonomy.themes) {
    const slugs = (byTheme.get(theme.id) ?? []).slice(0, 12);
    const postList = slugs.map(s => posts.get(s)).filter(Boolean) as PostMeta[];
    const titleList = postList.map(p => `- ${p.title} (${p.year})`).join('\n');
    const passages = postList.slice(0, 4).map(p => `[${p.title} (${p.year})]\n${p.excerpt}`).join('\n\n');

    process.stderr.write(`blurb: ${theme.id}\n`);
    theme.blurb = (await llama([
      { role: 'system', content: `${VOICE_PREAMBLE}\n\nTask: Write a single sentence (no more than 18 words) that names what is alive in this theme — what Matthew is actually doing when he returns to it. Output ONE sentence, no quotes, no markdown.` },
      { role: 'user', content: `Theme: ${theme.name}\n\nPosts:\n${titleList}\n\nSample passages:\n${passages}` }
    ], { maxTokens: 80, temperature: 0.5 })).trim().replace(/^["']|["']$/g, '');

    process.stderr.write(`synthesis: ${theme.id}\n`);
    theme.synthesis = (await llama([
      { role: 'system', content: `${VOICE_PREAMBLE}\n\nTask: Write 3-5 sentences synthesizing this theme across the archive. Cite posts by title and year. Note how the thread evolved if dates show evolution. Plain prose. Markdown links allowed in form [title](/blog/slug/).` },
      { role: 'user', content: `Theme: ${theme.name}\n\nPosts:\n${titleList}\n\nSample passages:\n${passages}` }
    ], { maxTokens: 350, temperature: 0.6 })).trim();
  }

  await writeFile(join(themesDir, 'taxonomy.json'), JSON.stringify(taxonomy, null, 2));
  process.stderr.write(`wrote blurbs + synthesis for ${taxonomy.themes.length} themes\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add npm script**

```json
"build:blurbs": "tsx scripts/04-write-theme-blurbs.ts"
```

- [ ] **Step 3: Smoke run on first 3 themes**

Temporarily slice in main: `for (const theme of taxonomy.themes.slice(0, 3))`. Run: `npm run build:blurbs`. Inspect the 3 blurbs/synthesis blocks for voice fidelity. If generic, iterate prompt.

- [ ] **Step 4: Full run**

Remove slice. Run: `npm run build:blurbs`.
Expected: ~5-15 min.

- [ ] **Step 5: Hand-review**

Open `taxonomy.json`. Scan each `blurb` + `synthesis`. Rewrite any that drift off-voice. This file ships verbatim to readers — quality bar high.

- [ ] **Step 6: Commit**

```bash
git add scripts/04-write-theme-blurbs.ts src/content/themes/taxonomy.json package.json
git commit -m "feat(muse): theme blurbs + synthesis in Muse voice"
```

---

## Phase 4 — Related Posts (build-time embeddings)

### Task 4.1: Embed posts

**Files:** `scripts/05-embed-posts.ts`, `package.json`

- [ ] **Step 1: Write script**

```ts
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { embed } from './lib/llm';

async function main() {
  const dir = 'src/content/blog';
  const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  const items: { slug: string; title: string; pubDate: string; text: string }[] = [];
  for (const f of files) {
    const raw = await readFile(join(dir, f), 'utf8');
    const { data, content } = matter(raw);
    if (data.draft) continue;
    const slug = data.slug ?? f.replace(/\.md$/, '');
    // One vector per post, from first ~1500 chars of body
    items.push({
      slug,
      title: data.title,
      pubDate: new Date(data.pubDate).toISOString(),
      text: content.slice(0, 1500)
    });
  }
  process.stderr.write(`embedding ${items.length} posts\n`);

  const vectors: Record<string, { values: number[]; title: string; pubDate: string }> = {};
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    const embeds = await embed(batch.map(b => b.text));
    for (let j = 0; j < batch.length; j++) {
      vectors[batch[j].slug] = { values: embeds[j], title: batch[j].title, pubDate: batch[j].pubDate };
    }
    process.stderr.write(`embedded ${Math.min(i + 50, items.length)}/${items.length}\n`);
  }

  await mkdir('.cache', { recursive: true });
  await writeFile('.cache/embeddings.json', JSON.stringify(vectors));
  process.stderr.write(`wrote .cache/embeddings.json\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add npm script**

```json
"build:embed": "tsx scripts/05-embed-posts.ts"
```

- [ ] **Step 3: Run**

Run: `npm run build:embed`
Expected: ~3-8 min, single JSON file at `.cache/embeddings.json` (~2 MB).

- [ ] **Step 4: Commit**

```bash
git add scripts/05-embed-posts.ts package.json
git commit -m "feat(build): embed all posts via Workers AI"
```

### Task 4.2: Compute related posts (test cosine)

**Files:** `tests/themes.test.ts` (extend), `scripts/06-compute-related.ts`, `package.json`

- [ ] **Step 1: Extend test file with cosine test**

Append to `tests/themes.test.ts`:
```ts
import { cosineSim, topK } from '../scripts/06-compute-related';

describe('cosineSim', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSim([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });
  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });
});

describe('topK', () => {
  it('returns top-K excluding self', () => {
    const vectors = { a: [1, 0], b: [0.9, 0.1], c: [0, 1], d: [-1, 0] };
    const result = topK('a', vectors as any, 2);
    expect(result.map(r => r.slug)).toEqual(['b', 'c']);
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- themes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement script**

`scripts/06-compute-related.ts`:
```ts
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function topK(slug: string, vectors: Record<string, { values: number[] }>, k: number): Array<{ slug: string; score: number }> {
  const me = vectors[slug];
  const scores: Array<{ slug: string; score: number }> = [];
  for (const [other, v] of Object.entries(vectors)) {
    if (other === slug) continue;
    scores.push({ slug: other, score: cosineSim(me.values, v.values) });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, k);
}

async function main() {
  const vectors = JSON.parse(await readFile('.cache/embeddings.json', 'utf8'));
  const themesDir = 'src/content/themes';
  const files = (await readdir(themesDir)).filter(f => f !== 'taxonomy.json');
  for (const f of files) {
    const sc = JSON.parse(await readFile(join(themesDir, f), 'utf8'));
    if (!vectors[sc.slug]) continue;
    const top = topK(sc.slug, vectors, 3);
    sc.related = top.map(t => ({ slug: t.slug, rationale: '' })); // rationale filled in step 5
    await writeFile(join(themesDir, f), JSON.stringify(sc, null, 2));
  }
  process.stderr.write(`computed related for ${files.length} sidecars\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Add npm script**

```json
"build:related": "tsx scripts/06-compute-related.ts"
```

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test -- themes.test.ts`
Expected: all pass.

- [ ] **Step 6: Run script**

Run: `npm run build:related`
Expected: all sidecars updated with 3 related slugs each.

- [ ] **Step 7: Commit**

```bash
git add scripts/06-compute-related.ts tests/themes.test.ts src/content/themes package.json
git commit -m "feat(build): compute top-3 related posts via cosine similarity"
```

### Task 4.3: Write related-post rationale (Llama)

**Files:** `scripts/07-write-rationale.ts`, `package.json`

- [ ] **Step 1: Write script**

```ts
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { llama } from './lib/llm';

const SOUL = await readFile('src/data/muse-soul.md', 'utf8');
const BIO = await readFile('src/data/matthew-bio.md', 'utf8');

const SYSTEM = `You are Muse, curator of Hologram Thoughts — Matthew Williamson's writing archive.

${SOUL}

What you know about Matthew:
${BIO}

Task: Given two posts, write a single short sentence (max 16 words) that says what reading the second after the first does — what thread it picks up, what it pushes into. No fluff. No "in this post". No "this article". No affirmation. Output ONE sentence, no quotes, no markdown.`;

async function loadPosts(): Promise<Map<string, { title: string; year: number; body: string }>> {
  const dir = 'src/content/blog';
  const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  const map = new Map<string, { title: string; year: number; body: string }>();
  for (const f of files) {
    const { data, content } = matter(await readFile(join(dir, f), 'utf8'));
    if (data.draft) continue;
    const slug = data.slug ?? f.replace(/\.md$/, '');
    map.set(slug, {
      title: data.title,
      year: new Date(data.pubDate).getFullYear(),
      body: content.replace(/[#>*_`\[\]()]/g, '').slice(0, 600)
    });
  }
  return map;
}

async function main() {
  const posts = await loadPosts();
  const themesDir = 'src/content/themes';
  const files = (await readdir(themesDir)).filter(f => f !== 'taxonomy.json');
  let done = 0;
  for (const f of files) {
    const sc = JSON.parse(await readFile(join(themesDir, f), 'utf8'));
    const me = posts.get(sc.slug);
    if (!me) continue;
    for (const r of sc.related) {
      if (r.rationale) continue; // idempotent
      const other = posts.get(r.slug);
      if (!other) continue;
      const text = await llama([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Post A: ${me.title} (${me.year})\n${me.body}\n\nPost B: ${other.title} (${other.year})\n${other.body}` }
      ], { maxTokens: 60, temperature: 0.6 });
      r.rationale = text.trim().replace(/^["']|["']$/g, '').replace(/\n+/g, ' ');
    }
    await writeFile(join(themesDir, f), JSON.stringify(sc, null, 2));
    done++;
    if (done % 20 === 0) process.stderr.write(`rationale: ${done}/${files.length}\n`);
  }
  process.stderr.write(`wrote rationale for ${done} sidecars\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add npm script + meta build script**

```json
"build:rationale": "tsx scripts/07-write-rationale.ts",
"build:muse": "npm run build:tag && npm run build:canonicalize && npm run build:bio && npm run build:blurbs && npm run build:embed && npm run build:related && npm run build:rationale"
```

- [ ] **Step 3: Smoke run on 5 sidecars first**

Temporarily slice `files.slice(0, 5)` in main. Run: `npm run build:rationale`. Read the 15 generated rationales. Iterate prompt if drifty.

- [ ] **Step 4: Full run**

Remove slice. Run: `npm run build:rationale`
Expected: ~15-30 min for ~279 × 3 = 837 calls.

- [ ] **Step 5: Hand-review (spot-check)**

Open ~10 random sidecars, read rationales. Edit any howlers directly in JSON.

- [ ] **Step 6: Commit**

```bash
git add scripts/07-write-rationale.ts src/content/themes package.json
git commit -m "feat(muse): related-post rationale in Muse voice"
```

---

## Phase 5 — Theme UI

### Task 5.1: ThemeChip (test first)

**Files:** `tests/components/ThemeChip.test.ts`, `src/components/ThemeChip.astro`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ThemeChip from '../../src/components/ThemeChip.astro';

describe('ThemeChip', () => {
  it('renders button with theme id and name', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ThemeChip, { props: { id: 'oneness', name: 'Oneness' } });
    expect(html).toContain('data-theme="oneness"');
    expect(html).toContain('Oneness');
  });
});
```

- [ ] **Step 2: Run, expect fail**

Run: `npm test -- ThemeChip.test.ts`

- [ ] **Step 3: Implement**

```astro
---
interface Props { id: string; name: string; }
const { id, name } = Astro.props;
---
<button
  type="button"
  class="theme-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-[var(--color-ink)] border border-[var(--glass-border)] bg-[color-mix(in_oklch,var(--color-sun)_12%,transparent)] hover:bg-[color-mix(in_oklch,var(--color-sun)_22%,transparent)] hover:shadow-[var(--shadow-bloom)] transition-all duration-[var(--dur-med)] ease-[cubic-bezier(0.22,1,0.36,1)]"
  data-theme={id}
  aria-label={`Explore theme: ${name}`}
>
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3" fill="currentColor" opacity="0.45"/></svg>
  <span>{name}</span>
</button>
```

- [ ] **Step 4: Run, expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeChip.astro tests/components/ThemeChip.test.ts
git commit -m "feat(themes): ThemeChip component"
```

### Task 5.2: ThemeChipStrip

**Files:** `src/components/ThemeChipStrip.astro`

- [ ] **Step 1: Implement**

```astro
---
import ThemeChip from './ThemeChip.astro';
import taxonomy from '../content/themes/taxonomy.json';

interface Props { themeIds: string[]; label?: string; }
const { themeIds, label = 'Threads in this post' } = Astro.props;
const themes = themeIds
  .map(id => (taxonomy as any).themes.find((t: any) => t.id === id))
  .filter(Boolean);
---
{themes.length > 0 && (
  <aside class="mt-16 pt-8 border-t border-[var(--glass-border)]">
    <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)] mb-4">{label}</p>
    <div class="flex flex-wrap gap-2">
      {themes.map((t: any) => <ThemeChip id={t.id} name={t.name} />)}
    </div>
  </aside>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ThemeChipStrip.astro
git commit -m "feat(themes): ThemeChipStrip"
```

### Task 5.3: RelatedPosts

**Files:** `src/components/RelatedPosts.astro`

- [ ] **Step 1: Implement**

```astro
---
import { getCollection } from 'astro:content';
import type { RelatedPost } from '../lib/themes';

interface Props { related: RelatedPost[]; }
const { related } = Astro.props;

const all = await getCollection('blog', ({ data }) => !data.draft);
const bySlug = new Map(all.map(p => [p.data.slug ?? p.id.replace(/\.md$/, ''), p]));
const items = related
  .map(r => ({ post: bySlug.get(r.slug), rationale: r.rationale }))
  .filter(x => x.post);
---
{items.length > 0 && (
  <aside class="mt-12 pt-8 border-t border-[var(--glass-border)]">
    <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)] mb-4">If this landed, try</p>
    <ul class="space-y-5">
      {items.map(({ post, rationale }) => (
        <li>
          <a href={`/blog/${post!.data.slug ?? post!.id.replace(/\.md$/, '')}/`} class="block group no-underline">
            <p class="text-[var(--color-ink)] group-hover:text-[var(--color-moss-deep)] transition-colors" style="font-family: var(--font-display);">
              {post!.data.title}
              <span class="text-xs text-[var(--color-ink-soft)] ml-2 align-middle">({new Date(post!.data.pubDate).getFullYear()})</span>
            </p>
            <p class="text-sm text-[var(--color-ink-soft)] mt-1 italic">{rationale}</p>
          </a>
        </li>
      ))}
    </ul>
  </aside>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RelatedPosts.astro
git commit -m "feat(muse): RelatedPosts block with Muse rationale"
```

### Task 5.4: Wire into blog posts

**Files:** `src/layouts/BlogPostLayout.astro`, `src/pages/blog/[slug].astro`

- [ ] **Step 1: Re-read current files**

Run: `cat src/layouts/BlogPostLayout.astro src/pages/blog/[slug].astro`

- [ ] **Step 2: Load sidecar in `[slug].astro`**

In frontmatter:
```astro
import type { PostSidecar } from '../../lib/themes';
let sidecar: PostSidecar = { slug: '', themeIds: [], related: [] };
try {
  const slug = entry.data.slug ?? entry.id.replace(/\.md$/, '');
  sidecar = (await import(`../../content/themes/${slug}.json`)).default;
} catch { /* no sidecar */ }
```

Pass to layout: `<BlogPostLayout ... themeIds={sidecar.themeIds} related={sidecar.related}>`

- [ ] **Step 3: Update BlogPostLayout**

Add to Props: `themeIds?: string[]; related?: any[];`
Imports:
```astro
import ThemeChipStrip from '../components/ThemeChipStrip.astro';
import RelatedPosts from '../components/RelatedPosts.astro';
```

After slot:
```astro
<div class="prose">
  <slot />
</div>
<ThemeChipStrip themeIds={themeIds} />
<RelatedPosts related={related ?? []} />
```

- [ ] **Step 4: Build + spot-check**

Run: `npm run build && npm run preview`
Open `localhost:4321/blog/the-holographic-universe/`. Confirm chip strip + related posts with rationale.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BlogPostLayout.astro src/pages/blog/[slug].astro
git commit -m "feat(themes): render chip strip + related posts on blog"
```

### Task 5.5: ThemeDrawer (static fetch)

**Files:** `src/components/ThemeDrawer.svelte`, `src/integrations/emit-theme-index.ts`, `astro.config.mjs`

- [ ] **Step 1: Write emit integration**

`src/integrations/emit-theme-index.ts`:
```ts
import type { AstroIntegration } from 'astro';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';

export function emitThemeIndex(): AstroIntegration {
  return {
    name: 'emit-theme-index',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const themeDir = 'src/content/themes';
        const blogDir = 'src/content/blog';
        const reverse: Record<string, string[]> = {};
        const meta: Record<string, { slug: string; title: string; pubDate: string }> = {};

        for (const f of (await readdir(themeDir)).filter(f => f.endsWith('.json') && f !== 'taxonomy.json')) {
          const sc = JSON.parse(await readFile(join(themeDir, f), 'utf8'));
          for (const id of sc.themeIds) {
            (reverse[id] ??= []).push(sc.slug);
          }
        }
        for (const bf of (await readdir(blogDir)).filter(f => f.endsWith('.md'))) {
          const { data } = matter(await readFile(join(blogDir, bf), 'utf8'));
          if (data.draft) continue;
          const slug = data.slug ?? bf.replace(/\.md$/, '');
          meta[slug] = { slug, title: data.title, pubDate: new Date(data.pubDate).toISOString() };
        }

        const themesOut = join(dir.pathname, 'themes');
        await mkdir(themesOut, { recursive: true });
        await writeFile(join(themesOut, 'reverse-index.json'), JSON.stringify(reverse));
        await writeFile(join(themesOut, 'post-meta.json'), JSON.stringify(meta));
      }
    }
  };
}
```

- [ ] **Step 2: Register in astro.config**

```js
import { emitThemeIndex } from './src/integrations/emit-theme-index.ts';
// integrations: [sitemap(), svelte(), pagefind(), emitThemeIndex()]
```

- [ ] **Step 3: Build, verify emitted**

Run: `npm run build && ls dist/themes/`
Expected: `reverse-index.json`, `post-meta.json`.

- [ ] **Step 4: Write drawer**

`src/components/ThemeDrawer.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import taxonomy from '../content/themes/taxonomy.json';

  let open = $state(false);
  let activeId: string | null = $state(null);
  let posts: { slug: string; title: string; pubDate: string }[] = $state([]);
  let loading = $state(false);

  const themeById = new Map((taxonomy as any).themes.map((t: any) => [t.id, t]));
  let reverseCache: Record<string, string[]> | null = null;
  let metaCache: Record<string, any> | null = null;

  async function openTheme(id: string) {
    activeId = id;
    open = true;
    loading = true;
    try {
      if (!reverseCache) {
        const [rev, meta] = await Promise.all([
          fetch('/themes/reverse-index.json').then(r => r.json()),
          fetch('/themes/post-meta.json').then(r => r.json())
        ]);
        reverseCache = rev;
        metaCache = meta;
      }
      const slugs = reverseCache![id] ?? [];
      posts = slugs.map(s => metaCache![s]).filter(Boolean).sort((a: any, b: any) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    } finally { loading = false; }
  }

  function close() { open = false; }

  onMount(() => {
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.theme-chip') as HTMLElement | null;
      if (!btn) return;
      const id = btn.dataset.theme;
      if (id) openTheme(id);
    };
    document.addEventListener('click', onClick);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  });

  const activeTheme = $derived(activeId ? themeById.get(activeId) as any : null);
</script>

{#if open}
  <div class="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
    <button class="absolute inset-0 bg-[var(--color-ink)]/30 backdrop-blur-sm" onclick={close} aria-label="close"></button>
    <aside class="relative w-full max-w-md h-full glass p-8 overflow-y-auto" style="border-radius: 14px 0 0 14px;">
      <button onclick={close} class="absolute top-4 right-4 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]" aria-label="close">✕</button>
      {#if activeTheme}
        <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">Thread</p>
        <h2 class="text-3xl mt-1 mb-3" style="font-family: var(--font-display);">{activeTheme.name}</h2>
        {#if activeTheme.blurb}<p class="text-[var(--color-ink-soft)] italic mb-3">{activeTheme.blurb}</p>{/if}
        {#if activeTheme.synthesis}<div class="text-sm text-[var(--color-ink)] mb-6 leading-relaxed">{activeTheme.synthesis}</div>{/if}
        <a href={`/themes/${activeTheme.id}/`} class="inline-block mb-8 text-sm text-[var(--color-moss-deep)] hover:text-[var(--color-sky-deep)]">Open the full thread →</a>
        {#if loading}
          <p class="text-[var(--color-ink-soft)]">…</p>
        {:else}
          <ul class="space-y-3">
            {#each posts as p}
              <li><a href={`/blog/${p.slug}/`} class="block group no-underline">
                <p class="text-[var(--color-ink)] group-hover:text-[var(--color-moss-deep)]">{p.title}</p>
                <p class="text-xs text-[var(--color-ink-soft)]">{new Date(p.pubDate).toLocaleDateString('en', { year: 'numeric', month: 'short' })}</p>
              </a></li>
            {/each}
          </ul>
        {/if}
      {/if}
    </aside>
  </div>
{/if}
```

(Mounted from Layout.astro Task 1.3.)

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeDrawer.svelte src/integrations/emit-theme-index.ts astro.config.mjs
git commit -m "feat(themes): drawer + build-time index emission"
```

---

## Phase 6 — Theme Landing Pages

### Task 6.1: Themes index

**Files:** `src/pages/themes/index.astro`

- [ ] **Step 1: Implement**

```astro
---
import Layout from '../../layouts/Layout.astro';
import taxonomy from '../../content/themes/taxonomy.json';
const themes = [...(taxonomy as any).themes].sort((a: any, b: any) => b.postCount - a.postCount);
---
<Layout title="Themes — Hologram Thoughts">
  <header class="mb-16">
    <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)] mb-2">From Muse</p>
    <h1 class="text-5xl tracking-tight" style="font-family: var(--font-display);">Threads in the archive</h1>
    <p class="text-lg text-[var(--color-ink-soft)] mt-4 max-w-xl">{themes.length} threads Matthew keeps returning to, grouped from twenty years of writing.</p>
  </header>
  <ul class="space-y-8">
    {themes.map((t: any) => (
      <li class="border-b border-[var(--glass-border)] pb-6">
        <a href={`/themes/${t.id}/`} class="block group no-underline">
          <div class="flex items-baseline justify-between gap-4">
            <h2 class="text-2xl group-hover:text-[var(--color-moss-deep)] transition-colors" style="font-family: var(--font-display);">{t.name}</h2>
            <span class="text-xs text-[var(--color-ink-soft)]">{t.postCount} posts</span>
          </div>
          {t.blurb && <p class="text-[var(--color-ink-soft)] mt-2 italic">{t.blurb}</p>}
        </a>
      </li>
    ))}
  </ul>
</Layout>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/themes/index.astro
git commit -m "feat(themes): themes index page"
```

### Task 6.2: Theme detail page

**Files:** `src/pages/themes/[id].astro`

- [ ] **Step 1: Implement**

```astro
---
import Layout from '../../layouts/Layout.astro';
import taxonomy from '../../content/themes/taxonomy.json';
import { getCollection } from 'astro:content';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function getStaticPaths() {
  const themes = (taxonomy as any).themes;
  const themeDir = 'src/content/themes';
  const byTheme: Record<string, string[]> = {};
  for (const f of (await readdir(themeDir)).filter(f => f.endsWith('.json') && f !== 'taxonomy.json')) {
    const sc = JSON.parse(await readFile(join(themeDir, f), 'utf8'));
    for (const id of sc.themeIds) {
      (byTheme[id] ??= []).push(sc.slug);
    }
  }
  return themes.map((t: any) => ({
    params: { id: t.id },
    props: { theme: t, slugs: byTheme[t.id] ?? [] }
  }));
}

const { theme, slugs } = Astro.props;
const all = await getCollection('blog', ({ data }) => !data.draft);
const bySlug = new Map(all.map(p => [p.data.slug ?? p.id.replace(/\.md$/, ''), p]));
const posts = slugs
  .map((s: string) => bySlug.get(s))
  .filter(Boolean)
  .sort((a: any, b: any) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
---
<Layout title={`${theme.name} — Hologram Thoughts`} description={theme.blurb}>
  <header class="mb-12">
    <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)] mb-2">Thread</p>
    <h1 class="text-5xl tracking-tight" style="font-family: var(--font-display);">{theme.name}</h1>
    {theme.blurb && <p class="text-xl text-[var(--color-ink-soft)] italic mt-4">{theme.blurb}</p>}
  </header>
  {theme.synthesis && (
    <div class="prose text-[var(--color-ink)] leading-relaxed mb-16" set:html={theme.synthesis.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>')} />
  )}
  <section>
    <h2 class="text-xl mb-6" style="font-family: var(--font-display);">{posts.length} posts, in order</h2>
    <ul class="space-y-6">
      {posts.map(p => {
        const slug = p!.data.slug ?? p!.id.replace(/\.md$/, '');
        return (
          <li>
            <a href={`/blog/${slug}/`} class="block group no-underline">
              <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
                {new Date(p!.data.pubDate).toLocaleDateString('en', { year: 'numeric', month: 'long' })}
              </p>
              <p class="text-xl mt-1 text-[var(--color-ink)] group-hover:text-[var(--color-moss-deep)] transition-colors" style="font-family: var(--font-display);">{p!.data.title}</p>
              {p!.data.description && <p class="text-sm text-[var(--color-ink-soft)] mt-1">{p!.data.description}</p>}
            </a>
          </li>
        );
      })}
    </ul>
  </section>
</Layout>
```

- [ ] **Step 2: Build + spot-check**

Run: `npm run build && npm run preview`
Visit `/themes/`. Click any theme. Confirm intro renders with Muse synthesis, posts listed chronologically.

- [ ] **Step 3: Commit**

```bash
git add src/pages/themes/[id].astro
git commit -m "feat(themes): per-theme landing page"
```

---

## Phase 7 — Homepage & Listings

### Task 7.1: PostCard

**Files:** `src/components/PostCard.astro`

- [ ] **Step 1: Write**

```astro
---
interface Props {
  slug: string;
  title: string;
  pubDate: Date;
  excerpt?: string;
  themeIds?: string[];
}
const { slug, title, pubDate, excerpt, themeIds = [] } = Astro.props;
import ThemeChip from './ThemeChip.astro';
import taxonomy from '../content/themes/taxonomy.json';
const themes = themeIds.slice(0, 3).map(id => (taxonomy as any).themes.find((t: any) => t.id === id)).filter(Boolean);
---
<a href={`/blog/${slug}/`} class="block group no-underline">
  <article class="p-6 rounded-2xl border border-transparent hover:border-[var(--glass-border)] hover:bg-[color-mix(in_oklch,var(--color-sun)_6%,transparent)] transition-all duration-[var(--dur-med)]">
    <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)] mb-2">
      {pubDate.toLocaleDateString('en', { year: 'numeric', month: 'long' })}
    </p>
    <h3 class="text-2xl text-[var(--color-ink)] group-hover:text-[var(--color-moss-deep)] transition-colors mb-2" style="font-family: var(--font-display);">{title}</h3>
    {excerpt && <p class="text-[var(--color-ink-soft)] text-sm leading-relaxed mb-3">{excerpt}</p>}
    {themes.length > 0 && (
      <div class="flex flex-wrap gap-2 mt-3">
        {themes.map((t: any) => <ThemeChip id={t.id} name={t.name} />)}
      </div>
    )}
  </article>
</a>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PostCard.astro
git commit -m "feat(design): PostCard component"
```

### Task 7.2: MuseHighlight (homepage block)

**Files:** `src/components/MuseHighlight.astro`

- [ ] **Step 1: Write**

```astro
---
interface Props {
  latestSlugs: string[];
  activeThemes: { id: string; name: string; blurb: string; postCount: number }[];
  storySlugs: string[];
}
const { latestSlugs, activeThemes, storySlugs } = Astro.props;
import { getCollection } from 'astro:content';
const all = await getCollection('blog', ({ data }) => !data.draft);
const bySlug = new Map(all.map(p => [p.data.slug ?? p.id.replace(/\.md$/, ''), p]));

const latest = latestSlugs.map(s => bySlug.get(s)).filter(Boolean);
const stories = storySlugs.map(s => bySlug.get(s)).filter(Boolean);
---
<section class="my-16">
  <header class="mb-8">
    <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)] mb-2">From Muse</p>
    <h2 class="text-4xl" style="font-family: var(--font-display);">What's alive in the archive</h2>
  </header>
  <div class="grid md:grid-cols-3 gap-8">
    <div>
      <h3 class="text-sm font-semibold mb-3 uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">Latest</h3>
      <ul class="space-y-3 text-sm">
        {latest.map(p => (
          <li><a href={`/blog/${p!.data.slug ?? p!.id.replace(/\.md$/, '')}/`} class="no-underline hover:text-[var(--color-moss-deep)]">
            <p>{p!.data.title}</p>
            <p class="text-xs text-[var(--color-ink-soft)]">{new Date(p!.data.pubDate).toLocaleDateString('en', { year: 'numeric', month: 'short' })}</p>
          </a></li>
        ))}
      </ul>
    </div>
    <div>
      <h3 class="text-sm font-semibold mb-3 uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">Threads</h3>
      <ul class="space-y-3 text-sm">
        {activeThemes.map(t => (
          <li>
            <a href={`/themes/${t.id}/`} class="no-underline">
              <p class="text-[var(--color-ink)] hover:text-[var(--color-moss-deep)]">{t.name} <span class="text-[var(--color-ink-soft)] text-xs">({t.postCount})</span></p>
              {t.blurb && <p class="text-xs text-[var(--color-ink-soft)] italic mt-0.5">{t.blurb}</p>}
            </a>
          </li>
        ))}
      </ul>
    </div>
    <div>
      <h3 class="text-sm font-semibold mb-3 uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">Stories</h3>
      <ul class="space-y-3 text-sm">
        {stories.map(p => (
          <li><a href={`/blog/${p!.data.slug ?? p!.id.replace(/\.md$/, '')}/`} class="no-underline hover:text-[var(--color-moss-deep)]">{p!.data.title}</a></li>
        ))}
      </ul>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MuseHighlight.astro
git commit -m "feat(home): MuseHighlight block"
```

### Task 7.3: Rebuild homepage

**Files:** `src/pages/index.astro`

- [ ] **Step 1: Replace contents**

```astro
---
import Layout from '../layouts/Layout.astro';
import MuseHighlight from '../components/MuseHighlight.astro';
import PostCard from '../components/PostCard.astro';
import { getCollection } from 'astro:content';
import taxonomy from '../content/themes/taxonomy.json';

const all = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

const slugOf = (p: any) => p.data.slug ?? p.id.replace(/\.md$/, '');

const latestSlugs = all.slice(0, 5).map(slugOf);
const storySlugs = all.filter(p => p.data.contentType === 'story').slice(0, 5).map(slugOf);

const activeThemes = [...(taxonomy as any).themes]
  .sort((a: any, b: any) => b.postCount - a.postCount)
  .slice(0, 6)
  .map((t: any) => ({ id: t.id, name: t.name, blurb: t.blurb, postCount: t.postCount }));

const featured = all.slice(0, 6);
const themeIdsBySlug: Record<string, string[]> = {};
for (const p of featured) {
  const s = slugOf(p);
  try {
    const sc = await import(`../content/themes/${s}.json`);
    themeIdsBySlug[s] = sc.default.themeIds ?? [];
  } catch {
    themeIdsBySlug[s] = [];
  }
}
---
<Layout title="Hologram Thoughts">
  <section class="mt-8 mb-16">
    <h1 class="text-6xl md:text-7xl tracking-tight leading-[1.05]" style="font-family: var(--font-display);">
      <span class="bg-gradient-to-br from-[var(--color-moss-deep)] via-[var(--color-sky-deep)] to-[var(--color-sun)] bg-clip-text text-transparent">An archive of attention.</span>
    </h1>
    <p class="text-lg text-[var(--color-ink-soft)] mt-6 max-w-xl leading-relaxed">
      Twenty years of writing on consciousness, dharma, fatherhood, code, and the strange edges of culture — kept here so it doesn't get lost in the scroll.
    </p>
  </section>

  <MuseHighlight latestSlugs={latestSlugs} activeThemes={activeThemes} storySlugs={storySlugs} />

  <section class="my-16">
    <h2 class="text-3xl mb-8" style="font-family: var(--font-display);">Recent</h2>
    <div class="space-y-2">
      {featured.map(p => {
        const s = slugOf(p);
        return <PostCard slug={s} title={p.data.title} pubDate={p.data.pubDate} themeIds={themeIdsBySlug[s]} />;
      })}
    </div>
  </section>
</Layout>
```

- [ ] **Step 2: Build + visual check**

Run: `npm run build && npm run preview`. Open `localhost:4321`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): solarpunk homepage with Muse highlight"
```

### Task 7.4: Restyle archive/categories/search

**Files:** `src/pages/archive/[...page].astro`, `src/pages/categories/[...].astro`, `src/pages/search.astro`

- [ ] **Step 1: Read all**

Run: `cat src/pages/archive/*.astro src/pages/categories/*.astro src/pages/search.astro`

- [ ] **Step 2: Replace listings with PostCard**

In each, replace terminal-styled markup with `<PostCard ... />` (import it). Keep all data-loading and pagination. Strip `→`, `read ./`, `ls -lt` framings.

For each post, attempt sidecar import for themeIds (mirror homepage pattern).

- [ ] **Step 3: Restyle search**

In `search.astro`: replace input styling with rounded glass-bordered input. Keep pagefind init untouched.

- [ ] **Step 4: Build + spot-check each**

Visit `/archive/1`, `/categories/dharma-writings`, `/search`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/archive src/pages/categories src/pages/search.astro
git commit -m "feat(design): restyle archive, categories, search"
```

### Task 7.5: Restyle BlogPostLayout

**Files:** `src/layouts/BlogPostLayout.astro`, `src/components/TableOfContents.astro`, `src/components/ReadingProgress.astro`

- [ ] **Step 1: Read current state**

Run: `cat src/layouts/BlogPostLayout.astro src/components/TableOfContents.astro src/components/ReadingProgress.astro`

- [ ] **Step 2: Strip terminal from BlogPostLayout**

Remove: `matt@samsara` PS1, scanlines, `→` prompts, heading `# ` pseudo-elements. Keep: title/date, slot, prev/next nav, series nav, ThemeChipStrip, RelatedPosts.

Replace post header:
```astro
<header class="mb-12">
  <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)] mb-3">
    {new Date(pubDate).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
    {readingTime && <span> · {readingTime} min</span>}
  </p>
  <h1 class="text-4xl md:text-5xl tracking-tight leading-[1.1] text-[var(--color-ink)]" style="font-family: var(--font-display);">{title}</h1>
  {description && <p class="text-lg text-[var(--color-ink-soft)] mt-4 leading-relaxed">{description}</p>}
</header>
```

- [ ] **Step 3: ReadingProgress**

Replace bar background:
```css
background: linear-gradient(90deg, var(--color-moss), var(--color-sky-deep), var(--color-sun));
```

- [ ] **Step 4: TOC**

Replace:
```astro
<nav class="glass p-4 text-sm">
  <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-soft)] mb-2">Contents</p>
  <ul class="space-y-1">
    <!-- preserved link rendering -->
  </ul>
</nav>
```

- [ ] **Step 5: Build + check long post**

Run: `npm run build && npm run preview`
Open `/blog/the-emergence-1/`. Verify: serif title, gradient progress, glass TOC, chips + related at end.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BlogPostLayout.astro src/components/TableOfContents.astro src/components/ReadingProgress.astro
git commit -m "feat(design): restyle blog post layout, TOC, reading progress"
```

---

## Phase 8 — Polish

### Task 8.1: Prose styles

**Files:** `src/styles/global.css`

- [ ] **Step 1: Append**

```css
.prose {
  font-size: 1.0625rem;
  line-height: 1.7;
  max-width: 65ch;
}
.prose h2 { font-size: 1.75rem; margin-top: 2.5em; margin-bottom: 0.6em; }
.prose h3 { font-size: 1.35rem; margin-top: 2em; margin-bottom: 0.5em; }
.prose p { margin: 1em 0; }
.prose a { color: var(--color-moss-deep); }
.prose a:hover { color: var(--color-sky-deep); }
.prose blockquote {
  border-left: 2px solid var(--color-sun);
  padding-left: 1.2em;
  margin: 1.4em 0;
  font-style: italic;
  color: var(--color-ink-soft);
}
.prose code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: color-mix(in oklch, var(--color-moss) 8%, transparent);
  padding: 0.15em 0.35em;
  border-radius: 4px;
}
.prose pre {
  background: color-mix(in oklch, var(--color-ink) 6%, transparent);
  padding: 1em 1.2em;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid var(--glass-border);
}
.prose pre code { background: none; padding: 0; }
.prose img { border-radius: 8px; margin: 1.5em 0; }
.prose ul, .prose ol { padding-left: 1.5em; }
.prose ul li { list-style: none; position: relative; }
.prose ul li::before { content: ""; position: absolute; left: -1em; top: 0.7em; width: 6px; height: 6px; border-radius: 50%; background: var(--color-moss); }
.prose hr { border: none; height: 1px; background: var(--glass-border); margin: 3em 0; }
```

- [ ] **Step 2: Verify**

Run: `npm run preview`. Open a post.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(design): prose styles for post content"
```

### Task 8.2: Mobile pass

**Files:** any with overflow

- [ ] **Step 1: Open at 375px**

Run: `npm run dev`. Devtools → 375px.

- [ ] **Step 2: Walk pages and fix**

Home, archive, categories, search, post, themes index, theme detail, drawer. Apply fixes inline as found.

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "feat(design): mobile pass"
```

### Task 8.3: Reduced-motion check

- [ ] **Step 1: Toggle in devtools**

Confirm motes stop. Confirm transitions essentially instant.

- [ ] **Step 2: Commit any fixes**

```bash
git commit -am "fix(a11y): respect reduced motion"
```

### Task 8.4: CLAUDE.md update

**Files:** `CLAUDE.md`

- [ ] **Step 1: Replace Design System section**

Remove "Far Future Dharma Terminal" section. Replace:

```md
## Design System — Solarpunk Editorial Archive

Bright, organic, glass-and-light. Solarpunk palette in OKLCH: moss green,
sun gold, sky cyan, warm bone-white. Serif display (Fraunces) + humanist
sans (Inter Tight) + mono (JetBrains Mono). Glass surfaces, ambient drifting
motes, hover blooms. All motion respects prefers-reduced-motion.

Design tokens: `src/styles/tokens.css`.
Base styles: `src/styles/global.css`.
Prose styles: `.prose` class on content wrappers.

### Muse — editorial voice (build-time only)

Muse is the curator-voice that animates auto-generated editorial copy. She
does not run at request time — she has no chat surface, no Worker, no
runtime LLM calls. Everything she "says" is generated at build, committed
as JSON/markdown, and hand-reviewable before deploy.

Persona docs in `src/data/`:
- `muse-soul.md` — identity, voice, stance (verbatim from author)
- `matthew-bio.md` — frozen biographical sketch derived from corpus
- `muse-build-prompts.md` — system prompts the build scripts use

Build outputs in `src/content/themes/`:
- `taxonomy.json` — themes with Muse-voice blurb + multi-sentence synthesis
- `<slug>.json` — per-post sidecar (themeIds + 3 related posts with Muse rationale)

### Build pipeline (idempotent, run from local laptop)

```sh
npm run build:muse   # full Muse pipeline (tag → canonicalize → bio → blurbs → embed → related → rationale)
npm run build        # Astro static build
```

Individual stages: `build:tag`, `build:canonicalize`, `build:bio`, `build:blurbs`, `build:embed`, `build:related`, `build:rationale`.

Build-time scripts call Workers AI for Llama 3.3 70B (themes) and Anthropic
for bio derivation (one-shot). Require env vars: `CF_ACCOUNT_ID`,
`CF_API_TOKEN`, `ANTHROPIC_API_KEY`. None of these ship to production.

### DO NOT

- Hardcode hex colors — use CSS variables from `tokens.css`
- Use terminal aesthetics (PS1, scanlines, monospace-as-default, dharma:// framing)
- Add runtime LLM calls — Muse stays build-time only
- Skip hand-review of generated text before commit — taxonomy.json and per-post sidecars ship verbatim
- Bypass the review gate — every deploy needs explicit user authorization
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for solarpunk + Muse build-time editorial"
```

### Task 8.5: Full test suite + build

- [ ] **Step 1: Tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Local preview**

Run: `npm run preview`
Open `localhost:4321`. Full walk:
- Home → hero, MuseHighlight three columns, recent cards
- Click chip → drawer slides in with synthesis + post list + "Open the full thread" link
- Open theme landing page → synthesis + chronological posts
- Open blog post → chips at end + related posts with rationale
- Toggle dark mode
- Mobile 375px

- [ ] **Step 4: Commit any fixes**

```bash
git commit -am "fix: pre-review cleanup"
```

---

## Phase 9 — Review Gate (STOP)

### Task 9.1: Hand the preview to the user

- [ ] **Step 1: Start preview**

Run: `npm run preview --port=4321` (background).

- [ ] **Step 2: Hand off checklist**

Tell the user:

> Preview at `localhost:4321`. Walk:
> 1. Homepage — gradient hero, MuseHighlight (latest / threads / stories), recent cards
> 2. A blog post — serif title, prose styles, chip strip + related-posts block with Muse rationale
> 3. Click a chip — drawer slides in: synthesis paragraph + post list + link to full theme page
> 4. `/themes/` index — full theme list with blurbs
> 5. `/themes/<id>/` — synthesis + chronological posts
> 6. Dark mode toggle
> 7. Mobile 375px
>
> Quality bar (everything below is shippable text — review it):
> - **`src/content/themes/taxonomy.json`** — read every `blurb` and `synthesis`. Edit any that drift off-voice. Don't ship slop.
> - **`src/data/matthew-bio.md`** — read and correct.
> - **Spot-check 10 sidecars** — open `src/content/themes/<random>.json` × 10, read the `related` rationales.
> - **Aesthetic**: solarpunk-archive, not cyberpunk-terminal?
> - **Motion**: motes too busy or just right?
>
> Do not deploy without explicit "yes, deploy" from the user.

- [ ] **Step 3: WAIT**

Do not proceed until explicit deploy authorization.

---

## Phase 10 — Deploy

### Task 10.1: Deploy

- [ ] **Step 1: Confirm authorization received**

Verify user wrote "yes, deploy" or equivalent.

- [ ] **Step 2: Build**

Run: `npm run build`

- [ ] **Step 3: Deploy**

Run: `npx wrangler pages deploy ./dist --project-name=hologramthoughts`

- [ ] **Step 4: Smoke**

```bash
curl -s https://hologramthoughts.com/ | grep -q "An archive of attention" && echo "home OK"
curl -s https://hologramthoughts.com/themes/ | grep -q "Threads in the archive" && echo "themes OK"
```

- [ ] **Step 5: Merge to main**

```bash
git checkout main
git merge --no-ff muse-rebuild -m "feat: solarpunk rebuild with Muse editorial voice"
git push origin main
```

- [ ] **Step 6: Done**

Notify user.

---

## Self-Review Notes

- **Spec coverage**: solarpunk aesthetic ✓ (Phase 1), Muse persona as editorial voice ✓ (Phases 3-4), hot theme references ✓ (Phase 5), corpus-bound + no chat ✓ (entire architecture is build-time), homepage curated highlights ✓ (Phase 7), theme landing pages ✓ (Phase 6), garden deferred ✓, no TTS ✓, no runtime LLM ✓, review gate ✓ (Phase 9).
- **No abuse surface**: zero runtime LLM. No worker, no chat, no streaming, no Vectorize-at-runtime, no KV-at-runtime. Visitors hit static HTML + JSON only. No Turnstile or rate limiting needed because there is nothing to abuse.
- **Cost**: ~$6 per full Muse pipeline rebuild on Cloudflare Workers AI + Anthropic. Runtime cost $0.
- **Type consistency**: `Theme`, `Taxonomy`, `PostSidecar`, `RelatedPost` defined in `src/lib/themes.ts`. `ProposedTags` in `scripts/02-canonicalize.ts` (exported for tests). `cosineSim`, `topK` in `scripts/06-compute-related.ts` (exported for tests).
- **Quality gates**: hand-review at taxonomy edit (Task 2.3), bio review (Task 3.2), blurbs + synthesis review (Task 3.3), rationale spot-check (Task 4.3), full preview review (Phase 9).
- **Idempotency**: every script can be re-run. Tag/canonicalize regenerates from scratch. Blurbs overwrite. Embed overwrites cache. Related overwrites related[]. Rationale skips entries with `r.rationale` already set.
- **Risks called out**: Llama voice may need prompt iteration (Tasks 2.3.3, 3.3.3, 4.3.3 explicitly call for smoke-then-iterate). Theme taxonomy quality gated by hand-review. Bio accuracy gated by hand-review.
