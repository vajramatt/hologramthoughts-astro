// schema.org JSON-LD builders + a script-safe serializer.
// The serializer escapes `<` to < so a frontmatter value containing
// "</script>" cannot break out of the <script type="application/ld+json"> tag.
// (HTML entities are NOT decoded inside <script>, so < is the only correct
// escape here — it keeps the payload valid JSON.)

const SITE = 'https://hologramthoughts.com';
const SITE_NAME = 'Hologram Thoughts';
const SITE_DESC =
  'An archive of writing on consciousness, dharma, fatherhood, code, and the strange edges of culture.';

const PERSON = { '@type': 'Person', name: 'Matthew Williamson', url: SITE } as const;

export function serializeJsonLd(data: object | object[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function websiteGraph(): any[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE,
      description: SITE_DESC,
      inLanguage: 'en',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    { '@context': 'https://schema.org', ...PERSON },
  ];
}

export function blogPostingGraph(opts: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  image: string;
  tags?: string[];
  categories?: string[];
  wordCount?: number;
  readingTime?: number;
}): any[] {
  const posting: any = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    mainEntityOfPage: opts.url,
    datePublished: opts.datePublished,
    image: opts.image,
    inLanguage: 'en',
    author: PERSON,
    publisher: PERSON,
  };
  if (opts.tags?.length) posting.keywords = opts.tags.join(', ');
  if (opts.categories?.length) posting.articleSection = opts.categories;
  if (opts.wordCount) posting.wordCount = opts.wordCount;
  if (opts.readingTime) posting.timeRequired = `PT${opts.readingTime}M`;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Archive', item: `${SITE}/archive/` },
      { '@type': 'ListItem', position: 3, name: opts.title, item: opts.url },
    ],
  };
  return [posting, breadcrumb];
}

export function collectionPageGraph(opts: {
  name: string;
  description: string;
  url: string;
  posts: Array<{ title: string; url: string }>;
}): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: 'en',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: opts.posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.title,
        url: p.url,
      })),
    },
  };
}

export function aboutPageGraph(opts: { url: string; description: string }): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'How this gets made',
    url: opts.url,
    description: opts.description,
    inLanguage: 'en',
    author: PERSON,
  };
}
