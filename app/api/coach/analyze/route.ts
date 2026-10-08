import { NextResponse } from "next/server";
import { COACH_KB } from "@/lib/coach-kb";
import { websageOriginAllowed } from "@/lib/websage-origins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Post-call review for the WebSage Hub. Only signed-in Hub members can call it:
 * the caller's Supabase session token is checked against hub_is_member().
 *
 * POST /api/coach/analyze  (Authorization: Bearer <supabase access token>)
 *   { lines: ["REP: ...", "OWNER: ..."], prospect?: string }
 * 200 -> { summary, outcome, score, objections[], buying_signals[], went_well[], improve[], next_step, follow_up }
 */

const SUPABASE_URL = "https://nqjhbrfplcfiqzeukttf.supabase.co";
// Publishable (public) key; access is enforced by RLS + hub_is_member().
const SUPABASE_PUBLISHABLE = "sb_publishable_83HRAUVqPDJezr2LrhCBTA_GsO1i6as";
const MODEL = process.env.GEMINI_COACH_MODEL ?? "gemini-2.5-flash";

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  return websageOriginAllowed(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, authorization",
        Vary: "Origin",
      }
    : {};
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) });
}

async function isMember(token: string): Promise<boolean> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/hub_is_member`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE,
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "{}",
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch {
    return false;
  }
}

const SYSTEM = `You review recorded sales calls for WebSage, a small AI automation company. Our rep (labeled REP) called a small business owner (labeled OWNER). Labels come from automatic speaker detection and can occasionally be swapped; use common sense. The transcript is speech-to-text, so expect small errors.

Be a supportive, specific, honest sales coach. Judge the rep against WebSage's own playbook below (offer, prices, objection answers, close). Quote short phrases from the call when useful. Never invent things that weren't said.

WEBSAGE KNOWLEDGE:
${COACH_KB}

OUTPUT: one JSON object only, no markdown:
{"summary":"2-3 sentences: who, what was discussed, where it landed",
 "outcome":"won|follow_up_booked|send_info|not_interested|no_decision|voicemail|other",
 "score":1-10 (how well the rep ran the call),
 "objections":[{"said":"what the owner said","handled":"how the rep responded, short","better":"a better answer from the playbook, 1-2 sentences"}],
 "buying_signals":["short phrases"],
 "questions":["questions the owner asked"],
 "went_well":["up to 3 specific things"],
 "improve":["up to 3 specific, actionable things"],
 "next_step":"the agreed or recommended next step, with date/time if one was set",
 "follow_up":"a short friendly follow-up email the rep can send, plain text, no em dashes, signed as the rep"}`;

export async function POST(request: Request) {
  const headers = cors(request);
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || !(await isMember(token))) {
    return NextResponse.json({ error: "Not signed in to the WebSage Hub." }, { status: 401, headers });
  }
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Review isn't configured." }, { status: 503, headers });

  let body: { lines?: unknown; prospect?: unknown; rep?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400, headers });
  }
  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .filter((l): l is string => typeof l === "string" && l.trim().length > 0)
    .map((l) => l.slice(0, 2000));
  let text = lines.join("\n");
  if (text.length > 120_000) text = text.slice(0, 20_000) + "\n...\n" + text.slice(-100_000);
  if (!text.trim()) return NextResponse.json({ error: "Empty transcript." }, { status: 400, headers });
  const prospect = typeof body.prospect === "string" ? body.prospect.slice(0, 200) : "";
  const rep = typeof body.rep === "string" ? body.rep.slice(0, 60) : "";

  const user = `${prospect ? `Prospect: ${prospect}\n` : ""}${rep ? `Rep: ${rep}\n` : ""}\nTRANSCRIPT:\n${text}`;
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: user }] }],
          systemInstruction: { parts: [{ text: SYSTEM }] },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2500,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 512 },
          },
        }),
      },
    );
  } catch {
    return NextResponse.json({ error: "Couldn't reach the model." }, { status: 502, headers });
  }
  if (!res.ok) {
    console.error("analyze upstream", res.status, (await res.text().catch(() => "")).slice(0, 400));
    return NextResponse.json({ error: "Model error, try again." }, { status: 502, headers });
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const out = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    const o = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
    return NextResponse.json(o, { headers });
  } catch {
    return NextResponse.json({ error: "Unexpected review shape." }, { status: 502, headers });
  }
}
