// Reading stats from the raw markdown body — same formula as the remark
// plugin (src/utils/reading-time.mjs) so list rows and post pages agree,
// but usable without rendering the post.

export function wordCountOf(body: string): number {
  return body.split(/\s+/).filter((w) => w.length > 0).length;
}

export function readingMinutesOf(body: string): number {
  return Math.max(1, Math.ceil(wordCountOf(body) / 200));
}
