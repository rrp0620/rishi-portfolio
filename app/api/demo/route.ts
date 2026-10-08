import { NextResponse } from "next/server";
import { getDemoBot } from "@/lib/demo-bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Client demo support bots (Websage). Same stuffed-context Gemini pattern
 * as /api/ask, but the bot speaks as the business's assistant, answers
 * only from that business's knowledge base, and flags when a human
 * should take over (handoff) so the UI can offer lead capture.
 *
 * POST /api/demo  { slug, messages: [{role: "user"|"bot", content}] }
 * 200 -> { answer, handoff }
 */

const MODEL = process.env.GEMINI_ASK_MODEL ?? "gemini-2.5-flash";
const RATE_LIMIT_PER_HOUR = 40;
const HITS: Map<string, number[]> = new Map();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const recent = (HITS.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= RATE_LIMIT_PER_HOUR) {
    HITS.set(key, recent);
    return false;
  }
  recent.push(now);
  HITS.set(key, recent);
  return true;
}

function systemPrompt(
  name: string,
  town: string,
  phone: string,
  handoff: string,
  kb: string,
): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
  return `You are the customer support assistant on the website of ${name} (${town}). Today is ${today}.

Answer customers' questions using ONLY the knowledge base below. Be warm, quick and specific, like a helpful front-desk person. Use plain language.

RULES:
- Keep answers short: 1-4 sentences, or a short list when comparing options. Do the math for the customer when they give numbers (e.g. group size x price).
- Never invent prices, hours, availability, policies or promises. If the knowledge base doesn't cover it, say you're not sure and offer to pass the question to ${handoff}, or suggest calling ${phone}.
- You can't check live availability or make bookings yourself. Point to the booking link or process from the knowledge base.
- Set "handoff" to true when the customer wants a human, wants to book something that needs staff (parties, events, tours, interviews), has a complaint, or asks something the knowledge base can't answer. Otherwise false.
- Stay on topic. Politely decline unrelated requests.
- No markdown headers. Plain text, simple dashes for lists.

KNOWLEDGE BASE:
${kb}

OUTPUT: one JSON object, nothing else:
{"answer": "<reply to the customer>", "handoff": <true|false>}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Demo isn't configured." }, { status: 503 });
  }

  let body: { slug?: string; messages?: { role?: string; content?: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const bot = getDemoBot(String(body.slug ?? ""));
  if (!bot) return NextResponse.json({ error: "Unknown demo." }, { status: 404 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anon";
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "That's a lot of questions! Give it a few minutes and try again." },
      { status: 429 },
    );
  }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "bot") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-12)
    .map((m) => ({
      role: m.role === "bot" ? "model" : "user",
      parts: [{ text: String(m.content).slice(0, 1200) }],
    }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          contents: messages,
          systemInstruction: {
            parts: [{ text: systemPrompt(bot.name, bot.town, bot.phone, bot.handoff, bot.kb) }],
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1200,
            responseMimeType: "application/json",
          },
        }),
      },
    );
  } catch {
    return NextResponse.json({ error: "Couldn't reach the assistant. Try again." }, { status: 502 });
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("demo upstream", res.status, t.slice(0, 500));
    return NextResponse.json(
      { error: res.status === 429 ? "Busy for a moment, try again shortly." : "Something went wrong. Try again." },
      { status: res.status === 429 ? 429 : 502 },
    );
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    data.candidates?.[0]?.content?.parts?.find((p) => p.text?.trim())?.text ?? "";
  let parsed: { answer?: unknown; handoff?: unknown } | null = null;
  try {
    const s = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    parsed = JSON.parse(s);
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed.answer !== "string") {
    // Fall back to raw text rather than failing the demo.
    if (text.trim()) return NextResponse.json({ answer: text.trim(), handoff: false });
    return NextResponse.json({ error: "No answer came back. Try rephrasing." }, { status: 502 });
  }
  return NextResponse.json({ answer: parsed.answer, handoff: parsed.handoff === true });
}
