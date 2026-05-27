import { NextResponse } from "next/server";
import { VOICE_RULES, BIO, FAQ, SOURCES } from "@/lib/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ask Rishi endpoint, powered by Google Gemini.
 *
 * POST /api/ask
 * Body: { question: string }
 * Response (200): { answer: string, sources: { slug, title }[] }
 *
 * Strategy: stuffed-context prompting. The full bio + voice rules + the
 * project source bodies + the FAQ entries are concatenated into the
 * system prompt. Gemini answers in Rishi's voice and returns the slugs
 * of the sources it grounded on so the UI can render clickable citations.
 *
 * Corpus size is comfortably under Gemini's context window. If it grows,
 * swap to embedding-based retrieval against lib/knowledge.ts.
 */

const MODEL = process.env.GEMINI_ASK_MODEL ?? "gemini-2.5-flash";
const TEMPERATURE = 0.55;
const MAX_OUTPUT_TOKENS = 1500;
const RATE_LIMIT_PER_HOUR = 8;

function buildSystemPrompt(): string {
  const allSources = [...SOURCES, ...FAQ];
  const knowledgeBlock = allSources
    .map(
      (s) =>
        `<<<source slug="${s.slug}" title="${s.title}">>>\n${s.body}\n<<<end>>>`,
    )
    .join("\n\n");

  return `You are answering questions about Rishi Patel for visitors to his portfolio site. Most visitors are recruiters or hiring managers evaluating him for AI deployment roles (AI Outcomes Manager, AI Solutions Manager, Forward Deployed Strategist, AI Enablement Lead).

This is a multi-turn chat. You may receive several prior turns of conversation. Respond ONLY to the most recent user message, but use the earlier turns as context. If the user is following up on something you just said, treat it as a follow-up — don't re-introduce yourself or restate background.

You speak as Rishi, in his voice, in the first person. Never refer to him in the third person inside the answer field.

${VOICE_RULES}

BIO — facts you can rely on:
${BIO}

SOURCES — the only material you can ground answers in. Cite the slugs of the sources you actually used in the sources array. Never cite a slug that's not in this list. If multiple sources contributed, list each one.

${knowledgeBlock}

ANSWER RULES:
- Keep it tight. 80-220 words in the answer field. Visitors are skimming. Long answers signal AI; short specific answers signal a person who knows what he's talking about.
- Stay grounded. Every claim should be traceable to a source above or to the BIO. If the question is outside what's covered, say so plainly: "I haven't written about that yet" or "That isn't something I'd want to answer in a public Q&A."
- Decline politely on: salary specifics by employer, internal company information beyond what's already in the sources, personal life, anyone else's information, anything that would put a customer's data at risk.
- Don't make up numbers. Use the ranges in the sources, not invented point estimates.
- If the user asks about a specific company (Glean, Vercel, Anthropic, etc.), feel free to use what's commonly known about the company and connect Rishi's work to it. Don't invent specifics about the company's internal stack.

OUTPUT FORMAT:
Your entire response must be ONE valid JSON object. No preamble. No markdown fences. Just the JSON.

{
  "answer": "<the answer, 80-220 words, in Rishi's voice, first person>",
  "sources": [
    { "slug": "<source slug>", "title": "<source title>" }
  ]
}

Cite 1 to 3 sources. If the answer is purely from the BIO and no source bodies apply, return an empty sources array.`;
}

type GeminiPart = { text?: string } & Record<string, unknown>;
type GeminiCandidate = {
  content?: { parts?: GeminiPart[]; role?: string };
  finishReason?: string;
};
type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: unknown;
  error?: { code?: number; message?: string; status?: string };
};

const HITS: Map<string, number[]> = new Map();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < oneHour);
  if (recent.length >= RATE_LIMIT_PER_HOUR) {
    HITS.set(ip, recent);
    return false;
  }
  recent.push(now);
  HITS.set(ip, recent);
  return true;
}

