/**
 * Gemini generateContent with a free-tier fallback chain. Each model has its own small
 * free quota, so on 429 we try the next model and only give up when all of them are out.
 * A model that just returned 429 is skipped for a minute so we don't burn time re-asking it.
 */
const CHAIN = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash-preview"];
// Google Search grounding is only free on the 2.5 models.
const SEARCH_OK = new Set(["gemini-2.5-flash", "gemini-2.5-flash-lite"]);
const COOLDOWN_MS = 60_000;
const coolUntil = new Map<string, number>();

export async function generateContent(
  key: string,
  body: Record<string, unknown>,
  opts: { search?: boolean; signal?: AbortSignal } = {},
): Promise<Response> {
  const models = CHAIN.filter((m) => !opts.search || SEARCH_OK.has(m));
  const ready = models.filter((m) => (coolUntil.get(m) ?? 0) <= Date.now());
  let last: Response | null = null;
  for (const model of ready.length ? ready : models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: opts.signal,
      },
    );
    if (res.status !== 429) {
      coolUntil.delete(model);
      return res;
    }
    coolUntil.set(model, Date.now() + COOLDOWN_MS);
    last = res;
  }
  return last!;
}
