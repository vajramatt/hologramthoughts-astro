<script lang="ts">
  import { onMount } from 'svelte';
  let canvas: HTMLCanvasElement;
  let raf = 0;

  onMount(() => {
    const ctx = canvas.getContext('2d')!;
    const dpr = devicePixelRatio || 1;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0;
    // Spore-gold (75°), mycelial-violet (295°), bioluminescent-teal (175°)
    const hues = [75, 75, 75, 75, 75, 175, 175, 295];
    const motes = Array.from({ length: reduced ? 0 : 18 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      r: 0.8 + Math.random() * 2.0,
      vx: (Math.random() - 0.5) * 0.00009,
      vy: -0.00004 - Math.random() * 0.00010,
      hue: hues[i % hues.length],
      prismatic: i % 12 === 0  // rare prismatic-shimmer mote
    }));
    const resize = () => {
      w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    addEventListener('resize', resize);
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy;
        if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
        if (m.x < -0.05) m.x = 1.05; if (m.x > 1.05) m.x = -0.05;
        const hue = m.prismatic ? (m.hue + Math.sin(t * 0.3) * 60) : m.hue;
        ctx.beginPath();
        ctx.fillStyle = `oklch(0.78 0.13 ${hue} / 0.28)`;
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
