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
