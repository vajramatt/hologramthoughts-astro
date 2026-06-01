// Llama consolidates raw taxonomy: merges synonyms, drops junk, renames
// where appropriate. Writes a "merge map" to .cache/theme-merges.json
// for review, then applies it to taxonomy.json + sidecars.
//
// Run BEFORE blurbs/synthesis so we don't waste tokens writing prose for
// themes we're about to delete.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chat } from './lib/llm';
import { guardTaxonomy } from './lib/guard';

const SYSTEM = `You are consolidating a noisy LLM-generated theme taxonomy for a writing archive. Input: a list of themes with post counts. Many are synonyms or near-duplicates that should merge under one canonical theme. Some are too narrow (single-essay artifacts) and should be dropped. Some are too generic and should also be dropped.

Output ONLY JSON of the form:
{
  "keep": [
    {"canonical_id": "compassion", "canonical_name": "Compassion", "merge_from": ["compassion", "compassion-and-love", "compassion-cultivation", "compassion-practice"]}
  ],
  "drop": ["junk-id-1", "junk-id-2"]
}

Rules:
- canonical_id: kebab-case, short, broad enough to recur but specific enough to mean something
- canonical_name: title-case display name
- merge_from MUST include the canonical_id itself if it exists in input
- Every input id must appear in EXACTLY ONE place (a merge_from list OR drop list); no orphans
- Target: 40-80 final themes
- Bias toward keeping ideas that recur across many years vs one-essay specialty
- Prefer broader canonical names ("dharma" over "dharma-talk-on-impermanence") when they cover the same essays
- Drop themes that are basically tags rather than ideas (e.g. specific proper nouns that appear in just 2-3 posts)`;

async function main() {
  await guardTaxonomy('02b-consolidate-themes');
  const taxonomy = JSON.parse(await readFile('src/content/themes/taxonomy.json', 'utf8'));
  const themes: Array<{ id: string; name: string; postCount: number }> = taxonomy.themes;
  process.stderr.write(`consolidating ${themes.length} themes...\n`);

  const themeList = themes
    .map(t => `- ${t.id} (${t.postCount} posts)`)
    .join('\n');

  const raw = await chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Input themes:\n\n${themeList}\n\nReturn the consolidation JSON. Every input id must appear in exactly one merge_from list or in drop.` }
  ], { maxTokens: 8000, temperature: 0.3 });

  // Strip code fences / extract JSON
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    await mkdir('.cache', { recursive: true });
    await writeFile('.cache/theme-merges-raw.txt', raw);
    throw new Error('no JSON in llama output; saved raw to .cache/theme-merges-raw.txt');
  }
  let plan: { keep: Array<{ canonical_id: string; canonical_name: string; merge_from: string[] }>; drop: string[] };
  try {
    plan = JSON.parse(jsonMatch[0]);
  } catch (e) {
    await mkdir('.cache', { recursive: true });
    await writeFile('.cache/theme-merges-raw.txt', raw);
    throw new Error(`JSON parse failed: ${(e as Error).message}; saved raw to .cache/theme-merges-raw.txt`);
  }

  await mkdir('.cache', { recursive: true });
  await writeFile('.cache/theme-merges.json', JSON.stringify(plan, null, 2));

  // Validate coverage
  const inputIds = new Set(themes.map(t => t.id));
  const seen = new Set<string>();
  const orphans: string[] = [];
  const dupes: string[] = [];
  for (const k of plan.keep) {
    for (const id of k.merge_from) {
      if (seen.has(id)) dupes.push(id);
      seen.add(id);
    }
  }
  for (const id of plan.drop) {
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  }
  for (const id of inputIds) if (!seen.has(id)) orphans.push(id);
  if (orphans.length || dupes.length) {
    process.stderr.write(`WARNING: ${orphans.length} orphans, ${dupes.length} duplicates\n`);
    if (orphans.length) process.stderr.write(`  orphans (will be dropped): ${orphans.slice(0, 10).join(', ')}${orphans.length > 10 ? '...' : ''}\n`);
    if (dupes.length) process.stderr.write(`  dupes: ${dupes.slice(0, 10).join(', ')}${dupes.length > 10 ? '...' : ''}\n`);
  }

  // Build old → new id map
  const remap = new Map<string, string>();
  for (const k of plan.keep) {
    for (const oldId of k.merge_from) {
      remap.set(oldId, k.canonical_id);
    }
  }
  const dropped = new Set([...plan.drop, ...orphans]);

  // Rewrite sidecars
  const themesDir = 'src/content/themes';
  const sidecarFiles = (await readdir(themesDir)).filter(f => f.endsWith('.json') && f !== 'taxonomy.json');
  let sidecarsTouched = 0;
  for (const f of sidecarFiles) {
    const sc = JSON.parse(await readFile(join(themesDir, f), 'utf8'));
    const newIds = Array.from(new Set(
      sc.themeIds
        .map((id: string) => remap.get(id))
        .filter((id: string | undefined): id is string => !!id)
    )).sort();
    if (JSON.stringify(newIds) !== JSON.stringify(sc.themeIds)) {
      sc.themeIds = newIds;
      await writeFile(join(themesDir, f), JSON.stringify(sc, null, 2));
      sidecarsTouched++;
    }
  }

  // Recompute postCount from sidecars (source of truth)
  const counts = new Map<string, number>();
  for (const f of sidecarFiles) {
    const sc = JSON.parse(await readFile(join(themesDir, f), 'utf8'));
    for (const id of sc.themeIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  // Write new taxonomy
  const newThemes = plan.keep
    .filter(k => counts.has(k.canonical_id))
    .map(k => ({
      id: k.canonical_id,
      name: k.canonical_name,
      blurb: '',
      synthesis: '',
      postCount: counts.get(k.canonical_id)!
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  await writeFile('src/content/themes/taxonomy.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    themes: newThemes
  }, null, 2));

  process.stderr.write(`consolidated to ${newThemes.length} themes; rewrote ${sidecarsTouched} sidecars\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
