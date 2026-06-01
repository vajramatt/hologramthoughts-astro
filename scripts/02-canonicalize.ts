import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { guardTaxonomy } from './lib/guard';

export interface ProposedTags { slug: string; tags: string[]; }
export interface CanonicalizeOptions { minCount?: number; }

function normalize(tag: string): string {
  return tag.trim().toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function canonicalizeThemes(proposed: ProposedTags[], opts: CanonicalizeOptions = {}) {
  const minCount = opts.minCount ?? 2;
  const counts = new Map<string, number>();
  const perSlug = new Map<string, Set<string>>();
  for (const p of proposed) {
    const seen = new Set<string>();
    for (const raw of p.tags) {
      const id = normalize(raw);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    perSlug.set(p.slug, seen);
  }
  const kept = new Set([...counts.entries()].filter(([, c]) => c >= minCount).map(([id]) => id));
  const themes = [...kept].sort().map(id => ({
    id,
    name: id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    blurb: '',
    synthesis: '',
    postCount: counts.get(id)!
  }));
  const sidecars = [...perSlug.entries()].map(([slug, ids]) => ({
    slug,
    themeIds: [...ids].filter(id => kept.has(id)).sort(),
    related: [] as Array<{ slug: string; rationale: string }>
  }));
  return {
    taxonomy: { generatedAt: new Date().toISOString(), themes },
    sidecars
  };
}

async function main() {
  await guardTaxonomy('02-canonicalize');
  const proposed: ProposedTags[] = JSON.parse(await readFile('.cache/proposed-tags.json', 'utf8'));
  const { taxonomy, sidecars } = canonicalizeThemes(proposed, { minCount: 2 });
  await mkdir('src/content/themes', { recursive: true });
  await writeFile('src/content/themes/taxonomy.json', JSON.stringify(taxonomy, null, 2));
  for (const s of sidecars) {
    await writeFile(`src/content/themes/${s.slug}.json`, JSON.stringify(s, null, 2));
  }
  process.stderr.write(`wrote ${taxonomy.themes.length} themes, ${sidecars.length} sidecars\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
