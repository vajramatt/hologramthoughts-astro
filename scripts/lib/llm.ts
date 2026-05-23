const ACCOUNT = process.env.CF_ACCOUNT_ID;
const TOKEN = process.env.CF_API_TOKEN;
const MODEL = process.env.MUSE_MODEL ?? 'alibaba/qwen3-max';

if (!ACCOUNT || !TOKEN) {
  throw new Error('CF_ACCOUNT_ID and CF_API_TOKEN required');
}

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

export async function chat(messages: ChatMessage[], opts: { maxTokens?: number; temperature?: number } = {}): Promise<string> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens: opts.maxTokens ?? 512, temperature: opts.temperature ?? 0.7 })
  });
  if (!r.ok) throw new Error(`chat (${MODEL}) failed: ${r.status} ${await r.text()}`);
  const j = await r.json() as any;
  return j.result.response;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/@cf/baai/bge-base-en-v1.5`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ text: texts })
  });
  if (!r.ok) throw new Error(`embed failed: ${r.status} ${await r.text()}`);
  const j = await r.json() as any;
  return j.result.data;
}
