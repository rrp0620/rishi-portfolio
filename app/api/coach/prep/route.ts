import { NextResponse } from "next/server";
import { COACH_KB, PRICING_VERSION } from "@/lib/coach-kb";
import { websageOriginAllowed } from "@/lib/websage-origins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Call prep (talk track) generator for the WebSage Hub. Hub members only (Supabase session checked with hub_is_member()).
 *
 * POST /api/coach/prep  (Authorization: Bearer <supabase access token>)
 *   { prospect: { business_name, contact_name, industry, town, offer, demo_url, website, notes, number_one_question,
 *                 money_line, facebook_url, instagram_url, google_profile_url, other_links, stage, source }, rep?: string }
 * 200 -> { pricing, offer, why_them, opener, hook, demo_steps[], number_one_question, money_math{line,assumptions},
 *          their_questions[{q,a}], objections[{they,you}], close, voicemail, follow_up{subject,body}, send_after[], watch_outs[] }
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
      headers: { apikey: SUPABASE_PUBLISHABLE, Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch {
    return false;
  }
}

// The caller is the prospect's owner (Rishi or Nicole). Rishi is the builder, so his
// script says "let me check on that" instead of "let me confirm with Rishi".
const SYSTEM = (rep: string) => {
  const isRishi = /^rishi\b/i.test(rep);
  const confirm = isRishi ? "let me check on that and get back to you" : "let me confirm with Rishi";
  return `You write call prep for ${rep}, who is making this call for WebSage (a small AI automation and web studio). ${isRishi ? "Rishi is the founder and builds everything; keep his script plain and friendly, not technical." : `${rep} is warm, great with people, and NOT technical.`} They are about to call a local business owner. Give them everything they need on one screen: what to offer, exactly what to say, what they'll ask, and how to answer. Use plain, spoken language they can say out loud. The caller introduces themself by name (${rep}) and signs everything as ${rep}. Short sentences that still sound human, never robotic. No em dashes anywhere. No jargon. No hype.

Hard rules:
- Use only the facts given about the prospect plus the WebSage knowledge below. Never invent facts about the business (reviews, prices, hours, staff, numbers). If a fact is missing, write around it or tell them to ask.
- Prices and terms only from the knowledge below. Discounts only as the knowledge allows (setup waived on a bundle, $500 one-time site); anything else is "${confirm}". Never invent promos or deadlines. The TERMS are locked in: say "no contract, cancel any time, no cancellation fee" plainly when price or commitment comes up, never hedge it.
- Never claim clients, case studies or results. We have none yet besides our own businesses. Never imply other customers either ("many people choose", "most of our clients", "popular with").
- Money math: use their own numbers if given, otherwise conservative low-end assumptions and say they're assumptions. Never promise results.
- Pick the single best-fit offer for this business (not always the chatbot). If they have a demo site/bot, the call is built around showing it. A studio (beauty, tattoo, med spa) gets the STUDIO PITCH: Free Fix List, then the demo, then $500 setup + $397/mo with the founding offer of $299/mo locked plus the Launch Bonus Pack (word for word from the knowledge); pushback goes to Growth $249/mo, then the $500 one-time site; never below the floors ($299/mo Launch, $500 one-time site). Any other spec website prospect gets the website offer, led with the $500 one-time site, then Growth at $249/mo, then own-it options (see HOW TO PITCH A WEBSITE); a chatbot demo gets the assistant offer; add at most one natural add-on.
- Their likely questions must include 2-3 "can it do X?" capability questions specific to their business, answered honestly from the CAN / CAN'T lists (e.g. "will it know my daily specials?").
- Texting: never suggest texting someone who hasn't opted in. The follow-up is an email.

WEBSAGE KNOWLEDGE:
${COACH_KB}

OUTPUT: one JSON object only, no markdown:
{"offer":"the offer + price in one line, e.g. 'Website: $500 one time to get started (list $990). Growth $249/mo as the next step. Own it: $990 single page, $2,500 multi-page'",
 "why_them":"1-2 sentences: why this business, why now (from the facts)",
 "opener":"first 2-3 sentences ${rep} says, using the contact's first name if known",
 "hook":"2-3 sentences explaining what we built for them and why it matters to them",
 "demo_steps":["3-4 short steps for walking them through the demo or site while on the phone"],
 "number_one_question":"the one question their customers ask most, to try live (use the given one if present)",
 "money_math":{"line":"one sentence ${rep} can say","assumptions":"the assumptions, short"},
 "their_questions":[{"q":"a question this owner will likely ask","a":"a short honest answer ${rep} can say"}] (5-7 items, include capability questions),
 "objections":[{"they":"likely objection","you":"short answer"}] (3-4 items, specific to this business),
 "close":"the close, 2 sentences, ending with a specific next step",
 "voicemail":"a 20-second voicemail with the phone (302) 344-2033",
 "follow_up":{"subject":"email subject","body":"short follow-up email signed ${rep}, WebSage, with the demo link if there is one"},
 "send_after":["links to send after the call: their demo link if any, plus the matching websageinc.com/services page"],
 "watch_outs":["anything the caller must not say or must check first, e.g. missing phone, unconfirmed price"]}`;
};

