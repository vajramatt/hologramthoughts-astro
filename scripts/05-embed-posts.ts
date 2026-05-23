// Embed one vector per post (from first ~1500 chars of body) via
// Workers AI bge-base. Writes to .cache/embeddings.json — kept out of git.
// Used by 06-compute-related.ts.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { embed } from './lib/llm';

interface Item { slug: string; title: string; pubDate: string; text: string; }

async function main() {
  const dir = 'src/content/blog';
  const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  const items: Item[] = [];
  for (const f of files) {
    const raw = await readFile(join(dir, f), 'utf8');
    const { data, content } = matter(raw);
    if (data.draft) continue;
    const slug = data.slug ?? f.replace(/\.md$/, '');
    items.push({
      slug,
      title: data.title,
      pubDate: new Date(data.pubDate).toISOString(),
      text: content.slice(0, 1500)
    });
  }
  process.stderr.write(`embedding ${items.length} posts\n`);

  const vectors: Record<string, { values: number[]; title: string; pubDate: string }> = {};
  const BATCH = 25;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const embeds = await embed(batch.map(b => b.text));
    for (let j = 0; j < batch.length; j++) {
      vectors[batch[j].slug] = { values: embeds[j], title: batch[j].title, pubDate: batch[j].pubDate };
    }
    process.stderr.write(`embedded ${Math.min(i + BATCH, items.length)}/${items.length}\n`);
  }

  await mkdir('.cache', { recursive: true });
  await writeFile('.cache/embeddings.json', JSON.stringify(vectors));
  process.stderr.write(`wrote .cache/embeddings.json\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
