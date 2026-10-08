// Circuit substrate — deterministic PCB-style traces for the static page backdrop.
// Seeded so every build draws the same board (no layout churn between deploys,
// no runtime JS). Traces run on a grid, bend only by 45° or 90°, never reverse,
// and stop rather than leave the board. Some routes are buses: 2–3 parallel
// lanes mitred through each bend, which is what makes it read as a circuit
// rather than scribble.

export interface Trace {
  d: string;
  points: [number, number][];
  length: number;
  /** Lanes of one bus share a route id. */
  route: number;
}

export interface CircuitOptions {
  width: number;
  height: number;
  count: number;
  seed: number;
  grid?: number;
  /** Lane spacing for buses, in px. */
  lane?: number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 8 headings, clockwise from east. Even indices are orthogonal.
const DIRS: [number, number][] = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];

const r1 = (n: number) => Math.round(n * 10) / 10;

// Offset a polyline by `dist` along its left normal, mitring each corner so
// the lane stays parallel to its neighbours through the bend.
function offsetPolyline(points: [number, number][], dist: number): [number, number][] {
  const normals = points.slice(1).map(([bx, by], i) => {
    const [ax, ay] = points[i];
    const len = Math.hypot(bx - ax, by - ay);
    return [-(by - ay) / len, (bx - ax) / len] as [number, number];
  });
  return points.map(([x, y], i) => {
    const a = normals[Math.max(0, i - 1)];
    const b = normals[Math.min(normals.length - 1, i)];
    const k = dist / (1 + a[0] * b[0] + a[1] * b[1]);
    return [r1(x + (a[0] + b[0]) * k), r1(y + (a[1] + b[1]) * k)];
  });
}

const toPath = (pts: [number, number][]) =>
  pts.map(([px, py], k) => `${k === 0 ? 'M' : 'L'}${px} ${py}`).join(' ');

export function circuitTraces({ width, height, count, seed, grid = 20, lane = 9 }: CircuitOptions): Trace[] {
  const rand = mulberry32(seed);
  const pick = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const cols = Math.floor(width / grid);
  const rows = Math.floor(height / grid);
  const traces: Trace[] = [];

  for (let i = 0; i < count; i++) {
    let x = pick(1, cols - 1) * grid;
    let y = pick(1, rows - 1) * grid;
    // Mostly orthogonal starts read as circuitry; diagonals are the accent.
    let dir = rand() < 0.75 ? pick(0, 3) * 2 : pick(0, 3) * 2 + 1;
    const points: [number, number][] = [[x, y]];
    let length = 0;
    const segments = pick(2, 4);

    for (let s = 0; s < segments; s++) {
      if (s > 0) {
        const turn = (rand() < 0.6 ? 1 : 2) * (rand() < 0.5 ? 1 : -1);
        dir = (dir + turn + 8) % 8;
      }
      const [dx, dy] = DIRS[dir];
      let steps = pick(3, 11);
      // Shorten the run until it stays on the board; drop it if nothing fits.
      while (steps > 0) {
        const nx = x + dx * steps * grid;
        const ny = y + dy * steps * grid;
        if (nx >= 0 && nx <= width && ny >= 0 && ny <= height) break;
        steps--;
      }
      if (steps === 0) break;
      const nx = x + dx * steps * grid;
      const ny = y + dy * steps * grid;
      length += Math.hypot(nx - x, ny - y);
      x = nx;
      y = ny;
      points.push([x, y]);
    }

    if (points.length < 2) continue;
    traces.push({ d: toPath(points), points, length: Math.round(length), route: i });

    // Half the routes are single lines; the rest become 2- or 3-lane buses.
    const lanes = rand() < 0.5 ? 1 : rand() < 0.6 ? 2 : 3;
    for (let j = 1; j < lanes; j++) {
      const pts = offsetPolyline(points, j * lane);
      traces.push({ d: toPath(pts), points: pts, length: Math.round(length), route: i });
    }
  }

  return traces;
}
