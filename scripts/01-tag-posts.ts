import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { chat } from './lib/llm';

const SYSTEM = `You extract 3 to 7 short thematic tags (kebab-case, 1-3 words each) from a personal essay. Return JSON only: {"tags": ["..."]}. Tags should be specific enough to cluster across the archive but general enough to recur. Avoid proper nouns unless they are central. No commentary, no markdown, just JSON.`;

async function proposeTagsForPost(title: string, body: string): Promise<string[]> {
  const text = await chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Title: ${title}\n\n${body.slice(0, 3500)}` }
  ], { maxTokens: 200, temperature: 0.3 });
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try { return JSON.parse(m[0]).tags ?? []; } catch { return []; }
}

async function main() {
  // CLI: --limit N (smoke first), default = all posts
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  const dir = 'src/content/blog';
  const cachePath = '.cache/proposed-tags.json';

  // Resume from checkpoint if present
  await mkdir('.cache', { recursive: true });
  let proposed: { slug: string; tags: string[] }[] = [];
  try {
    proposed = JSON.parse(await readFile(cachePath, 'utf8'));
    process.stderr.write(`resuming: ${proposed.length} posts already tagged\n`);
  } catch { /* no checkpoint yet */ }
  const done = new Set(proposed.map(p => p.slug));

  let files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  if (Number.isFinite(limit)) files = files.slice(0, limit);
  const todo = files.length - done.size;
  process.stderr.write(`tagging ${todo} of ${files.length} posts (${done.size} cached)\n`);

  let sinceFlush = 0;
  for (const f of files) {
    const raw = await readFile(join(dir, f), 'utf8');
    const { data, content } = matter(raw);
    if (data.draft) continue;
    const slug = data.slug ?? f.replace(/\.md$/, '');
    if (done.has(slug)) continue;
    process.stderr.write(`tagging ${slug}\n`);
    const tags = await proposeTagsForPost(data.title, content);
    proposed.push({ slug, tags });
    sinceFlush++;
    if (sinceFlush >= 10) {
      await writeFile(cachePath, JSON.stringify(proposed, null, 2));
      sinceFlush = 0;
    }
  }
  await writeFile(cachePath, JSON.stringify(proposed, null, 2));
  process.stderr.write(`wrote ${cachePath} (${proposed.length} posts)\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
