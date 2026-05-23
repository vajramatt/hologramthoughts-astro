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
  const dir = 'src/content/blog';
  const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  const proposed: { slug: string; tags: string[] }[] = [];
  for (const f of files) {
    const raw = await readFile(join(dir, f), 'utf8');
    const { data, content } = matter(raw);
    if (data.draft) continue;
    const slug = data.slug ?? f.replace(/\.md$/, '');
    process.stderr.write(`tagging ${slug}\n`);
    const tags = await proposeTagsForPost(data.title, content);
    proposed.push({ slug, tags });
  }
  await mkdir('.cache', { recursive: true });
  await writeFile('.cache/proposed-tags.json', JSON.stringify(proposed, null, 2));
  process.stderr.write(`wrote .cache/proposed-tags.json (${proposed.length} posts)\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
