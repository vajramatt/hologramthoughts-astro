// Guards the GLOBAL DESTRUCTIVE pipeline stages (canonicalize, consolidate,
// related) from silently clobbering hand-reviewed Muse output.
//
// "Curated" signals:
//   - taxonomy.json has any non-empty blurb/synthesis  -> consolidated + blurbed
//   - any sidecar has a non-empty related[].rationale   -> hand-reviewed pairs
//
// If a curated signal is present and --force is absent, the stage aborts with
// instructions. A deliberate from-scratch rebuild must pass --force.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const THEMES_DIR = 'src/content/themes';

export function hasForce(argv: string[] = process.argv): boolean {
  return argv.includes('--force');
}

async function taxonomyIsCurated(): Promise<boolean> {
  try {
    const t = JSON.parse(await readFile(join(THEMES_DIR, 'taxonomy.json'), 'utf8'));
    return Array.isArray(t.themes) && t.themes.some(
      (x: { blurb?: string; synthesis?: string }) => x.blurb?.trim() || x.synthesis?.trim()
    );
  } catch {
    return false; // no taxonomy yet -> nothing to protect
  }
}

async function sidecarsHaveRationale(): Promise<boolean> {
  try {
    const files = (await readdir(THEMES_DIR)).filter(f => f.endsWith('.json') && f !== 'taxonomy.json');
    for (const f of files) {
      const sc = JSON.parse(await readFile(join(THEMES_DIR, f), 'utf8'));
      if ((sc.related ?? []).some((r: { rationale?: string }) => r.rationale?.trim())) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function die(script: string, what: string): never {
  process.stderr.write(
    `\n✋ REFUSING TO RUN ${script}\n` +
    `   ${what}\n` +
    `   This stage is a GLOBAL DESTRUCTIVE regen — it wipes hand-reviewed Muse output\n` +
    `   (curated taxonomy blurbs/synthesis and/or all related-post rationale).\n\n` +
    `   • To add a post: use the INCREMENTAL flow in CLAUDE.md §5 — do NOT run this.\n` +
    `   • To deliberately rebuild from scratch: re-run with --force\n` +
    `     (e.g. \`npm run build:canonicalize -- --force\` or \`npm run build:muse:force\`).\n` +
    `   • If you clobbered it already: \`git restore src/content/themes/\` recovers it.\n\n`
  );
  process.exit(1);
}

/** Abort if a curated/blurbed taxonomy exists (canonicalize, consolidate). */
export async function guardTaxonomy(script: string): Promise<void> {
  if (hasForce()) return;
  if (await taxonomyIsCurated()) {
    die(script, 'taxonomy.json already holds a curated taxonomy (blurbs/synthesis present).');
  }
}

/** Abort if any sidecar holds hand-reviewed rationale (compute-related). */
export async function guardRationale(script: string): Promise<void> {
  if (hasForce()) return;
  if (await sidecarsHaveRationale()) {
    die(script, 'sidecars already hold hand-reviewed related-post rationale.');
  }
}
