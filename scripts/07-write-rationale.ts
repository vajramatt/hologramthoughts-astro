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

Task: Given two posts (A read first, B suggested next), write a single short sentence (max 16 words) that says what reading B after A does.

HARD RULES — output is REJECTED if it violates these:
- DO NOT start with "Explores", "Discusses", "Continues", "Examines", "Looks at", or any generic verb opener
- DO NOT use the words "explore", "exploration", "delve", "journey", "intersection"
- DO NOT use "similar themes", "related themes", "shared themes" — name the actual thread
- DO NOT say "in this post" or "this article"
- DO start with the concrete move: what thread it picks up, where it pushes
- Use a SPECIFIC verb: picks up, pushes, complicates, reverses, sharpens, doubles down, answers, contradicts

Good: "Picks up the holographic frame and pushes it into psychedelic terrain."
Good: "Same question, but answered by a teacher he meets in person."
Bad: "Explores consciousness and spirituality from different perspectives."
Bad: "Continues themes of unexplained phenomena."

Output ONE sentence, no quotes, no markdown, no preface.`;

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
  const force = process.argv.includes('--force');
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
      if (r.rationale && !force) continue;
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
