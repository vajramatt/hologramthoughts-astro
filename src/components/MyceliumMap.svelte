<script lang="ts">
  import { onMount } from 'svelte';

  type Station = { id: string; name: string; postCount: number; lane: number; x: number; y: number; isHub: boolean; below: boolean; blurb: string; synthesis: string };
  type Inter = { a: string; b: string; w: number };
  type Data = { stations: Station[]; interchanges: Inter[]; laneCount: number; yearTicks: { year: number | string; x: number }[] };
  let { data }: { data: Data } = $props();

  const stations = data.stations;
  const interchanges = data.interchanges;
  const yearTicks = data.yearTicks;

  // line colours — organic hues spanning gold → green → teal → blue → violet → amber
  const HUES = [78, 130, 170, 205, 260, 300, 45];
  const laneHue = (i: number) => HUES[i % HUES.length];
  const stationDia = (pc: number) => (5.5 + Math.sqrt(pc) * 2.1) * 2; // px
  const plain = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // markdown links → text

  let wrap: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let panelEl: HTMLDivElement | undefined = $state();
  const byId = new Map(stations.map((s) => [s.id, s]));

  // --- inline panel state ---
  let selectedId: string | null = $state(null);
  let posts: { slug: string; title: string; pubDate: string }[] = $state([]);
  let loading = $state(false);
  const selected = $derived(selectedId ? byId.get(selectedId) ?? null : null);

  // --- canvas highlight (plain vars, read inside the draw loop) ---
  let activeLane = -1, activeId: string | null = null;
  let selectedLane = -1;
  let kick: () => void = () => {}; // redraw once when the loop isn't running (reduced motion / offscreen)

  let revCache: Record<string, string[]> | null = null;
  let metaCache: Record<string, any> | null = null;

  async function select(s: Station) {
    if (selectedId === s.id) { closePanel(); return; }
    selectedId = s.id; selectedLane = s.lane; activeLane = s.lane; activeId = s.id;
    kick();
    loading = true; posts = [];
    try {
      if (!revCache) {
        const [r, m] = await Promise.all([
          fetch('/themes/reverse-index.json').then((x) => x.json()),
          fetch('/themes/post-meta.json').then((x) => x.json())
        ]);
        revCache = r; metaCache = m;
      }
      posts = (revCache![s.id] ?? [])
        .map((x) => metaCache![x])
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    } finally { loading = false; }
    requestAnimationFrame(() => panelEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }
  function closePanel() { selectedId = null; selectedLane = -1; activeLane = -1; activeId = null; kick(); }
  const hover = (s: Station) => () => { activeLane = s.lane; activeId = s.id; kick(); };
  const unhover = () => { activeLane = selectedLane; activeId = selectedId; kick(); };

  onMount(() => {
    const ctx = canvas.getContext('2d')!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, dpr = 1;
    let lanes: { hue: number; samples: { x: number; y: number }[] }[] = [];

    let cFaint = '', isLight = false;
    const readColors = () => {
      cFaint = getComputedStyle(document.documentElement).getPropertyValue('--color-ink-faint').trim();
      isLight = document.documentElement.dataset.theme === 'light';
    };
    const withA = (col: string, a: number) => {
      const m = col.match(/oklch\(([^)]+)\)/i);
      return m ? `oklch(${m[1].split('/')[0].trim()} / ${a})` : col;
    };
    // canvas hues track the theme: parchment needs darker, punchier strokes than forest-dark
    const hue = (h0: number, l: number, c: number, a: number) => isLight
      ? `oklch(${Math.max(0.42, l - 0.26)} ${Math.min(0.2, c + 0.03)} ${h0} / ${Math.min(1, a * 1.2)})`
      : `oklch(${l} ${c} ${h0} / ${a})`;
    readColors();
    const themeObs = new MutationObserver(() => { readColors(); kick(); });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const catmull = (P: { x: number; y: number }[], segs: number) => {
      if (P.length < 2) return P.slice();
      const out: { x: number; y: number }[] = [];
      for (let i = 0; i < P.length - 1; i++) {
        const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
        for (let s = 0; s < segs; s++) {
          const t = s / segs, t2 = t * t, t3 = t2 * t;
          out.push({
            x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
          });
        }
      }
      out.push(P[P.length - 1]);
      return out;
    };

    const build = () => {
      const r = wrap.getBoundingClientRect();
      w = Math.max(300, r.width); h = Math.max(360, r.height);
      dpr = devicePixelRatio || 1;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lanes = [];
      for (let i = 0; i < data.laneCount; i++) {
        const pts = stations.filter((s) => s.lane === i).sort((a, b) => a.x - b.x).map((s) => ({ x: s.x * w, y: s.y * h }));
        lanes.push({ hue: laneHue(i), samples: pts.length >= 2 ? catmull(pts, 26) : pts });
      }
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      for (const yt of yearTicks) {
        const x = yt.x * w;
        ctx.beginPath(); ctx.moveTo(x, h * 0.05); ctx.lineTo(x, h * 0.92);
        ctx.strokeStyle = withA(cFaint, 0.06); ctx.lineWidth = 1; ctx.stroke();
      }

      // underweb: every cross-line bond, faded by weight. While a station is active its
      // own bonds are pulled out and drawn on top (after the lanes) so the web becomes
      // an answer — "this thread also runs through these" — instead of background noise.
      const hiEdges: Inter[] = [];
      for (const e of interchanges) {
        const a = byId.get(e.a), b = byId.get(e.b);
        if (!a || !b) continue;
        if (activeId && (e.a === activeId || e.b === activeId)) { hiEdges.push(e); continue; }
        const ax = a.x * w, ay = a.y * h, bx = b.x * w, by = b.y * h;
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        let alpha = Math.min(0.26, 0.03 + (e.w - 1) * 0.05);
        if (activeId) alpha *= 0.35;
        ctx.beginPath(); ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(mx, my - Math.abs(bx - ax) * 0.06, bx, by);
        ctx.strokeStyle = withA(cFaint, alpha); ctx.lineWidth = 0.6 + Math.min(e.w, 8) * 0.12; ctx.stroke();
      }

      lanes.forEach((ln, i) => {
        const S = ln.samples;
        if (S.length < 1) return;
        const dim = activeLane >= 0 && i !== activeLane;
        const lit = activeLane === i;
        const aMul = dim ? 0.3 : 1;
        if (S.length >= 2) {
          ctx.beginPath(); ctx.moveTo(S[0].x, S[0].y);
          for (const p of S) ctx.lineTo(p.x, p.y);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.strokeStyle = hue(ln.hue, 0.82, 0.14, dim ? 0.03 : lit ? 0.14 : 0.08); ctx.lineWidth = lit ? 11 : 8; ctx.stroke();
          ctx.strokeStyle = hue(ln.hue, 0.78, 0.13, dim ? 0.12 : lit ? 0.6 : 0.4); ctx.lineWidth = lit ? 2.8 : 2.2; ctx.stroke();
          // spores drifting forward through time (left → right)
          const count = Math.max(2, Math.round(S.length / 32));
          for (let k = 0; k < count; k++) {
            const tp = reduced ? k / count : (k / count + t * 0.05) % 1;
            const p = S[Math.min(S.length - 1, Math.floor(tp * (S.length - 1)))];
            ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fillStyle = hue(ln.hue, 0.85, 0.14, 0.18 * aMul); ctx.fill();
            ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fillStyle = hue(ln.hue, 0.9, 0.15, 0.95 * aMul); ctx.fill();
          }
        }
        // living tip — the line's most recent point pulses in its own colour
        const end = S[S.length - 1];
        if (reduced) {
          ctx.beginPath(); ctx.arc(end.x, end.y, 11, 0, Math.PI * 2);
          ctx.strokeStyle = hue(ln.hue, 0.85, 0.14, 0.32 * aMul); ctx.lineWidth = 1.5; ctx.stroke();
        } else {
          for (let r = 0; r < 2; r++) {
            const ph = (t * 0.38 + r * 0.5 + i * 0.13) % 1; // expanding 0→1, two rings offset for a steady ping
            ctx.beginPath(); ctx.arc(end.x, end.y, 7 + ph * 19, 0, Math.PI * 2);
            ctx.strokeStyle = hue(ln.hue, 0.85, 0.14, (1 - ph) * 0.42 * aMul); ctx.lineWidth = 2; ctx.stroke();
          }
        }
      });

      // active station's bonds, on top: edge fades from this line's colour to the far
      // line's colour, and the far station gets a halo ring in its own colour
      for (const e of hiEdges) {
        const a = byId.get(e.a)!, b = byId.get(e.b)!;
        const far = a.id === activeId ? b : a;
        const ax = a.x * w, ay = a.y * h, bx = b.x * w, by = b.y * h;
        const g = ctx.createLinearGradient(ax, ay, bx, by);
        g.addColorStop(0, hue(laneHue(a.lane), 0.8, 0.13, 0.55));
        g.addColorStop(1, hue(laneHue(b.lane), 0.8, 0.13, 0.55));
        ctx.beginPath(); ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - Math.abs(bx - ax) * 0.06, bx, by);
        ctx.strokeStyle = g; ctx.lineWidth = 1 + Math.min(e.w, 8) * 0.18; ctx.stroke();
        ctx.beginPath(); ctx.arc(far.x * w, far.y * h, stationDia(far.postCount) / 2 + 5, 0, Math.PI * 2);
        ctx.strokeStyle = hue(laneHue(far.lane), 0.82, 0.14, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
      }
    };

    let raf = 0, running = false, tLast = 0;
    const t0 = performance.now();
    const tick = () => { tLast = (performance.now() - t0) / 1000; draw(tLast); raf = requestAnimationFrame(tick); };
    const start = () => { if (!running && !reduced) { running = true; raf = requestAnimationFrame(tick); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    kick = () => { if (!running) draw(tLast); };

    build();
    draw(0);
    // only animate while the map is actually in view
    const io = new IntersectionObserver((ents) => { for (const en of ents) en.isIntersecting ? start() : stop(); }, { rootMargin: '100px' });
    io.observe(wrap);

    const ro = new ResizeObserver(() => { build(); if (!running) draw(tLast); });
    ro.observe(wrap);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', onKey);

    return () => { stop(); io.disconnect(); ro.disconnect(); themeObs.disconnect(); document.removeEventListener('keydown', onKey); };
  });
</script>

<div class="mapwrap">
  <div class="scroller">
    <div bind:this={wrap} class="submap" role="group" aria-label="Mycelial subway map of themes across the years">
      <canvas bind:this={canvas} aria-hidden="true"></canvas>

      {#each stations as s (s.id)}
        <button
          class="station"
          class:hub={s.isHub}
          class:below={s.below}
          class:lit={selectedId === s.id}
          style={`left:${s.x * 100}%; top:${s.y * 100}%; --hue:${laneHue(s.lane)}; --d:${stationDia(s.postCount)}px`}
          aria-label={`${s.name}, ${s.postCount} ${s.postCount === 1 ? 'post' : 'posts'}`}
          aria-expanded={selectedId === s.id}
          onclick={() => select(s)}
          onmouseenter={hover(s)}
          onmouseleave={unhover}
          onfocus={hover(s)}
          onblur={unhover}
        >
          <span class="dot" aria-hidden="true"></span>
          <span class="label">{s.name}</span>
        </button>
      {/each}

      {#each yearTicks as yt}
        <span class="yeartick" style={`left:${yt.x * 100}%`} aria-hidden="true">{yt.year}</span>
      {/each}
    </div>
  </div>

  {#if selected}
    <div bind:this={panelEl} class="panel" style={`--hue:${laneHue(selected.lane)}`} role="region" aria-label={`${selected.name} thread`}>
      <div class="panel-inner">
        <button class="panel-close" onclick={closePanel} aria-label="Close">✕</button>
        <p class="eyebrow">Thread · {selected.postCount} {selected.postCount === 1 ? 'post' : 'posts'}</p>
        <h3 class="panel-title">{selected.name}</h3>
        {#if selected.blurb}<p class="panel-blurb">{selected.blurb}</p>{/if}
        {#if selected.synthesis}<p class="panel-synth">{plain(selected.synthesis)}</p>{/if}
        <a class="panel-link" href={`/themes/${selected.id}/`}>Open the full thread →</a>

        {#if loading}
          <p class="panel-loading">…</p>
        {:else}
          <ul class="panel-posts">
            {#each posts as p (p.slug)}
              <li>
                <a href={`/blog/${p.slug}/`}>
                  <span class="pt">{p.title}</span>
                  <span class="pd">{new Date(p.pubDate).toLocaleDateString('en', { year: 'numeric', month: 'short', timeZone: 'UTC' })}</span>
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .mapwrap { width: 100%; }
  .scroller { width: 100%; overflow-x: auto; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
  .submap { position: relative; width: 100%; min-width: 56rem; height: clamp(520px, 64vh, 760px); }
  canvas { position: absolute; inset: 0; pointer-events: none; }

  .station {
    position: absolute;
    /* hit area never shrinks below a touch target; the visible dot is the inner span */
    width: max(var(--d), 28px);
    height: max(var(--d), 28px);
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: transparent;
    transform: translate(-50%, -50%);
    cursor: pointer;
    --l-hi: 0.9;
    --l-mid: 0.78;
  }
  :global([data-theme='light']) .station { --l-hi: 0.62; --l-mid: 0.48; }
  .dot {
    display: block;
    width: var(--d);
    height: var(--d);
    border-radius: 50%;
    background: radial-gradient(
      circle at 36% 34%,
      oklch(var(--l-hi) 0.14 var(--hue)),
      oklch(var(--l-mid) 0.13 var(--hue)) 54%,
      oklch(var(--l-mid) 0.13 var(--hue) / 0.35) 78%,
      transparent 82%
    );
    box-shadow: 0 0 9px oklch(var(--l-mid) 0.13 var(--hue) / 0.4);
    transition: transform var(--dur-fast) var(--ease-grow), box-shadow var(--dur-fast) var(--ease-grow);
  }
  .station.hub .dot { box-shadow: 0 0 0 2px oklch(var(--l-mid) 0.13 var(--hue) / 0.5), 0 0 14px oklch(var(--l-mid) 0.13 var(--hue) / 0.45); }
  .station:hover .dot,
  .station:focus-visible .dot,
  .station.lit .dot {
    transform: scale(1.2);
    box-shadow: 0 0 0 2px var(--color-border-strong), 0 0 22px oklch(var(--l-mid) 0.14 var(--hue) / 0.65);
  }

  .label {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 3px); /* above the station by default; .below flips it */
    transform: translateX(-50%);
    white-space: nowrap;
    font-family: var(--font-ui);
    font-size: 0.68rem;
    letter-spacing: 0.01em;
    line-height: 1;
    color: var(--color-ink-soft);
    opacity: 0.55;
    /* halo so labels stay readable where they cross lines or the underweb */
    text-shadow: 0 0 4px var(--color-bg), 0 0 4px var(--color-bg), 0 0 6px var(--color-bg);
    pointer-events: none;
    transition: color var(--dur-fast) var(--ease-grow), opacity var(--dur-fast) var(--ease-grow);
  }
  .station.below .label { bottom: auto; top: calc(100% + 3px); }
  .station.hub .label { opacity: 0.85; font-weight: 500; }
  .station:hover .label,
  .station:focus-visible .label,
  .station.lit .label { color: var(--color-ink); opacity: 1; }

  .yeartick {
    position: absolute;
    bottom: 4px;
    transform: translateX(-50%);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--color-ink-faint);
    pointer-events: none;
  }

  /* --- inline panel below the map --- */
  .panel {
    width: 100%;
    margin-top: -1rem;
    display: flex;
    justify-content: center;
    animation: panel-grow var(--dur-med) var(--ease-grow);
  }
  @keyframes panel-grow { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
  .panel-inner {
    position: relative;
    width: min(56rem, 92vw);
    background: var(--membrane-bg);
    backdrop-filter: blur(var(--membrane-blur));
    border: 1px solid var(--color-border);
    border-top: 2px solid oklch(0.78 0.13 var(--hue) / 0.6);
    border-radius: 14px;
    padding: 1.6rem 1.8rem 1.8rem;
    box-shadow: var(--shadow-deep);
  }
  .panel-close {
    position: absolute; top: 0.8rem; right: 0.9rem;
    background: transparent; border: 0; cursor: pointer;
    color: var(--color-ink-soft); font-size: 0.95rem;
  }
  .panel-close:hover { color: var(--color-ink); }
  .eyebrow { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.18em; color: var(--color-ink-soft); }
  .panel-title { font-family: var(--font-display); font-size: 1.9rem; line-height: 1.1; margin: 0.15rem 0 0.5rem; }
  .panel-blurb { font-family: var(--font-display); font-style: italic; color: var(--color-ink-soft); margin-bottom: 0.6rem; }
  .panel-synth { color: var(--color-ink); line-height: 1.65; margin-bottom: 0.9rem; max-width: 44rem; }
  .panel-link { display: inline-block; margin-bottom: 1.2rem; font-size: 0.85rem; color: var(--color-spore-bright); }
  .panel-link:hover { color: var(--color-bioluminescent); }
  .panel-loading { color: var(--color-ink-soft); }

  .panel-posts {
    list-style: none; padding: 0; margin: 0;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 0.5rem 1.5rem;
    border-top: 1px solid var(--color-border); padding-top: 1rem;
  }
  .panel-posts a { display: flex; flex-direction: column; text-decoration: none; padding: 0.25rem 0; }
  .panel-posts .pt { color: var(--color-ink); line-height: 1.3; }
  .panel-posts a:hover .pt { color: var(--color-bioluminescent); }
  .panel-posts .pd { font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-ink-faint); }

  @media (max-width: 720px) {
    .label { font-size: 0.62rem; }
    /* on small screens only hub labels stay on by default — the rest reveal on touch/focus */
    .station:not(.hub):not(:hover):not(:focus-visible):not(.lit) .label { opacity: 0; }
    .panel-inner { padding: 1.3rem 1.2rem 1.4rem; }
    .panel-title { font-size: 1.55rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dot, .label { transition: none; }
    .panel { animation: none; }
  }
</style>
