interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

type PagesFunction = (context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}) => Promise<Response>;

function addMarkdownHeaders(response: Response, body: string): Response {
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/markdown; charset=utf-8');
  headers.set('x-markdown-tokens', String(Math.ceil(body.length / 4)));
  headers.set('Content-Signal', 'ai-input=yes, search=yes');
  headers.set('Cache-Control', 'public, max-age=3600');
  return new Response(body, { status: response.status, headers });
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const accept = request.headers.get('Accept') || '';
  const wantsMarkdown = accept.includes('text/markdown') || url.searchParams.has('format') && url.searchParams.get('format') === 'md';

  // Only intercept requests that want markdown
  if (!wantsMarkdown) {
    return context.next();
  }

  // Handle blog post requests: /blog/[slug]/ → serve /blog/[slug]/index.md
  const blogMatch = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    try {
      // Fetch the pre-generated markdown from static assets
      const mdUrl = new URL(`/blog/${slug}/index.md`, request.url);
      const mdResponse = await env.ASSETS.fetch(new Request(mdUrl));

      if (mdResponse.ok) {
        const body = await mdResponse.text();
        return addMarkdownHeaders(mdResponse, body);
      }
    } catch {
      // Fall through to normal handling if .md not found
    }

    // No markdown version available — return normal HTML
    return context.next();
  }

  // Handle agent index: /agent-index.md
  if (pathname === '/agent-index.md') {
    const response = await context.next();
    if (response.ok) {
      const body = await response.text();
      return addMarkdownHeaders(response, body);
    }
    return response;
  }

  // Everything else: pass through
  return context.next();
};
