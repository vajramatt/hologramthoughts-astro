// Syntax-highlight the "type / class" role: each category maps to a stable
// TokyoNight hue, returned as a CSS var so the print palette overrides apply.
// Unknown categories hash into the accent set. Numbers use --color-amber-bright
// (orange) directly; this is only for the category token.
const KNOWN: Record<string, string> = {
  'Dharma Writings': 'var(--color-magenta)',
  'Creative Writing': 'var(--color-green)',
  'Consciousness & Philosophy': 'var(--color-cyan)',
  'Practice & Inner Life': 'var(--color-blue)',
  'Other': 'var(--color-amber)',
};

const FALLBACK = [
  'var(--color-blue)',
  'var(--color-green)',
  'var(--color-cyan)',
  'var(--color-magenta)',
  'var(--color-amber)',
];

export function categoryColor(category: string): string {
  const key = category.trim();
  if (KNOWN[key]) return KNOWN[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}
