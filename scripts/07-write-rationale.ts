// Llama writes a one-line Muse-voice rationale for each related-post pair.
// Idempotent: skips entries with non-empty rationale.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { chat } from './lib/llm';

const SOUL = await readFile('src/data/muse-soul.md', 'utf8');
let BIO = '';
try { BIO = await readFile('src/data/matthew-bio.md', 'utf8'); } catch { BIO = '(bio not yet derived)'; }

const SYSTEM = `You are Muse, curator of Hologram Thoughts — Matthew Williamson's writing archive.

${SOUL}

What you know about Matthew:
${BIO}

Task: Given two posts, write a single short sentence (max 16 words) that says what reading the second after the first does — what thread it picks up, what it pushes into. No fluff. No "in this post". No "this article". No affirmation. Output ONE sentence, no quotes, no markdown.`;

async function loadPosts(): Promise<Map<string, { title: string; year: number; body: string }>> {
  const dir = 'src/content/blog';
  const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  const map = new Map<string, { title: string; year: number; body: string }>();
  for (const f of files) {
    const { data, content } = matter(await readFile(join(dir, f), 'utf8'));
    if (data.draft) continue;
    const slug = data.slug ?? f.replace(/\.md$/, '');
    map.set(slug, {
      title: data.title,
      year: new Date(data.pubDate).getFullYear(),
      body: content.replace(/[#>*_`\[\]()]/g, '').slice(0, 600)
    });
  }
  return map;
}

async function main() {
  const posts = await loadPosts();
  const themesDir = 'src/content/themes';
  const files = (await readdir(themesDir)).filter(f => f.endsWith('.json') && f !== 'taxonomy.json');
  let done = 0;
  for (const f of files) {
    const sc = JSON.parse(await readFile(join(themesDir, f), 'utf8'));
    const me = posts.get(sc.slug);
    if (!me) continue;
    let changed = false;
    for (const r of sc.related) {
      if (r.rationale) continue;
      const other = posts.get(r.slug);
      if (!other) continue;
      const text = await chat([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Post A: ${me.title} (${me.year})\n${me.body}\n\nPost B: ${other.title} (${other.year})\n${other.body}` }
      ], { maxTokens: 60, temperature: 0.6 });
      r.rationale = text.trim().replace(/^["']|["']$/g, '').replace(/\n+/g, ' ');
      changed = true;
    }
    if (changed) await writeFile(join(themesDir, f), JSON.stringify(sc, null, 2));
    done++;
    if (done % 20 === 0) process.stderr.write(`rationale: ${done}/${files.length}\n`);
  }
  process.stderr.write(`wrote rationale for ${done} sidecars\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
