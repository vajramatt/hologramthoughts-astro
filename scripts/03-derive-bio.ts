// Derive a biographical sketch of Matthew from the blog corpus.
// One-shot. Writes to src/data/matthew-bio.md for hand-review.
//
// Requires the muse-relay Worker running (npm run muse:relay).
// Uses the same chat() helper — same model (default llama-3.3-70b).

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { chat } from './lib/llm';

const SYSTEM = `You are reading an author's blog archive to produce a factual biographical sketch in plain prose. Only state things directly supported by the text. Neutral third person. No interpretation, no flattery. 300-500 words. Markdown OK.`;

async function main() {
  const dir = 'src/content/blog';
  const files = (await readdir(dir)).filter(f => f.endsWith('.md')).sort();
  const corpus: string[] = [];
  for (const f of files) {
    const { data, content } = matter(await readFile(join(dir, f), 'utf8'));
    if (data.draft) continue;
    corpus.push(`# ${data.title} (${new Date(data.pubDate).getFullYear()})\n\n${content.slice(0, 1200)}\n`);
  }
  // Cap sample so context fits Llama's window comfortably.
  const sample = corpus.join('\n---\n').slice(0, 60000);

  process.stderr.write(`deriving bio from ${corpus.length} posts (sample ${sample.length} chars)\n`);

  const text = await chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Below are excerpts from Matthew Williamson's blog from 2006-2026. Write a biographical sketch covering: who he is, when and where he has lived, his recurring concerns, his practice and beliefs, his work, and the people/places that appear repeatedly. Cite specifics (years, places) where the text supports them.\n\n${sample}` }
  ], { maxTokens: 1200, temperature: 0.4 });

  await writeFile('src/data/matthew-bio.md', text.trim() + '\n');
  process.stderr.write(`wrote src/data/matthew-bio.md (${text.length} chars)\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
