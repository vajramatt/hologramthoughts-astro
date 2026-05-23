// Render public/og-image.svg → public/og-image.png at 1200x630.
// Run: node scripts/render-og.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const svg = await readFile('public/og-image.svg', 'utf8');
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { loadSystemFonts: true, defaultFontFamily: 'Georgia' }
});
const png = resvg.render().asPng();
await writeFile('public/og-image.png', png);
process.stderr.write(`wrote public/og-image.png (${png.length} bytes)\n`);
