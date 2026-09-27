// Render public/favicon.svg → PNG app icons (apple-touch-icon + manifest sizes).
// Run: node scripts/render-icons.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const svg = await readFile('public/favicon.svg', 'utf8');
const out = [
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
];
for (const [path, size] of out) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  await writeFile(path, png);
  process.stderr.write(`wrote ${path} (${png.length} bytes)\n`);
}
