<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { rankEntries, type PaletteEntry } from '../utils/palette-rank';

  type Row =
    | { kind: 'entry'; e: PaletteEntry }
    | { kind: 'action'; label: string; hint: string; run: () => void };

  let open = $state(false);
  let query = $state('');
  let active = $state(0);
  let entries: PaletteEntry[] = $state([]);
  let loading = $state(false);
  let failed = $state(false);
  let input: HTMLInputElement | undefined = $state();
  let listEl: HTMLUListElement | undefined = $state();
  let lastFocus: HTMLElement | null = null;
  let reduced = false;

  const go = (url: string) => { window.location.href = url; };
  const fullText = () => go(`/search/?q=${encodeURIComponent(query.trim())}`);
  const randomPost = () => {
    const posts = entries.filter((e) => e.d);
    if (posts.length) go(posts[Math.floor(Math.random() * posts.length)].u);
  };

  const pages: Row[] = [
    { kind: 'action', label: 'Archive', hint: 'every post, by year', run: () => go('/archive/') },
    { kind: 'action', label: 'Themes', hint: 'threads that keep returning', run: () => go('/themes/') },
    { kind: 'action', label: 'Random post', hint: 'surprise me', run: randomPost },
    { kind: 'action', label: 'Home', hint: 'start over', run: () => go('/') },
  ];

  const rows: Row[] = $derived.by(() => {
    const q = query.trim();
    if (!q) {
      const latest = entries.filter((e) => e.d).slice(0, 5).map((e) => ({ kind: 'entry' as const, e }));
      return [...pages, ...latest];
    }
    const hits = rankEntries(entries, q, 10).map((e) => ({ kind: 'entry' as const, e }));
    return [
      ...hits,
      { kind: 'action', label: `Search full text for “${q}”`, hint: 'every word of every post', run: fullText },
    ];
  });

  $effect(() => {
    // Reset selection whenever the result set changes.
    rows;
    active = 0;
  });

  async function load() {
    if (entries.length || loading) return;
    loading = true;
    failed = false;
    try {
      const res = await fetch('/search-index.json');
      entries = await res.json();
    } catch {
      failed = true;
    } finally {
      loading = false;
    }
  }

  async function show() {
    if (open) return;
    lastFocus = document.activeElement as HTMLElement | null;
    open = true;
    document.documentElement.style.overflow = 'hidden';
    load();
    await tick();
    input?.focus();
    input?.select();
  }

  function hide() {
    if (!open) return;
    open = false;
    document.documentElement.style.overflow = '';
    lastFocus?.focus?.();
  }

  function choose(row: Row | undefined) {
    if (!row) return;
    if (row.kind === 'entry') go(row.e.u);
    else row.run();
  }

  async function move(delta: number) {
    if (!rows.length) return;
    active = (active + delta + rows.length) % rows.length;
    await tick();
    listEl?.querySelector(`#pal-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      if ((event.metaKey || event.ctrlKey) && query.trim()) fullText();
      else choose(rows[active]);
    }
    else if (event.key === 'Escape') { event.preventDefault(); hide(); }
    else if (event.key === 'Tab') {
      // Focus trap: the input is the only tabbable element; keep focus there.
      event.preventDefault();
      move(event.shiftKey ? -1 : 1);
    }
  }

  const typeLabel = (y?: string) => (y === 'theme' ? 'thread' : y ?? '');
  const yearOf = (d?: string) => (d ? d.slice(0, 4) : '');

  onMount(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onGlobalKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches('input, textarea, select, [contenteditable="true"]');
      const combo = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
      const slash = event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!combo && !slash) return;
      // On /search the page's own input is the better tool.
      const pageInput = document.querySelector<HTMLInputElement>('#search-input');
      if (pageInput) { event.preventDefault(); pageInput.focus(); pageInput.select(); return; }
      event.preventDefault();
      open ? hide() : show();
    };
    const onOpen = () => show();
    document.addEventListener('keydown', onGlobalKey);
    window.addEventListener('palette:open', onOpen);
    (window as any).__paletteReady = true;
    return () => {
      document.removeEventListener('keydown', onGlobalKey);
      window.removeEventListener('palette:open', onOpen);
      (window as any).__paletteReady = false;
    };
  });
</script>

{#if open}
  <div class="pal-backdrop" class:reduced onclick={hide} role="presentation"></div>
  <div class="pal" class:reduced role="dialog" aria-modal="true" aria-label="Search the archive">
    <div class="pal-field">
      <span class="pal-prompt" aria-hidden="true">›</span>
      <input
        bind:this={input}
        bind:value={query}
        onkeydown={onKey}
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="pal-list"
        aria-autocomplete="list"
        aria-activedescendant={rows.length ? `pal-opt-${active}` : undefined}
        placeholder="Search titles, threads, years…"
        autocomplete="off"
        spellcheck="false"
      />
      <button type="button" class="pal-esc" onclick={hide} aria-label="Close search">esc</button>
    </div>

    <ul id="pal-list" role="listbox" bind:this={listEl} aria-label="Results">
      {#if !query.trim()}
        <li class="pal-group" role="presentation">jump to</li>
      {/if}
      {#each rows as row, i (i)}
        {#if !query.trim() && i === pages.length}
          <li class="pal-group" role="presentation">latest</li>
        {/if}
        <li
          id={`pal-opt-${i}`}
          role="option"
          aria-selected={i === active}
          class:active={i === active}
          class:action={row.kind === 'action'}
          onmousemove={() => (active = i)}
          onclick={() => choose(row)}
        >
          {#if row.kind === 'entry'}
            <span class="pal-year">{yearOf(row.e.d) || '§'}</span>
            <span class="pal-main">
              <span class="pal-title">{row.e.t}</span>
              {#if row.e.x}<span class="pal-sub">{row.e.x}</span>{/if}
            </span>
            <span class="pal-type">{typeLabel(row.e.y)}</span>
          {:else}
            <span class="pal-year">→</span>
            <span class="pal-main">
              <span class="pal-title">{row.label}</span>
              <span class="pal-sub">{row.hint}</span>
            </span>
            <span class="pal-type"></span>
          {/if}
        </li>
      {/each}
      {#if query.trim() && rows.length === 1 && !loading}
        <li class="pal-empty" role="presentation">No titles or threads match. Full-text search reads every word.</li>
      {/if}
      {#if loading && !entries.length}
        <li class="pal-empty" role="presentation">Loading the index…</li>
      {/if}
      {#if failed}
        <li class="pal-empty" role="presentation">Couldn’t load the index. Full-text search still works.</li>
      {/if}
    </ul>

    <footer class="pal-foot" aria-hidden="true">
      <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
      <span><kbd>↵</kbd> open</span>
      <span><kbd>⌘↵</kbd> full text</span>
      <span><kbd>esc</kbd> close</span>
    </footer>
  </div>
{/if}

<style>
  .pal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: color-mix(in oklch, var(--color-bg) 62%, transparent);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    animation: fade 160ms ease-out;
  }
  .pal {
    position: fixed;
    z-index: 91;
    top: min(14vh, 8rem);
    left: 50%;
    width: min(40rem, calc(100vw - 1.5rem));
    max-height: min(34rem, calc(100dvh - 6rem));
    display: flex;
    flex-direction: column;
    transform: translateX(-50%);
    overflow: hidden;
    border: 1px solid var(--color-border-strong);
    border-radius: 14px;
    background:
      radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--color-magenta) 10%, transparent), transparent 40%),
      color-mix(in oklch, var(--color-bg-soft) 97%, transparent);
    box-shadow: 0 0 0 1px oklch(0 0 0 / 0.3), 0 30px 80px oklch(0 0 0 / 0.55);
    animation: rise 200ms var(--ease-grow);
  }
  .reduced, .reduced.pal { animation: none; }
  @keyframes fade { from { opacity: 0; } }
  @keyframes rise { from { opacity: 0; transform: translate(-50%, 8px) scale(0.985); } }

  .pal-field {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0.75rem 0.35rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }
  .pal-prompt { color: var(--color-green); font: 1.3rem var(--font-mono); }
  input {
    flex: 1;
    min-width: 0;
    height: 3.2rem;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--color-ink);
    font: 1.2rem var(--font-display);
  }
  input::placeholder { color: var(--color-ink-faint); }
  .pal-esc {
    padding: 0.2rem 0.45rem;
    border: 1px solid var(--color-border-strong);
    border-radius: 5px;
    background: transparent;
    color: var(--color-ink-faint);
    font: 0.65rem var(--font-mono);
    cursor: pointer;
  }
  .pal-esc:hover { color: var(--color-cyan); border-color: var(--color-cyan); }

  ul {
    margin: 0;
    padding: 0.4rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    list-style: none;
  }
  .pal-group {
    padding: 0.6rem 0.65rem 0.3rem;
    color: var(--color-magenta);
    font: 0.6rem var(--font-mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .pal-group::before { content: "// "; color: var(--color-ink-faint); }
  [role='option'] {
    display: grid;
    grid-template-columns: 2.6rem minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    min-height: 48px;
    padding: 0.5rem 0.65rem;
    border-radius: 8px;
    cursor: pointer;
  }
  [role='option'].active {
    background: color-mix(in oklch, var(--color-blue) 12%, transparent);
    box-shadow: inset 2px 0 var(--color-cyan);
  }
  .pal-year { color: var(--color-amber-bright); font: 0.68rem var(--font-mono); font-variant-numeric: tabular-nums; }
  .action .pal-year { color: var(--color-green); }
  .pal-main { display: flex; flex-direction: column; min-width: 0; }
  .pal-title {
    color: var(--color-ink);
    font: 480 1.02rem/1.25 var(--font-display);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .active .pal-title { color: var(--color-cyan); }
  .pal-sub {
    color: var(--color-ink-faint);
    font-size: 0.76rem;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pal-type { color: var(--color-magenta); font: 0.6rem var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.8; }
  .pal-empty { padding: 0.9rem 0.75rem; color: var(--color-ink-faint); font-size: 0.85rem; }

  .pal-foot {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.1rem;
    padding: 0.6rem 1rem;
    border-top: 1px solid var(--color-border);
    color: var(--color-ink-faint);
    font: 0.62rem var(--font-mono);
  }
  kbd {
    display: inline-block;
    min-width: 1.2rem;
    margin-right: 0.2rem;
    padding: 0.05rem 0.25rem;
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    text-align: center;
    font: inherit;
  }
  @media (max-width: 560px) {
    .pal { top: 0.75rem; max-height: calc(100dvh - 1.5rem); }
    .pal-foot { display: none; }
    .pal-type { display: none; }
    [role='option'] { grid-template-columns: 2.4rem minmax(0, 1fr); }
  }
</style>
