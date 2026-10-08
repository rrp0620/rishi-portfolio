import { NextResponse } from "next/server";
import { websageOriginAllowed } from "@/lib/websage-origins";
import { COACH_KB } from "@/lib/coach-kb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * WebSage Call Coach backend. The coach page (websage-demos, /coach-*)
 * streams the live call transcript here; we return what the prospect just
 * asked or objected to and a suggested reply grounded in COACH_KB.
 *
 * POST /api/coach { transcript: string[], ask?: string }
 * 200 -> { type, heard, say, facts[], next }
 */

const MODEL = process.env.GEMINI_COACH_MODEL ?? "gemini-2.5-flash";
const RATE_LIMIT_PER_HOUR = 300;
const HITS: Map<string, number[]> = new Map();

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const ok = websageOriginAllowed(origin);
  return ok
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, authorization",
        Vary: "Origin",
      }
    : {};
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

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

const SYSTEM = `You are a real-time sales coach whispering to a WebSage team member who is on a live phone call with a small business owner. You see a rolling transcript of the call (speech-to-text, so expect small errors). Lines may be labeled "REP:" (our team member) and "OWNER:" (the business owner); if there are no labels, both voices are mixed. Focus on the LAST thing the OWNER said, and use what the REP already said as context (don't suggest repeating it). Labels can occasionally be swapped; if a REP line is clearly a prospect question, treat it as the owner's.

Decide what just happened:
- "question": they asked something (price, how it works, setup, contract, data, etc.)
- "objection": pushback or hesitation
- "buying": a buying signal (asking about next steps, start date, payment)
- "none": small talk, our rep talking, or nothing new worth coaching

If not "none", give the rep a reply they can say out loud right now: 1 to 3 short, natural, friendly sentences, first person plural ("we"), plain words, no jargon, no em dashes. Ground every fact in the knowledge below. Never invent prices, features, results, or promises. If the answer isn't in the knowledge, the reply is to say they'll confirm with the builder and get right back to them.

KNOWLEDGE:
${COACH_KB}

The last transcript line may be a sentence the owner is STILL SAYING (cut off mid-word). Anticipate the most likely full question and answer it now; speed matters more than waiting.`;

const OUTPUT_JSON = `OUTPUT: one JSON object only:
{"type":"question|objection|buying|none","heard":"what they asked or said, max 12 words","say":"the reply to say out loud","facts":["up to 3 short supporting facts or numbers from the knowledge"],"next":"one short suggested next move, e.g. ask for the sale, lock a follow-up time"}`;

// Line protocol so the client can render the reply while it streams.
const OUTPUT_LINES = `OUTPUT: plain text, these lines in this exact order, nothing else:
TYPE: question|objection|buying|none
HEARD: what they asked or said, max 12 words
SAY: the reply to say out loud, on one line
FACTS: up to 3 short facts from the knowledge separated by " ; "
NEXT: one short suggested next move
If TYPE is none, output only the TYPE line.`;

async function handle(request: Request): Promise<Response> {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Coach isn't configured." }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!rateLimit(ip)) return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });

  let body: { transcript?: unknown; ask?: unknown; stream?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const lines = (Array.isArray(body.transcript) ? body.transcript : [])
    .filter((l): l is string => typeof l === "string" && l.trim().length > 0)
    .slice(-14)
    .map((l) => l.slice(0, 600));
  const ask = typeof body.ask === "string" ? body.ask.trim().slice(0, 600) : "";
  if (!lines.length && !ask) return NextResponse.json({ error: "Nothing to coach yet." }, { status: 400 });

  const user = ask
    ? `The rep typed this question or situation and needs an answer to say: "${ask}"\n\nRecent call transcript (may be empty):\n${lines.join("\n")}\n\nTreat the typed text as what the business owner said. Do not return type "none".`
    : `Rolling call transcript, oldest first:\n${lines.join("\n")}`;

  if (body.stream === true) return streamLines(apiKey, user);

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: user }] }],
          systemInstruction: { parts: [{ text: SYSTEM + "\n\n" + OUTPUT_JSON }] },
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 400,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );
  } catch {
    return NextResponse.json({ error: "Couldn't reach the model." }, { status: 502 });
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("coach upstream", res.status, t.slice(0, 400));
    return NextResponse.json({ error: "Model error, try again." }, { status: 502 });
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text?.trim())?.text ?? "";
  try {
    const o = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return NextResponse.json({
      type: ["question", "objection", "buying", "none"].includes(o.type) ? o.type : "none",
      heard: String(o.heard ?? ""),
      say: String(o.say ?? ""),
      facts: Array.isArray(o.facts) ? o.facts.slice(0, 3).map(String) : [],
      next: String(o.next ?? ""),
    });
  } catch {
    return NextResponse.json({ error: "Unexpected answer shape." }, { status: 502 });
  }
}

/**
 * Streaming mode: proxies Gemini's SSE stream as plain text lines
 * (TYPE / HEARD / SAY / FACTS / NEXT) so the card fills as words arrive.
 */
async function streamLines(apiKey: string, user: string): Promise<Response> {
  let up: Response;
  try {
    up = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: user }] }],
          systemInstruction: { parts: [{ text: SYSTEM + "\n\n" + OUTPUT_LINES }] },
          generationConfig: { temperature: 0.2, maxOutputTokens: 260, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );
  } catch {
    return NextResponse.json({ error: "Couldn't reach the model." }, { status: 502 });
  }
  if (!up.ok || !up.body) {
    const t = await up.text().catch(() => "");
    console.error("coach stream upstream", up.status, t.slice(0, 400));
    return NextResponse.json({ error: "Model error, try again." }, { status: 502 });
  }
  const reader = up.body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            try {
              const j = JSON.parse(line.slice(5)) as {
                candidates?: { content?: { parts?: { text?: string }[] } }[];
              };
              const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
              if (t) controller.enqueue(enc.encode(t));
            } catch {}
          }
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(out, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

// GET /api/coach?ask=... : quick manual check.
export async function GET(request: Request) {
  const u = new URL(request.url);
  return handle(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        ask: u.searchParams.get("ask") ?? "",
        transcript: (u.searchParams.get("t") ?? "").split("|").filter(Boolean),
        stream: u.searchParams.get("stream") === "1",
      }),
    }),
  );
}

export async function POST(request: Request) {
  const res = await handle(request);
  for (const [k, v] of Object.entries(corsHeaders(request))) res.headers.set(k, v);
  return res;
}
