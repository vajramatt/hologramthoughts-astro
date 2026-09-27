// Decide whether a post's `description` is worth showing as the italic deck
// under its title. Many migrated posts carry an auto-excerpt that is just the
// opening of the body, truncated mid-word — showing it duplicates paragraph one.

const plain = (s: string) =>
  s
    .replace(/^---[\s\S]*?---\n?/, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const PREFIX_CHARS = 60;

/** Markdown body → readable plain text (keeps case and punctuation). */
export function bodyText(body: string): string {
  return body
    .replace(/^---[\s\S]*?---\n?/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/^\s*[-*+>]\s+/gm, '')
    .replace(/[*_`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const truncated = (s: string) => /(…|\.\.\.)\s*$/.test(s);

/**
 * A search-snippet-quality description (<= max chars). Uses the frontmatter
 * description when it is complete; otherwise cuts the body at the last sentence
 * end that fits, or at a word boundary with an ellipsis.
 */
export function metaDescription(description: string | undefined | null, body: string, max = 160): string {
  const d = description?.replace(/\s+/g, ' ').trim();
  if (d && !truncated(d) && d.length <= max) return d;
  const source = d && !truncated(d) ? d : bodyText(body) || d || '';
  if (source.length <= max) return source;
  const window = source.slice(0, max);
  const sentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '));
  if (sentenceEnd >= max * 0.55) return window.slice(0, sentenceEnd + 1);
  return window.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[,;:\s]+$/, '') + '…';
}

export function shouldShowDeck(description: string | undefined | null, body: string): boolean {
  const d = description?.trim();
  if (!d) return false;
  if (/(…|\.\.\.)\s*$/.test(d)) return false;
  const pd = plain(d);
  if (!pd) return false;
  const probe = pd.slice(0, PREFIX_CHARS);
  if (plain(body).startsWith(probe)) return false;
  return true;
}
