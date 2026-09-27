// Single source of truth for the five broad categories. Pages previously kept
// three copies of this table; import from here instead.

export interface CategoryDef {
  name: string;
  slug: string;
  code: string;
  description: string;
}

export const CATEGORIES: CategoryDef[] = [
  { name: 'Dharma Writings', slug: 'dharma-writings', code: 'DHARMA', description: 'Buddhist teachings, devotion, philosophy, and the long work of practice.' },
  { name: 'Creative Writing', slug: 'creative-writing', code: 'CREATE', description: 'Poetry, fiction, myth, dreamwork, and worlds built to hold a question.' },
  { name: 'Consciousness & Philosophy', slug: 'consciousness-philosophy', code: 'MIND', description: 'Mind, reality, divinity, identity, and the strange architecture of being.' },
  { name: 'Practice & Inner Life', slug: 'practice-inner-life', code: 'INNER', description: 'Meditation, dreams, healing, and what changes when attention turns inward.' },
  { name: 'Other', slug: 'other', code: 'OTHER', description: 'Technology, culture, daily life, and pieces that resist a cleaner label.' },
];

const bySlugName = new Map(CATEGORIES.map((c) => [c.name, c.slug]));

/** URL slug for a category name; unknown names fall back to `other`. */
export function categorySlug(name: string): string {
  return bySlugName.get(name) ?? 'other';
}

export const CONTENT_TYPES = ['reflection', 'article', 'story', 'poetry', 'guide'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  reflection: 'Reflection',
  article: 'Article',
  story: 'Story',
  poetry: 'Poetry',
  guide: 'Guide',
};
