export interface Theme {
  id: string;
  name: string;
  blurb: string;       // one-line "what's alive here" (Muse voice)
  synthesis: string;   // paragraph synthesis for theme landing page
  postCount: number;
}

export interface Taxonomy {
  generatedAt: string;
  themes: Theme[];
}

export interface RelatedPost {
  slug: string;
  rationale: string;   // Muse-voice one-line ("picks up X, pushes it into Y")
}

export interface PostSidecar {
  slug: string;
  themeIds: string[];
  related: RelatedPost[];
}
