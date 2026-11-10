/**
 * Groq fallback for when every Gemini model is out of quota or down. Groq has a free tier.
 * groq/compound searches the web on its own, so it can stand in for Gemini's Google Search
 * grounding (AI check). Plain answers use a fast open model.
 * Off unless GROQ_API_KEY is set.
 */
type Msg = { role: "system" | "user" | "assistant"; content: string };

const SEARCH_MODEL = process.env.GROQ_SEARCH_MODEL ?? "groq/compound";
const CHAT_MODEL = process.env.GROQ_CHAT_MODEL ?? "llama-3.3-70b-versatile";

export const groqEnabled = () => Boolean(process.env.GROQ_API_KEY);

export async function groqChat(opts: {
  system: string;
  contents: { role: "user" | "model"; parts: { text: string }[] }[];
  search?: boolean;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<{ ok: boolean; status: number; text: string; sources: { title: string; uri: string }[] }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, status: 503, text: "", sources: [] };
  const messages: Msg[] = [
    { role: "system", content: opts.system },
    ...opts.contents.map((c) => ({
      role: (c.role === "model" ? "assistant" : "user") as Msg["role"],
      content: c.parts.map((p) => p.text).join("\n"),
    })),
  ];
  const body: Record<string, unknown> = {
    model: opts.search ? SEARCH_MODEL : CHAT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_completion_tokens: Math.min(opts.maxTokens ?? 2048, 8192),
  };
  if (opts.json && !opts.search) body.response_format = { type: "json_object" };
  const t0 = Date.now();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    console.error("groq", body.model, res.status, (await res.text().catch(() => "")).slice(0, 400));
    return { ok: false, status: res.status, text: "", sources: [] };
  }
  console.log("groq", body.model, res.status, Date.now() - t0);
  const data = (await res.json()) as {
    choices?: {
      message?: {
        content?: string;
        executed_tools?: { search_results?: { results?: { title?: string; url?: string }[] } }[];
      };
    }[];
  };
  const m = data.choices?.[0]?.message;
  const text = String(m?.content ?? "").trim();
  const sources = (m?.executed_tools ?? [])
    .flatMap((t) => t.search_results?.results ?? [])
    .map((r) => ({ title: String(r.title ?? ""), uri: String(r.url ?? "") }))
    .filter((s) => s.uri);
  return { ok: text.length > 0, status: 200, text, sources };
}