function extractJson(text: string): unknown {
  if (!text) return null;
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  try {
    return JSON.parse(stripped.slice(first, last + 1));
  } catch {
    return null;
  }
}

type AskResult = {
  answer: string;
  sources: { slug: string; title: string }[];
};

function normalize(value: unknown): AskResult | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.answer !== "string" || v.answer.length < 5) return null;

  const sources: { slug: string; title: string }[] = [];
  if (Array.isArray(v.sources)) {
    for (const raw of v.sources) {
      if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (typeof r.slug === "string" && typeof r.title === "string") {
          sources.push({ slug: r.slug, title: r.title });
        }
      }
    }
  }

  return { answer: v.answer, sources };
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: { role: "user" | "rishi"; content: string }[],
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    MODEL,
  )}:generateContent`;

  // Translate our chat shape to Gemini's contents format. Our "rishi" role
  // maps to Gemini's "model" role.
  const contents = messages.map((m) => ({
    role: m.role === "rishi" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  return fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json",
      },
    }),
  });
}

function getResponseText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  for (const part of parts) {
    if (typeof part.text === "string" && part.text.trim().length > 0) {
      return part.text;
    }
  }
  return "";
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Ask Rishi isn't wired up yet. Email me and I'll answer it myself.",
      },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  if (!rateLimit(ip)) {
    return NextResponse.json(
      {
        error:
          "You've used your questions for this session. Email me and I'll answer more directly.",
      },
      { status: 429 },
    );
  }

  let body: {
    question?: string;
    messages?: { role?: "user" | "rishi"; content?: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with a `messages` array or a `question` field." },
      { status: 400 },
    );
  }

  // Accept two shapes for backward compatibility:
  //   - { question }                   — single-turn (legacy)
  //   - { messages: [{role, content}]} — multi-turn chat
  type Msg = { role: "user" | "rishi"; content: string };
  let messages: Msg[] = [];
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    messages = body.messages
      .filter(
        (m): m is Msg =>
          !!m &&
          (m.role === "user" || m.role === "rishi") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
  } else if (typeof body.question === "string") {
    const q = body.question.trim().slice(0, 800);
    if (q.length > 0) messages = [{ role: "user", content: q }];
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "Send at least one user message." },
      { status: 400 },
    );
  }

  const lastUser = messages[messages.length - 1].content.trim();
  if (lastUser.length < 4) {
    return NextResponse.json(
      { error: "Ask a real question. A few words at minimum." },
      { status: 400 },
    );
  }

  const systemPrompt = buildSystemPrompt();
  let response: Response;
  try {
    response = await callGemini(apiKey, systemPrompt, messages);
  } catch (e) {
    console.error("ask fetch threw", e);
    return NextResponse.json(
      { error: "Couldn't reach the model. Try again in a moment." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "<no body>");
    console.error("ask upstream error", response.status, errText.slice(0, 1000));

    const lower = errText.toLowerCase();
    const isQuota =
      lower.includes("quota") ||
      lower.includes("resource_exhausted") ||
      lower.includes("rate limit") ||
      response.status === 429;
    if (isQuota) {
      return NextResponse.json(
        {
          error:
            "Ask Rishi is briefly throttled. Give it a minute and try again.",
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "The model returned an error. Try again in a moment." },
      { status: 502 },
    );
  }

  const data = (await response.json()) as GeminiResponse;
  const text = getResponseText(data);
  if (!text) {
    return NextResponse.json(
      { error: "The model returned no text. Try rephrasing." },
      { status: 502 },
    );
  }

  const parsed = extractJson(text);
  const normalized = normalize(parsed);
  if (!normalized) {
    console.error("ask parse failure", text.slice(0, 1000));
    return NextResponse.json(
      { error: "The answer came back in a shape I didn't expect. Try again." },
      { status: 502 },
    );
  }

  return NextResponse.json(normalized);
}
