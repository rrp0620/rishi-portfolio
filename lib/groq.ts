/**
 * Groq fallback for when every Gemini model is out of quota or down. Groq has a free tier.
 * Search calls (AI check) use gpt-oss-120b with Groq's built-in browser_search tool, so it can
 * stand in for Gemini's Google Search grounding. Off unless GROQ_API_KEY is set.
 */
type Msg = { role: "system" | "user" | "assistant"; content: string };
type Result = { ok: boolean; status: number; text: string; sources: { title: string; uri: string }[] };

const SEARCH_MODEL = process.env.GROQ_SEARCH_MODEL ?? "openai/gpt-oss-120b";
const CHAT_MODEL = process.env.GROQ_CHAT_MODEL ?? "openai/gpt-oss-120b";

export const groqEnabled = () => Boolean(process.env.GROQ_API_KEY);

// gpt-oss cites sources inline like 【3†L8-L14】; strip them so they never reach the page.
const clean = (s: string) => s.replace(/【[^】]*】/g, "").trim();

type ExecutedTool = {
  output?: string;
  search_results?: { results?: { title?: string; url?: string }[] };
};

function sourcesFrom(tools: ExecutedTool[] | undefined): Result["sources"] {
  const out: Result["sources"] = [];
  for (const t of tools ?? []) {
    for (const r of t.search_results?.results ?? []) {
      if (r.url) out.push({ title: String(r.title ?? ""), uri: String(r.url) });
    }
  }
  const seen = new Set<string>();
  return out.filter((s) => (seen.has(s.uri) ? false : (seen.add(s.uri), true))).slice(0, 12);
}

export async function groqChat(opts: {
  system: string;
  contents: { role: "user" | "model"; parts: { text: string }[] }[];
  search?: boolean;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<Result> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, status: 503, text: "", sources: [] };
  const system = opts.search
    ? `${opts.system}\n\nLook things up with the browser_search tool. It is your only tool. Write your final answer as plain text in your reply.`
    : opts.system;
  const messages: Msg[] = [
    { role: "system", content: system },
    ...opts.contents.map((c) => ({
      role: (c.role === "model" ? "assistant" : "user") as Msg["role"],
      content: c.parts.map((p) => p.text).join("\n"),
    })),
  ];
  const body: Record<string, unknown> = {
    model: opts.search ? SEARCH_MODEL : CHAT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_completion_tokens: Math.min(Math.max(opts.maxTokens ?? 2048, 2048), 8192),
    reasoning_effort: "low",
  };
  if (opts.search) body.tools = [{ type: "browser_search" }];
  else if (opts.json) body.response_format = { type: "json_object" };

  const t0 = Date.now();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    // When asked for JSON, gpt-oss sometimes "calls" a json tool with the answer as arguments.
    // Groq rejects that, but the finished answer is in failed_generation: use it.
    try {
      const fg = JSON.parse(raw)?.error?.failed_generation;
      if (typeof fg === "string" && fg) {
        const call = JSON.parse(fg) as { arguments?: unknown };
        const args = call.arguments ?? call;
        const text = clean(typeof args === "string" ? args : JSON.stringify(args));
        if (text) {
          console.log("groq", body.model, "recovered", Date.now() - t0);
          return { ok: true, status: 200, text, sources: [] };
        }
      }
    } catch {
      /* not recoverable */
    }
    console.error("groq", body.model, res.status, raw.slice(0, 400));
    return { ok: false, status: res.status, text: "", sources: [] };
  }
  console.log("groq", body.model, res.status, Date.now() - t0);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string; executed_tools?: ExecutedTool[] } }[];
  };
  const m = data.choices?.[0]?.message;
  const text = clean(String(m?.content ?? ""));
  return { ok: text.length > 0, status: 200, text, sources: sourcesFrom(m?.executed_tools) };
}
