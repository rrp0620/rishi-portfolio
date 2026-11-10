/**
 * Gemini generateContent with a fallback chain. Each model has its own quota, and Google
 * retires models over time, so a model that is out of quota (429), overloaded (500/503),
 * retired or not enabled (404/403) is skipped and the next one is tried. A skipped model
 * rests before it is asked again: a few seconds after an overload, a minute after a 429,
 * a day after it disappears. The "-latest" aliases always point at Google's current models,
 * so the chain keeps working when a named model is retired.
 *
 * Override the order with GEMINI_MODELS (comma separated) without a code change.
 */
const DEFAULT_CHAIN = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-flash-lite-latest",
];
const CHAIN = (process.env.GEMINI_MODELS ?? "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODELS = CHAIN.length ? CHAIN : DEFAULT_CHAIN;
// Statuses that mean "this model can't answer right now, try the next one", and how long it rests.
const SKIP: Record<number, number> = { 429: 60_000, 500: 5_000, 503: 5_000, 404: 86_400_000, 403: 3_600_000 };
const coolUntil = new Map<string, number>();

// Gemini 3 models think before answering, and thinking counts against maxOutputTokens.
// Keep it low so short tool answers aren't cut off mid-sentence.
function bodyFor(model: string, body: Record<string, unknown>): Record<string, unknown> {
  if (!model.startsWith("gemini-3")) return body;
  const gc = (body.generationConfig ?? {}) as Record<string, unknown>;
  if (gc.thinkingConfig) return body;
  return { ...body, generationConfig: { ...gc, thinkingConfig: { thinkingLevel: "low" } } };
}

export async function generateContent(
  key: string,
  body: Record<string, unknown>,
  opts: { search?: boolean; signal?: AbortSignal } = {},
): Promise<Response> {
  const ready = MODELS.filter((m) => (coolUntil.get(m) ?? 0) <= Date.now());
  let last: Response | null = null;
  for (const model of ready.length ? ready : MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify(bodyFor(model, body)),
        signal: opts.signal,
      },
    );
    // Google Search grounding isn't on every model or tier: a 400 with search on means
    // "not on this model", so move on instead of failing the whole request.
    const rest = SKIP[res.status] ?? (opts.search && res.status === 400 ? 3_600_000 : 0);
    if (!rest) {
      coolUntil.delete(model);
      return res;
    }
    console.error("gemini skip", model, res.status);
    coolUntil.set(model, Date.now() + rest);
    last = res;
  }
  return last!;
}
