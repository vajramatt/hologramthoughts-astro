// Build-time LLM client. Talks to the local Muse relay Worker
// (scripts/relay-worker/) which holds the env.AI binding.
//
// Start the relay first:
//   cd scripts/relay-worker && npx wrangler dev
// Then run any build script in another terminal.
//
// Override the chat model with MUSE_MODEL=... (default: alibaba/qwen3-max).
// Override the relay URL with MUSE_RELAY_URL=... (default: http://localhost:8787).

const RELAY = process.env.MUSE_RELAY_URL ?? 'http://localhost:8787';
const CHAT_MODEL = process.env.MUSE_MODEL ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const EMBED_MODEL = process.env.MUSE_EMBED_MODEL ?? '@cf/baai/bge-base-en-v1.5';

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

async function callRelay(model: string, body: unknown): Promise<any> {
  let r: Response;
  try {
    r = await fetch(`${RELAY}/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, body })
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`relay unreachable at ${RELAY} — is \`wrangler dev\` running in scripts/relay-worker/? (${msg})`);
  }
  if (!r.ok) {
    throw new Error(`relay ${model} failed: ${r.status} ${await r.text()}`);
  }
  return r.json();
}

export async function chat(messages: ChatMessage[], opts: { maxTokens?: number; temperature?: number } = {}): Promise<string> {
  const result = await callRelay(CHAT_MODEL, {
    messages,
    max_tokens: opts.maxTokens ?? 512,
    temperature: opts.temperature ?? 0.7
  });
  // Workers AI returns { response } or { result: { response } }. Some models
  // (e.g. Llama 3.3 70B) auto-parse JSON-mode output; stringify in that case
  // so callers that JSON.parse can still work.
  const r = result?.response ?? result?.result?.response;
  if (r === undefined) throw new Error(`unexpected chat shape: ${JSON.stringify(result).slice(0, 200)}`);
  return typeof r === 'string' ? r : JSON.stringify(r);
}

export async function embed(texts: string[]): Promise<number[][]> {
  const result = await callRelay(EMBED_MODEL, { text: texts });
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.result?.data)) return result.result.data;
  throw new Error(`unexpected embed shape: ${JSON.stringify(result).slice(0, 200)}`);
}
