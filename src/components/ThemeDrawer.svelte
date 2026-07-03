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
    <aside class="relative w-full max-w-md h-full panel p-8 overflow-y-auto" style="border-radius: 14px 0 0 14px; border-left: 2px solid color-mix(in oklch, var(--color-magenta) 55%, transparent);">
      <button onclick={close} class="absolute top-4 right-4 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]" aria-label="close">✕</button>
      {#if activeTheme}
        <p class="text-xs uppercase tracking-[0.18em] text-[var(--color-magenta)]">Thread</p>
        <h2 class="text-3xl mt-1 mb-3" style="font-family: var(--font-display);">{activeTheme.name}</h2>
        {#if activeTheme.blurb}<p class="text-[var(--color-ink-soft)] italic mb-3">{activeTheme.blurb}</p>{/if}
        {#if activeTheme.synthesis}<div class="text-sm text-[var(--color-ink)] mb-6 leading-relaxed">{activeTheme.synthesis}</div>{/if}
        <a href={`/themes/${activeTheme.id}/`} class="inline-block mb-8 text-sm text-[var(--color-amber-bright)] hover:text-[var(--color-cyan)]">Open the full thread →</a>
        {#if loading}
          <p class="text-[var(--color-ink-soft)]">…</p>
        {:else}
          <ul class="space-y-3">
            {#each posts as p}
              <li><a href={`/blog/${p.slug}/`} class="block group no-underline">
                <p class="text-[var(--color-ink)] group-hover:text-[var(--color-cyan)]">{p.title}</p>
                <p class="text-xs text-[var(--color-ink-soft)]">{new Date(p.pubDate).toLocaleDateString('en', { year: 'numeric', month: 'short', timeZone: 'UTC' })}</p>
              </a></li>
            {/each}
          </ul>
        {/if}
      {/if}
    </aside>
  </div>
{/if}