type P = Record<string, unknown>;
const s = (v: unknown, n = 600) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(request: Request) {
  const headers = cors(request);
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || !(await isMember(token))) {
    return NextResponse.json({ error: "Not signed in to the WebSage Hub." }, { status: 401, headers });
  }
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Call prep isn't configured." }, { status: 503, headers });

  let body: { prospect?: P; rep?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400, headers });
  }
  const p = body.prospect ?? {};
  if (!s(p.business_name)) return NextResponse.json({ error: "Missing business name." }, { status: 400, headers });
  const facts = [
    ["Business", s(p.business_name, 160)],
    ["Contact", s(p.contact_name, 160)],
    ["Industry", s(p.industry, 120)],
    ["Town", s(p.town, 120)],
    ["Stage", s(p.stage, 40)],
    ["Source", s(p.source, 160)],
    ["Offer noted in CRM", s(p.offer, 200)],
    ["Demo or spec site we built", s(p.demo_url, 300)],
    ["Their current website", s(p.website, 300)],
    ["Their customers' #1 question", s(p.number_one_question, 300)],
    ["Money line noted", s(p.money_line, 300)],
    ["Facebook", s(p.facebook_url, 300)],
    ["Instagram", s(p.instagram_url, 300)],
    ["Google profile", s(p.google_profile_url, 300)],
    ["Other links", s(p.other_links, 600)],
    ["Notes", s(p.notes, 3000)],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const rep = s(body.rep, 60) || "Nicole";
  const user = `Rep: ${rep}\n\nPROSPECT FACTS:\n${facts}`;

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: user }] }],
          systemInstruction: { parts: [{ text: SYSTEM(rep) }] },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4000,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 1024 },
          },
        }),
      },
    );
  } catch {
    return NextResponse.json({ error: "Couldn't reach the model." }, { status: 502, headers });
  }
  if (!res.ok) {
    console.error("prep upstream", res.status, (await res.text().catch(() => "")).slice(0, 400));
    return NextResponse.json({ error: "Model error, try again." }, { status: 502, headers });
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const out = data.candidates?.[0]?.content?.parts?.map((x) => x.text ?? "").join("") ?? "";
  try {
    const o = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
    // Belt and braces: no em dashes in anything Nicole reads out or sends.
    const clean = JSON.parse(JSON.stringify(o).replace(/—/g, ", "));
    // The Hub flags any prep without the current pricing tag.
    return NextResponse.json({ ...clean, pricing: PRICING_VERSION }, { headers });
  } catch {
    return NextResponse.json({ error: "Unexpected prep shape." }, { status: 502, headers });
  }
}
