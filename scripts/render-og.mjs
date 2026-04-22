// Render public/og-image.svg → public/og-image.png at 1200x630.
// Run: node scripts/render-og.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.resolve(__dirname, '..', 'public', 'og-image.svg');
const pngPath = path.resolve(__dirname, '..', 'public', 'og-image.png');

const svg = await fs.readFile(svgPath);

await sharp(svg, { density: 300 })
  .resize(1200, 630)
  .png({ compressionLevel: 9, quality: 95 })
  .toFile(pngPath);

const { size } = await fs.stat(pngPath);
console.log(`✓ wrote ${pngPath} (${(size / 1024).toFixed(1)} KB)`);
