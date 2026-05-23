// Muse build-time relay Worker.
//
// POST /run { "model": "alibaba/qwen3-max", "body": { ... model-specific payload ... } }
//   → forwards to env.AI.run(model, body) and returns the raw result JSON
//
// Only intended for local `wrangler dev` use during build pipeline runs.
// Never deployed.

interface Env { AI: { run: (model: string, body: unknown) => Promise<unknown> }; }

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/health') {
      return new Response('ok', { headers: { 'content-type': 'text/plain' } });
    }

    if (req.method !== 'POST' || url.pathname !== '/run') {
      return new Response('POST /run only', { status: 404 });
    }

    let payload: { model?: string; body?: unknown };
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'bad_json' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    if (!payload.model || typeof payload.model !== 'string') {
      return new Response(JSON.stringify({ error: 'missing_model' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    try {
      const result = await env.AI.run(payload.model, payload.body ?? {});
      return new Response(JSON.stringify(result), {
        headers: { 'content-type': 'application/json' }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return new Response(JSON.stringify({ error: 'ai_run_failed', message: msg }), {
        status: 502,
        headers: { 'content-type': 'application/json' }
      });
    }
  }
};
