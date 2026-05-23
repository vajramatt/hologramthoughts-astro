// Pairwise cosine similarity over embeddings; top-3 related per post.
// Writes related slugs into each src/content/themes/<slug>.json sidecar.
// No LLM calls — no relay required.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function topK(slug: string, vectors: Record<string, { values: number[] }>, k: number): Array<{ slug: string; score: number }> {
  const me = vectors[slug];
  if (!me) return [];
  const scores: Array<{ slug: string; score: number }> = [];
  for (const [other, v] of Object.entries(vectors)) {
    if (other === slug) continue;
    scores.push({ slug: other, score: cosineSim(me.values, v.values) });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, k);
}

async function main() {
  const vectors = JSON.parse(await readFile('.cache/embeddings.json', 'utf8'));
  const themesDir = 'src/content/themes';
  const files = (await readdir(themesDir)).filter(f => f.endsWith('.json') && f !== 'taxonomy.json');
  let touched = 0;
  for (const f of files) {
    const sc = JSON.parse(await readFile(join(themesDir, f), 'utf8'));
    if (!vectors[sc.slug]) continue;
    const top = topK(sc.slug, vectors, 3);
    sc.related = top.map(t => ({ slug: t.slug, rationale: '' }));
    await writeFile(join(themesDir, f), JSON.stringify(sc, null, 2));
    touched++;
  }
  process.stderr.write(`computed related for ${touched} sidecars\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
