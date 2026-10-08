import { describe, expect, it } from 'vitest';
import { circuitTraces } from '../src/utils/circuit';

const opts = { width: 1600, height: 1000, count: 60, seed: 7 };

describe('circuitTraces', () => {
  it('is deterministic for a seed', () => {
    expect(circuitTraces(opts)).toEqual(circuitTraces(opts));
    expect(circuitTraces({ ...opts, seed: 8 })).not.toEqual(circuitTraces(opts));
  });

  it('keeps every point on the board (bus lanes may overhang by their offset)', () => {
    const slack = 2 * 9 * Math.SQRT2;
    for (const t of circuitTraces(opts)) {
      for (const [x, y] of t.points) {
        expect(x).toBeGreaterThanOrEqual(-slack);
        expect(x).toBeLessThanOrEqual(opts.width + slack);
        expect(y).toBeGreaterThanOrEqual(-slack);
        expect(y).toBeLessThanOrEqual(opts.height + slack);
      }
    }
  });

  it('builds buses whose lanes stay parallel to their route', () => {
    const all = circuitTraces(opts);
    const dirs = (t: (typeof all)[number]) =>
      t.points.slice(1).map(([x, y], i) => {
        const [px, py] = t.points[i];
        const len = Math.hypot(x - px, y - py);
        return [Math.round(((x - px) / len) * 50), Math.round(((y - py) / len) * 50)].join();
      }).join('|');
    const lanes = all.filter((t, i) => i > 0 && t.route === all[i - 1].route);
    expect(lanes.length).toBeGreaterThan(0);
    for (const t of lanes) expect(dirs(t)).toBe(dirs(all[all.indexOf(t) - 1]));
  });

  it('only bends at 45° or 90° and never reverses', () => {
    for (const t of circuitTraces(opts)) {
      expect(t.points.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < t.points.length; i++) {
        const [ax, ay] = t.points[i - 1];
        const [bx, by] = t.points[i];
        const dx = bx - ax, dy = by - ay;
        // each run is orthogonal or a true diagonal (within rounding)
        expect(Math.abs(dx) < 0.2 || Math.abs(dy) < 0.2 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.2).toBe(true);
        if (i >= 2) {
          const [px, py] = t.points[i - 2];
          const u = [Math.sign(ax - px), Math.sign(ay - py)];
          const v = [Math.sign(dx), Math.sign(dy)];
          expect(u[0] === -v[0] && u[1] === -v[1]).toBe(false);
        }
      }
    }
  });
});
