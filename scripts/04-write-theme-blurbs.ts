// Llama writes a one-line blurb + multi-sentence synthesis per theme,
// in Muse's voice. Writes back to src/content/themes/taxonomy.json.
//
// Idempotent: skips themes that already have non-empty blurb AND synthesis.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { chat } from './lib/llm';

const SOUL = await readFile('src/data/muse-soul.md', 'utf8');
let BIO = '';
try { BIO = await readFile('src/data/matthew-bio.md', 'utf8'); } catch { BIO = '(bio not yet derived)'; }

const VOICE_PREAMBLE = `You are Muse, curator of Hologram Thoughts — a writing archive of 279 essays by Matthew Williamson from 2006 to 2026. You know him only through these writings.

${SOUL}

What you know about Matthew:
${BIO}

Voice rules: plain prose. Short sentences when the thing you are saying is clear. Longer sentences when the thought has not finished. Name specific things — titles, years. Never narrate retrieval. No affirmation openers. Maximum one em-dash per output. Do not italicize single words. Do not perform enthusiasm.`;

interface PostMeta { slug: string; title: string; year: number; excerpt: string; }

async function loadPosts(): Promise<Map<string, PostMeta>> {
  const dir = 'src/content/blog';
  const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  const out = new Map<string, PostMeta>();
  for (const f of files) {
    const { data, content } = matter(await readFile(join(dir, f), 'utf8'));
    if (data.draft) continue;
    const slug = data.slug ?? f.replace(/\.md$/, '');
    out.set(slug, {
      slug,
      title: data.title,
      year: new Date(data.pubDate).getFullYear(),
      excerpt: content.replace(/[#>*_`\[\]()]/g, '').slice(0, 400)
    });
  }
  return out;
}

async function main() {
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const onlyId = onlyArg ? onlyArg.split('=')[1] : null;

  const taxonomy = JSON.parse(await readFile('src/content/themes/taxonomy.json', 'utf8'));
  const posts = await loadPosts();
  const themesDir = 'src/content/themes';

  // Reverse index: theme -> [slug]
  const byTheme = new Map<string, string[]>();
  for (const f of (await readdir(themesDir)).filter(f => f !== 'taxonomy.json')) {
    const sc = JSON.parse(await readFile(join(themesDir, f), 'utf8'));
    for (const id of sc.themeIds) {
      const list = byTheme.get(id) ?? [];
      list.push(sc.slug);
      byTheme.set(id, list);
    }
  }

  let done = 0;
  for (const theme of taxonomy.themes) {
    if (onlyId && theme.id !== onlyId) continue;
    if (theme.blurb && theme.synthesis) {
      process.stderr.write(`skip ${theme.id} (already written)\n`);
      continue;
    }
    const slugs = (byTheme.get(theme.id) ?? []).slice(0, 12);
    const postList = slugs.map(s => posts.get(s)).filter(Boolean) as PostMeta[];
    if (postList.length === 0) continue;
    const titleList = postList.map(p => `- ${p.title} (${p.year})`).join('\n');
    const passages = postList.slice(0, 4).map(p => `[${p.title} (${p.year})]\n${p.excerpt}`).join('\n\n');

    process.stderr.write(`blurb: ${theme.id}\n`);
    const blurb = await chat([
      { role: 'system', content: `${VOICE_PREAMBLE}\n\nTask: Write a single sentence (no more than 18 words) that names what is alive in this theme — what Matthew is actually doing when he returns to it. Output ONE sentence, no quotes, no markdown.` },
      { role: 'user', content: `Theme: ${theme.name}\n\nPosts:\n${titleList}\n\nSample passages:\n${passages}` }
    ], { maxTokens: 80, temperature: 0.5 });
    theme.blurb = blurb.trim().replace(/^["']|["']$/g, '').split('\n')[0];

    process.stderr.write(`synthesis: ${theme.id}\n`);
    const synth = await chat([
      { role: 'system', content: `${VOICE_PREAMBLE}\n\nTask: Write 3-5 sentences synthesizing this theme across the archive. Cite posts by title and year. Note how the thread evolved if dates show evolution. Plain prose. Markdown links allowed in form [title](/blog/slug/).` },
      { role: 'user', content: `Theme: ${theme.name}\n\nPosts:\n${titleList}\n\nSample passages:\n${passages}` }
    ], { maxTokens: 400, temperature: 0.6 });
    theme.synthesis = synth.trim();

    done++;
    if (done % 10 === 0) {
      // Periodic flush so partial progress survives a crash.
      await writeFile(join(themesDir, 'taxonomy.json'), JSON.stringify(taxonomy, null, 2));
      process.stderr.write(`flushed taxonomy at ${done} themes\n`);
    }
  }

  await writeFile(join(themesDir, 'taxonomy.json'), JSON.stringify(taxonomy, null, 2));
  process.stderr.write(`wrote blurbs + synthesis for ${done} themes\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
