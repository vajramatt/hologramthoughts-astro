<script lang="ts">
  import { onMount } from 'svelte';
  let canvas: HTMLCanvasElement;
  let raf = 0;

  onMount(() => {
    const ctx = canvas.getContext('2d')!;
    const dpr = devicePixelRatio || 1;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0;

    // Data packets on invisible circuit traces — the ambient twin of the homepage
    // transit map: thoughts in motion through a network. Square heads, straight
    // runs, 45°/90° bends, short fading trails. TokyoNight signal palette:
    // cyan dominant, blue/magenta/green accents. No gold — the spores are gone.
    const hues = [230, 230, 230, 230, 265, 265, 305, 130];
    const OCT = Math.PI / 4; // headings snap to 45° increments

    type Packet = {
      x: number; y: number; dir: number; speed: number; hue: number;
      trail: { x: number; y: number }[];
      trailLen: number; nextTurn: number; life: number; maxLife: number;
    };

    const spawn = (): Packet => ({
      x: Math.random() * w,
      y: Math.random() * h,
      dir: ((Math.random() * 8) | 0) * OCT,
      speed: 40 + Math.random() * 50,           // px/s
      hue: hues[(Math.random() * hues.length) | 0],
      trail: [],
      trailLen: 70 + Math.random() * 60,        // px of fading tail
      nextTurn: 120 + Math.random() * 280,      // px until the next bend
      life: 0,
      maxLife: 9 + Math.random() * 8,           // s, then fade + respawn
    });

    let packets: Packet[] = [];
    const seed = () => {
      const count = reduced ? 0 : Math.max(8, Math.min(16, Math.round((w * h) / 110000)));
      packets = Array.from({ length: count }, spawn);
    };

    const resize = () => {
      w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);
      if (!packets.length) seed();
    };
    resize();
    addEventListener('resize', resize);

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp: rAF pauses in bg tabs
      last = now;
      ctx.clearRect(0, 0, w, h);

      for (let p = 0; p < packets.length; p++) {
        const m = packets[p];
        m.life += dt;
        const dist = m.speed * dt;
        m.x += Math.cos(m.dir) * dist;
        m.y += Math.sin(m.dir) * dist;
        m.nextTurn -= dist;
        if (m.nextTurn <= 0) {
          // PCB-style bend: ±45° or ±90°, snapped back onto the octagonal grid
          const step = (Math.random() < 0.6 ? 1 : 2) * (Math.random() < 0.5 ? 1 : -1);
          m.dir = (Math.round(m.dir / OCT) + step) * OCT;
          m.nextTurn = 120 + Math.random() * 280;
        }
        m.trail.push({ x: m.x, y: m.y });

        // envelope: fade in on spawn, fade out at end of life — no popping
        const env = Math.min(1, m.life / 1, (m.maxLife - m.life) / 1.5);
        if (m.life > m.maxLife || m.x < -40 || m.x > w + 40 || m.y < -40 || m.y > h + 40) {
          packets[p] = spawn();
          continue;
        }

        // trail: walk back from the head, alpha decays with distance
        let acc = 0;
        ctx.lineWidth = 1;
        for (let i = m.trail.length - 1; i > 0; i--) {
          const a = m.trail[i], b = m.trail[i - 1];
          const seg = Math.hypot(a.x - b.x, a.y - b.y);
          acc += seg;
          if (acc > m.trailLen) { m.trail.splice(0, i); break; }
          const alpha = 0.22 * env * (1 - acc / m.trailLen);
          ctx.strokeStyle = `oklch(0.78 0.12 ${m.hue} / ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        // head: small bright square with a neon bloom
        ctx.shadowColor = `oklch(0.8 0.13 ${m.hue} / ${(0.8 * env).toFixed(3)})`;
        ctx.shadowBlur = 8;
        ctx.fillStyle = `oklch(0.85 0.12 ${m.hue} / ${(0.55 * env).toFixed(3)})`;
        ctx.fillRect(m.x - 1.25, m.y - 1.25, 2.5, 2.5);
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    if (!reduced) raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  });
</script>

<canvas bind:this={canvas} aria-hidden="true" class="fixed inset-0 pointer-events-none z-0"></canvas>
