<script lang="ts">
  /* The Long Arrival — an interactive lifeline timeline of the Hindu pantheon.
     Each deity fades in at first attestation and fades out as its cult recedes;
     click a lifeline to read its note. Committed-dark TokyoNight scope (`--pt-*`)
     so the piece reads the same in either site theme. Fonts resolve to the
     site's loaded JetBrains Mono (--font-mono) / Inter Tight (--font-ui). */

  type Cat = 'vedic' | 'vaishnava' | 'shaiva' | 'shakta' | 'liminal';
  type Span = [number, number, number, number]; // [start, end, startOpacity, endOpacity]
  type Deity = { n: string; s: string; c: Cat; first: string; note: string; spans: Span[] };
  type Group = { name: string; sub: string; deities: Deity[] };

  const T0 = -1500, T1 = 1200, SPAN = T1 - T0, X0 = 14;
  const pct = (y: number) => ((y - T0) / SPAN) * 100;
  const xp = (y: number) => X0 + ((100 - X0) * pct(y)) / 100;

  const COLORS: Record<Cat, string> = {
    vedic: '#ff9e64', vaishnava: '#e0af68', shaiva: '#7aa2f7', shakta: '#f7768e', liminal: '#73daca',
  };

  // opacity floor: prominence reads as intensity, nothing becomes invisible
  function rgba(hex: string, a: number): string {
    const a2 = 0.35 + a * 0.65;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a2})`;
  }

  const GROUPS: Group[] = [
    { name: 'The Vedic Old Guard', sub: 'dominant 1500–800 BCE', deities: [
      { n: 'Indra', s: 'इन्द्र', c: 'vedic', first: 'Rigveda, c. 1500–1200 BCE — 250 hymns, more than any other god', note: 'The undisputed king of the Vedic pantheon: storm, war, soma-drinking slayer of the serpent Vritra. He never disappears — he\'s demoted. In epic and Puranic literature he\'s an insecure heavenly administrator, repeatedly humbled by Krishna, Shiva, and ascetic sages. His lifeline stays visible but thin: present in stories, never again their hero.', spans: [[-1500, -500, 1, .85], [-500, 1200, .3, .18]] },
      { n: 'Agni', s: 'अग्नि', c: 'vedic', first: 'Rigveda, c. 1500–1200 BCE — ~200 hymns, the divine priest', note: 'God of fire and the mouth through which all offerings reach the gods. As the sacrifice-centered religion gave way to temple devotion, Agni contracted from major deity to ritual function — still invoked at every wedding and cremation, but no longer a protagonist of myth.', spans: [[-1500, -500, 1, .8], [-500, 1200, .25, .15]] },
      { n: 'Soma', s: 'सोम', c: 'vedic', first: 'Rigveda, c. 1500–1200 BCE — an entire mandala (Book 9) is his', note: 'Deified ritual plant-pressing and its ecstatic drink. When the soma rite faded, so did the god — later tradition quietly merged him with the moon (Chandra). One of the clearest cases of a deity whose existence depended on a specific ritual technology.', spans: [[-1500, -800, 1, .7], [-800, -300, .4, .08]] },
      { n: 'Varuna', s: 'वरुण', c: 'vedic', first: 'Rigveda, c. 1500–1200 BCE — guardian of ṛta, cosmic order', note: 'Early on, arguably the most theologically profound Vedic god: all-seeing enforcer of cosmic and moral law, closer to a supreme deity than Indra. By the epics he\'s been demoted to god of oceans and rivers — a regional administrator in a cosmos now run by others.', spans: [[-1500, -800, 1, .75], [-800, 1200, .28, .12]] },
      { n: 'Ushas', s: 'उषस्', c: 'vedic', first: 'Rigveda, c. 1500–1200 BCE — the dawn, in some of its finest poetry', note: 'Goddess of dawn, recipient of some of the Rigveda\'s most beautiful hymns. She has no later career at all — no epic role, no Puranic cult, no temples. The clearest example of a deity who simply ends when her stratum ends.', spans: [[-1500, -900, .9, .4], [-900, -500, .3, .04]] },
      { n: 'Mitra', s: 'मित्र', c: 'vedic', first: 'Rigveda, c. 1500–1200 BCE — usually paired with Varuna', note: 'God of contracts, friendship, and the honored bond. Faded from Indian worship early — while, remarkably, his Iranian twin Mithra went on to a massive second career in the Persian and Roman worlds. In India, effectively gone before Buddhism began.', spans: [[-1500, -1000, .85, .4], [-1000, -500, .25, .03]] },
    ]},
    { name: 'The Transformed', sub: 'minor Vedic figures who became supreme', deities: [
      { n: 'Vishnu', s: 'विष्णु', c: 'vaishnava', first: 'Rigveda (5 hymns, the "three strides") → supreme by the epics', note: 'A minor solar deity in the Rigveda, notable mainly for striding across the cosmos in three steps. His rise runs through the Brahmanas (identified with the sacrifice itself), then the epics fuse him with the hero-cults of Krishna and Rama via the avatar doctrine — an absorption engine that let Vaishnavism swallow rival gods rather than fight them.', spans: [[-1500, -900, .18, .3], [-900, -400, .4, .7], [-400, 1200, .9, 1]] },
      { n: 'Rudra → Shiva', s: 'रुद्र → शिव', c: 'shaiva', first: 'Rigveda (3–4 hymns, feared outsider) → Śvetāśvatara Upaniṣad, c. 400–200 BCE', note: 'Rudra is the Rigveda\'s dangerous outsider — howling, dwelling in wild places, prayed to mostly to stay away. "Shiva" ("auspicious one") began as a placating euphemism. The Shvetashvatara Upanishad elevates him to supreme God, and the Puranas complete the transformation, likely absorbing non-Vedic ascetic and yogic cults along the way.', spans: [[-1500, -800, .15, .25], [-800, -300, .35, .65], [-300, 1200, .85, 1]] },
      { n: 'Prajapati → Brahma', s: 'ब्रह्मा', c: 'liminal', first: 'Brahmanas, c. 900–700 BCE (as Prajapati, "lord of creatures")', note: 'A priestly abstraction — the creator principle — personified. Brahma peaks in the epic period as the trimurti\'s creator, then declines sharply: cursed in myth to receive almost no worship, he ends with a handful of temples in all of India. The only member of the trimurti whose lifeline fades out.', spans: [[-900, -200, .4, .85], [-200, 500, .8, .6], [500, 1200, .4, .15]] },
      { n: 'Saraswati', s: 'सरस्वती', c: 'liminal', first: 'Rigveda, as a sacred river; goddess of speech by the Brahmanas', note: 'Begins as a literal river, praised as a mighty goddess. As the river itself dried and shifted, she transformed through identification with Vāc (sacred speech) into the goddess of knowledge, music, and learning — one of the few Vedic deities to cross every stratum with prominence intact.', spans: [[-1500, -800, .55, .5], [-800, 1200, .6, .85]] },
      { n: 'Shri → Lakshmi', s: 'लक्ष्मी', c: 'vaishnava', first: 'Śrī Sūkta (late Vedic appendix), c. 1000–500 BCE', note: 'Śrī — radiance, sovereignty, fortune — appears in a late hymn appended to the Rigveda. Fused with Lakshmi and married into the Vaishnava system as Vishnu\'s consort, she becomes one of the most universally worshipped deities in India, crossing sectarian lines that stop the gods themselves.', spans: [[-800, -300, .35, .55], [-300, 1200, .7, .95]] },
    ]},
    { name: 'Epic Arrivals', sub: 'hero-cults enter the canon, c. 500 BCE – 400 CE', deities: [
      { n: 'Krishna', s: 'कृष्ण', c: 'vaishnava', first: 'Chāndogya Upaniṣad mentions "Krishna, son of Devakī"; full form in the Mahābhārata', note: 'Almost certainly a historical or legendary hero of the Vrishni clan whose independent cult was absorbed into Vaishnavism as Vishnu\'s eighth avatar. The Bhagavad Gita is the theological weld-point. His childhood mythology (Puranic, later) absorbed yet another stream — pastoral cowherd-god traditions.', spans: [[-600, -400, .25, .5], [-400, 1200, .85, 1]] },
      { n: 'Rama', s: 'राम', c: 'vaishnava', first: 'Rāmāyaṇa core, c. 500–200 BCE', note: 'Prince of Ayodhya whose epic became scripture. Early versions treat him as an ideal man; divinization as Vishnu\'s avatar deepens in the text\'s later layers. His devotional cult keeps growing for centuries beyond this chart\'s right edge.', spans: [[-500, -100, .4, .7], [-100, 1200, .8, 1]] },
      { n: 'Hanuman', s: 'हनुमान्', c: 'vaishnava', first: 'Rāmāyaṇa, c. 500–200 BCE', note: 'Enters the record fully formed in the Ramayana — possibly carrying older monkey-deity or wind-god (his father is Vayu) folk traditions. Notably his greatest prominence comes late: the devotional Hanuman of temples and the Hanuman Chalisa is largely a medieval flowering.', spans: [[-400, 400, .4, .6], [400, 1200, .7, .95]] },
      { n: 'Skanda', s: 'स्कन्द / कार्त्तिकेय', c: 'shaiva', first: 'Coins & Mahābhārata, c. 200 BCE – 100 CE', note: 'War-god who appears on Kushan-era coins and in the epic as the gods\' general — likely absorbing older warband and folk-spirit (graha) cults. Retrofitted into the Shaiva family as Shiva\'s son. Faded in the north after the Gupta era while becoming supreme in the Tamil south as Murugan.', spans: [[-200, 600, .5, .85], [600, 1200, .5, .35]] },
    ]},
    { name: 'Puranic Arrivals', sub: 'the newest gods, c. 100 – 600 CE', deities: [
      { n: 'Parvati', s: 'पार्वती', c: 'shakta', first: 'Epics & early Puranas; central by Kālidāsa\'s Kumārasambhava, c. 400 CE', note: 'Daughter of the mountain, consort of Shiva, mother of the Shaiva household. Later Vedic texts name a Umā Haimavatī, but Parvati as a developed mythological person is epic-and-after. Shakta theology then reads her as one face of the singular Great Goddess.', spans: [[-200, 300, .3, .6], [300, 1200, .75, .95]] },
      { n: 'Ganesha', s: 'गणेश', c: 'shaiva', first: 'Clear iconography & cult from the Gupta era, c. 400–500 CE', note: 'The most beloved god in the pantheon is also among its youngest. Earlier "Ganapati" references are ambiguous (troop-lords, sometimes obstacle-causing spirits to be appeased). The elephant-headed remover of obstacles emerges clearly only in the Gupta period — likely an absorbed folk or yaksha deity — then spreads with astonishing speed across every sect and to Southeast Asia.', spans: [[400, 700, .5, .85], [700, 1200, .9, 1]] },
      { n: 'Durga', s: 'दुर्गा', c: 'shakta', first: 'Hints from c. 100 CE; Devī Māhātmya, c. 400–600 CE', note: 'The buffalo-demon-slaying warrior goddess, likely synthesizing non-Vedic and village goddess traditions. The Devi Mahatmya is her manifesto: the gods, defeated, pool their powers to produce her — a myth that is itself a theological statement that the Goddess precedes and exceeds the male pantheon.', spans: [[100, 400, .25, .5], [400, 1200, .8, 1]] },
      { n: 'Kali', s: 'काली', c: 'shakta', first: 'Devī Māhātmya, c. 400–600 CE (as a battlefield emanation of Durga)', note: 'Earlier occurrences of the word (a flame-name in the Muṇḍaka Upaniṣad) aren\'t the goddess. Kali enters mythology springing from Durga\'s brow in battle — and her greatest devotional prominence, especially in Bengal, lies centuries beyond this chart\'s edge, still rising.', spans: [[400, 800, .4, .6], [800, 1200, .65, .85]] },
    ]},
  ];

  const STRATA = [
    { y0: -1500, label: 'RIGVEDA' },
    { y0: -900, label: 'BRAHMANAS · UPANISHADS' },
    { y0: -400, label: 'EPICS' },
    { y0: 300, label: 'PURANAS' },
  ];

  const TICKS = [-1500, -1000, -500, 0, 500, 1000];
  const tickLabel = (y: number) => (y < 0 ? `${Math.abs(y)} BCE` : y === 0 ? '0' : `${y} CE`);

  const LEGEND: [Cat | 'grad', string][] = [
    ['vedic', 'vedic old guard'], ['vaishnava', 'vaishnava orbit'], ['shaiva', 'shaiva orbit'],
    ['shakta', 'shakta / goddess'], ['liminal', 'liminal / crosses camps'], ['grad', 'opacity = prominence'],
  ];

  let active = $state<{ g: number; d: number } | null>(null);
  const open = $derived(active ? GROUPS[active.g].deities[active.d] : null);

  function select(g: number, d: number) { active = { g, d }; }
  function onKey(e: KeyboardEvent, g: number, d: number) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(g, d); }
  }
</script>

<div class="pt-root">
  <div class="pt-inner">
    <div class="pt-eyebrow">// <b>1500 BCE — 1200 CE</b> · four textual strata · rigveda → brahmanas → epics → puranas</div>

    <div class="pt-legend">
      {#each LEGEND as [c, label]}
        {#if c === 'grad'}
          <span><i class="pt-grad"></i> {label}</span>
        {:else}
          <span><i class="pt-dot" style="background:{COLORS[c]}"></i> {label}</span>
        {/if}
      {/each}
    </div>

    <div class="pt-chart-scroll">
      <div class="pt-chart">
        <div class="pt-strata" aria-hidden="true">
          {#each STRATA as s}
            <div class="pt-stratum" style="left:{xp(s.y0)}%"><div class="pt-slabel">{s.label}</div></div>
          {/each}
        </div>

        {#each GROUPS as g, gi}
          <div class="pt-group">
            <div class="pt-grouph">{g.name}<small>{g.sub}</small></div>
            {#each g.deities as d, di}
              <div
                class="pt-track {active?.g === gi && active?.d === di ? 'active' : ''}"
                role="button"
                tabindex="0"
                aria-label={`${d.n}, details`}
                onclick={() => select(gi, di)}
                onkeydown={(e) => onKey(e, gi, di)}
              >
                <div class="pt-tlabel">{d.n}<small>{d.s}</small></div>
                {#each d.spans as sp}
                  <div class="pt-band" style="left:{xp(sp[0])}%; width:{xp(sp[1]) - xp(sp[0])}%; background:linear-gradient(90deg,{rgba(COLORS[d.c], sp[2])},{rgba(COLORS[d.c], sp[3])})"></div>
                {/each}
                <div class="pt-marker" style="left:{xp(d.spans[0][0])}%; background:{COLORS[d.c]}"></div>
              </div>
            {/each}
          </div>
        {/each}
      </div>

      <div class="pt-axis">
        {#each TICKS as y}
          <div class="pt-tick" style="left:{xp(y)}%">{tickLabel(y)}</div>
        {/each}
      </div>
    </div>

    <div class="pt-detail {open ? 'open' : ''}" role="region" aria-live="polite">
      {#if open}
        <button class="pt-close" onclick={() => (active = null)}>close ✕</button>
        <h3>{open.n}<span>{open.s}</span></h3>
        <div class="pt-first">FIRST ATTESTED · {open.first}</div>
        <p>{open.note}</p>
      {/if}
    </div>

    <!-- print-only: full deity notes, since tapping can't exist on paper -->
    <section class="pt-appendix">
      <h4>appendix — deity notes</h4>
      <div class="pt-ah">// full detail for every lifeline above</div>
      {#each GROUPS as g}
        {#each g.deities as d}
          <div class="pt-aentry">
            <h5>{d.n}<span>{d.s}</span></h5>
            <div class="pt-afirst">FIRST ATTESTED · {d.first}</div>
            <p>{d.note}</p>
          </div>
        {/each}
      {/each}
    </section>
  </div>
</div>

<style>
  .pt-root {
    --pt-bg: #1a1b26; --pt-panel: #24283b; --pt-line: #414868;
    --pt-fg: #c0caf5; --pt-muted: #787fa8; --pt-faint: #565f89;
    --pt-blue: #7aa2f7; --pt-cyan: #7dcfff; --pt-magenta: #bb9af7;
    --pt-orange: #ff9e64; --pt-yellow: #e0af68; --pt-red: #f7768e;
    --pt-teal: #73daca; --pt-green: #9ece6a;
    color-scheme: dark;
    /* break out of the max-w-3xl prose column to a full-bleed dark band */
    width: 100vw;
    margin: 3.5rem 0;
    margin-left: calc(50% - 50vw);
    background: var(--pt-bg);
    color: var(--pt-fg);
    font-family: var(--font-ui);
    line-height: 1.7;
    border-top: 1px solid var(--pt-line);
    border-bottom: 1px solid var(--pt-line);
  }
  .pt-inner { max-width: 1080px; margin: 0 auto; padding: 36px 20px 8px; }
  .pt-root :global(*) { box-sizing: border-box; }

  .pt-eyebrow { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.06em; color: var(--pt-faint); margin-bottom: 20px; }
  .pt-eyebrow b { color: var(--pt-orange); font-weight: 400; }

  .pt-legend { display: flex; flex-wrap: wrap; gap: 12px 24px; padding: 4px 0 20px; font-family: var(--font-mono); font-size: 11px; color: var(--pt-muted); }
  .pt-legend span { display: flex; align-items: center; gap: 8px; }
  .pt-dot { width: 10px; height: 10px; border-radius: 3px; }
  .pt-grad { width: 46px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, rgba(122, 162, 247, 0.3), #7aa2f7); }

  .pt-chart-scroll { overflow-x: auto; padding-bottom: 8px; -webkit-overflow-scrolling: touch; }
  .pt-chart { min-width: 860px; position: relative; padding: 30px 0 0; }
  .pt-strata { position: absolute; inset: 0; pointer-events: none; }
  .pt-stratum { position: absolute; top: 0; bottom: 0; border-left: 1px dashed #33375a; }
  .pt-slabel { position: absolute; top: 0; left: 0; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; color: var(--pt-faint); background: var(--pt-bg); padding: 2px 8px; white-space: nowrap; }
  .pt-group { position: relative; }
  .pt-grouph { font-family: var(--font-mono); font-weight: 600; font-size: 14px; color: var(--pt-fg); margin: 30px 0 6px; position: relative; z-index: 2; }
  .pt-grouph::before { content: "❯ "; color: var(--pt-green); }
  .pt-grouph small { font-weight: 400; font-size: 10px; letter-spacing: 0.08em; color: var(--pt-faint); margin-left: 10px; }
  .pt-track { position: relative; height: 34px; margin: 3px 0; cursor: pointer; border-radius: 6px; transition: background 0.15s; }
  .pt-track:hover, .pt-track:focus-visible { background: rgba(192, 202, 245, 0.06); outline: none; }
  .pt-track.active { background: rgba(187, 154, 247, 0.12); }
  .pt-tlabel { position: absolute; left: 0; top: 50%; transform: translateY(-50%); font-family: var(--font-mono); font-size: 12.5px; color: var(--pt-fg); width: 118px; z-index: 2; white-space: nowrap; line-height: 1.25; }
  .pt-tlabel small { display: block; font-size: 10px; color: var(--pt-faint); font-weight: 400; }
  .pt-band { position: absolute; top: 50%; transform: translateY(-50%); height: 13px; border-radius: 4px; z-index: 1; box-shadow: 0 0 0 1px rgba(192, 202, 245, 0.1); }
  .pt-marker { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 5px; height: 21px; border-radius: 2px; z-index: 2; }

  .pt-axis { position: relative; height: 36px; border-top: 1px solid var(--pt-line); min-width: 860px; margin-top: 10px; }
  .pt-tick { position: absolute; top: 8px; transform: translateX(-50%); font-family: var(--font-mono); font-size: 10px; color: var(--pt-faint); }

  .pt-detail { position: sticky; bottom: 0; z-index: 10; background: var(--pt-panel); border-top: 2px solid var(--pt-magenta); padding: 20px; margin: 0 -20px; display: none; box-shadow: 0 -10px 26px rgba(0, 0, 0, 0.5); }
  .pt-detail.open { display: block; }
  .pt-detail h3 { font-family: var(--font-mono); font-weight: 600; font-size: 19px; color: var(--pt-fg); margin: 0; }
  .pt-detail h3::before { content: "❯ "; color: var(--pt-green); }
  .pt-detail h3 span { font-size: 11px; color: var(--pt-faint); font-weight: 400; margin-left: 10px; }
  .pt-detail p { font-size: 15px; color: #a9b1d6; margin: 8px 0 0; max-width: 760px; }
  .pt-first { font-family: var(--font-mono); font-size: 11px; margin-top: 10px; color: var(--pt-yellow); }
  .pt-close { position: absolute; top: 12px; right: 16px; background: none; border: 1px solid var(--pt-line); color: var(--pt-muted); font-family: var(--font-mono); font-size: 11px; padding: 4px 10px; border-radius: 4px; cursor: pointer; }
  .pt-close:hover { color: var(--pt-fg); border-color: var(--pt-muted); }

  .pt-appendix { display: none; }

  @media (max-width: 640px) {
    .pt-tlabel { width: 98px; font-size: 11.5px; }
  }
  @media print {
    .pt-root { width: auto; margin: 0; border: none; }
    .pt-chart-scroll { overflow: visible; }
    .pt-chart, .pt-axis { min-width: 0; width: 100%; }
    .pt-detail { display: none !important; }
    .pt-track { cursor: auto; }
    .pt-appendix { display: block; padding: 26px 0 10px; border-top: 1px solid var(--pt-line); margin-top: 20px; }
    .pt-appendix h4 { font-family: var(--font-mono); font-weight: 700; font-size: 16px; margin: 0 0 6px; }
    .pt-ah { font-family: var(--font-mono); font-size: 10px; color: var(--pt-faint); margin-bottom: 16px; }
    .pt-aentry { break-inside: avoid; margin: 14px 0; padding-left: 16px; border-left: 2px solid var(--pt-line); }
    .pt-aentry h5 { font-family: var(--font-mono); font-weight: 600; font-size: 13px; color: var(--pt-fg); margin: 0; }
    .pt-aentry h5 span { color: var(--pt-faint); font-weight: 400; margin-left: 8px; font-size: 10px; }
    .pt-afirst { font-family: var(--font-mono); font-size: 10px; color: var(--pt-yellow); margin: 2px 0 4px; }
    .pt-aentry p { font-size: 11.5px; color: #a9b1d6; line-height: 1.55; margin: 0; }
  }
</style>
