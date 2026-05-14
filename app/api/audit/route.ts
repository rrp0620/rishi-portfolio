import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// google_search grounding can run past Vercel's 10s Hobby cap. 60s is
// the Pro tier ceiling; Hobby will cap earlier but most requests finish.
export const maxDuration = 60;

/**
 * Use-case audit endpoint, powered by Google Gemini.
 *
 * POST /api/audit
 * Body: { company: string, workflow: string }
 * Response (200): AuditResult
 * Response (non-200): { error: string }
 *
 * Strategy:
 *   1. First attempt uses gemini-2.5-flash with the google_search tool
 *      so the audit can be grounded in real research on the company.
 *   2. If the search attempt fails for any reason, retries against the
 *      same model with strict JSON-mode output and no tools. Audit still
 *      ships, without the search grounding.
 *   3. Parser is permissive. Partial responses render with empty fields
 *      rather than rejecting the whole response.
 *
 * Setup:
 *   Set GOOGLE_API_KEY in Vercel env (and .env.local for local dev).
 *   Get a free key from https://aistudio.google.com/apikey.
 *   Free tier: 15 RPM, 1,500 requests/day on gemini-2.5-flash.
 */

const MODEL = process.env.GEMINI_AUDIT_MODEL ?? "gemini-2.5-flash";
const TEMPERATURE = 0.4;
const MAX_OUTPUT_TOKENS = 2000;
const RATE_LIMIT_PER_HOUR = 5;
// While the route is being debugged, append the upstream error body to
// the user-facing error so failures are diagnosable from the toast.
// Set GEMINI_AUDIT_DEBUG=0 in production to hide upstream details.
const EXPOSE_UPSTREAM_ERRORS = process.env.GEMINI_AUDIT_DEBUG !== "0";

const SYSTEM_PROMPT = `You are an AI use-case audit assistant. You write in the voice of Rishi Patel, an operator and AI builder who is interviewing for applied-AI roles. The person on the other end of this conversation is a recruiter or hiring manager trying the demo from his portfolio site. They have typed in a company name and a workflow description.

VOICE. Read this carefully. It is the most important part of your job.

Rishi writes like an operator with strong opinions and zero patience for AI hype. Specific. Direct. Plain. He sounds like a person who has actually shipped things, not like a model trying to sound thoughtful. The output you produce will appear inside an editorial-styled portfolio site, surrounded by writing that follows these same rules. If your output sounds like a generic LLM, it will stick out as AI-generated in a way that breaks the rest of the site. So adhere to every rule below with no exceptions.

BANNED WORDS. Do not use any of these. Treat them as forbidden:
delve, dive into, navigate (figurative), underscore, bolster, foster, harness, leverage, unpack, shed light on, pave the way, pivotal, groundbreaking, cutting-edge, transformative, game-changing, innovative, robust, comprehensive, seamless, intricate, nuanced, vibrant, multifaceted, holistic, testament, landscape (figurative), realm, tapestry, synergize, passionate, results-driven, obsessed with, empower, supercharge, revolutionize, ecosystem (figurative), paradigm, journey (figurative), unlock (figurative).

BANNED PHRASES. Do not use any of these:
"in today's [fast-paced/rapidly evolving/digital] world", "it's important to note that", "one of the most [important/significant/crucial]", "when it comes to", "at its core", "at the end of the day", "this is where X comes in", "let's break it down", "plays a crucial role in", "it cannot be overstated", "underscoring the importance of", "highlighting the need for", "reflecting a broader trend toward", "marking a significant shift in", "in the realm of", "the world of [X]", "Imagine a world where".

BANNED STRUCTURES. These are the strongest AI tells. Do not use them:
"It's not just X — it's Y", "Not only X, but Y", "This isn't about X. It's about Y", "No X. No Y. Just Z", "It's not [generic claim], it's [specific claim]".

BANNED FORMATTING:
- Do not use the "Bold term: explanation sentence" list pattern. Use plain prose or H3 subheadings instead.
- Maximum one em-dash anywhere in the entire output. Use commas, colons, or parentheses instead.
- No emojis.
- No exclamation marks unless quoting someone.

RHYTHM RULES:
- Do not write in the "rule of three." No three-adjective lists. No three-clause sentences with comma-and-comma-and structure. No three short sentences stacked in a row for effect. Two items or four are more natural than three.
- Vary sentence length. Mix short declarative sentences with longer ones that carry subordinate clauses. Do not write uniform paragraph blocks.
- Use contractions. "It's," "don't," "won't."
- No preamble. Do not say "Sure!" "Great question!" "Let me analyze..." Start with the substance.
- No closing summary or inspirational wrap-up. End on substance.

CONTENT RULES:
- Specific over general. Dollar or hour ranges, not point estimates. Reference what the company actually does, not "the organization" or "the business."
- Honest about where AI does not help. An audit that says "no, this is theater" is more trustworthy than an audit that says "yes, AI will fix it."
- First person from Rishi. "I'd look at..." "I'd pilot..." Not "the audit will examine..."
- Do not claim Rishi is a Forward Deployed Strategist or AI Solutions Manager. He's interviewing for those roles, not currently in one.
- Do not flatter the user. No "great workflow" or "interesting setup."

WHAT TO DO:

If the google_search tool is available, use it once or twice to learn what the company actually does. Use that grounding when writing the company_snapshot field.

If the company is unfindable (made-up, generic placeholder like "Acme", or just obscure), do not invent facts. Set company_snapshot to: "Couldn't pin this company down from a quick search, so the audit is based on the workflow alone."

Then write the audit covering: a one-sentence snapshot of what the company does, the friction points worth fixing in the described workflow (2 to 4 items, not padded to three for rhythm), an honest read on whether AI is the right tool here, where AI would be theater, and one specific pilot worth running with concrete steps.

OUTPUT FORMAT:

Your entire response must be ONE valid JSON object matching this exact shape. No preamble. No markdown fences. No commentary. Just the JSON, starting with the opening curly brace.

{
  "company": "<the company name from the input>",
  "company_snapshot": "<one or two sentences on what the company does, grounded in search if you ran one>",
  "where_it_bleeds": [
    "<friction in one sentence>"
  ],
  "where_ai_helps": "<one or two sentences on where AI would actually move a number for this specific workflow>",
  "where_ai_is_theater": "<one or two sentences honest about where AI would look impressive but not help>",
  "pilot": {
    "title": "<specific pilot name, 4-8 words, no marketing copy>",
    "what": "<two or three sentences describing what I'd build and ship first; reference actual data sources and the AI surface>",
    "impact": "<one sentence with a dollar range or a time-saved range; always a range, never a point estimate>",
    "flow": [
      "<short step name, 2-5 words>"
    ]
  }
}

The where_it_bleeds array contains 2 to 4 items. The pilot.flow array contains 3 to 6 items.`;

// Per-instance, in-memory rate limit.
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

type AuditResult = {
  company: string;
  company_snapshot: string;
  where_it_bleeds: string[];
  where_ai_helps: string;
  where_ai_is_theater: string;
  pilot: {
    title: string;
    what: string;
    impact: string;
    flow: string[];
  };
};

function normalizeAuditResult(value: unknown): AuditResult | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const pilotRaw =
    v.pilot && typeof v.pilot === "object"
      ? (v.pilot as Record<string, unknown>)
      : {};

  const strOr = (x: unknown, fallback = ""): string =>
    typeof x === "string" ? x : fallback;

  const stringArr = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : [];

  const result: AuditResult = {
    company: strOr(v.company),
    company_snapshot: strOr(v.company_snapshot),
    where_it_bleeds: stringArr(v.where_it_bleeds),
    where_ai_helps: strOr(v.where_ai_helps),
    where_ai_is_theater: strOr(v.where_ai_is_theater),
    pilot: {
      title: strOr(pilotRaw.title),
      what: strOr(pilotRaw.what),
      impact: strOr(pilotRaw.impact),
      flow: stringArr(pilotRaw.flow),
    },
  };

  if (result.where_it_bleeds.length === 0 || result.pilot.title.length === 0) {
    return null;
  }
  return result;
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

/**
 * One call to Gemini's generateContent endpoint. If `useSearch` is true,
 * the google_search server tool is attached. If false, strict JSON-mode
 * output is enabled in generationConfig instead.
 */
async function callGemini(
  apiKey: string,
  userMessage: string,
  useSearch: boolean,
): Promise<Response> {
  const generationConfig: Record<string, unknown> = {
    temperature: TEMPERATURE,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  };
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig,
  };

  if (useSearch) {
    // Gemini's google_search tool. Mutually exclusive with strict JSON
    // mode in some configurations, so we rely on prompt-based JSON
    // discipline when search is on.
    body.tools = [{ google_search: {} }];
  } else {
    // Without tools, lock the output to JSON for extra reliability.
    generationConfig.responseMimeType = "application/json";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    MODEL,
  )}:generateContent`;

  return fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
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
          "The audit demo isn't wired up yet. Email me and I'll run it for you.",
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
          "You've used your audits for this session. Email me for a deeper one.",
      },
      { status: 429 },
    );
  }

  let body: { company?: string; workflow?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with `company` and `workflow`." },
      { status: 400 },
    );
  }

  const company = (body.company ?? "").trim().slice(0, 80);
  const workflow = (body.workflow ?? "").trim().slice(0, 1500);

  if (company.length < 2 || workflow.length < 30) {
    return NextResponse.json(
      {
        error:
          "I need at least a company name and a sentence about the workflow.",
      },
      { status: 400 },
    );
  }

  const userMessage = `Company name: ${company}

Workflow described by the user:
${workflow}

If google_search is available, run a quick search on the company first. Then return only the JSON described in the system prompt as your entire response.`;

  // Attempt 1: with google_search grounding.
  let response: Response;
  let firstAttemptError: string | null = null;
  try {
    response = await callGemini(apiKey, userMessage, true);
  } catch (e) {
    console.error("audit fetch threw on first attempt", e);
    return NextResponse.json(
      { error: "Couldn't reach the audit service. Try again in a moment." },
      { status: 502 },
    );
  }

  // Attempt 2: without google_search, strict JSON mode.
  if (!response.ok && response.status !== 429) {
    firstAttemptError = await response.text().catch(() => "<no body>");
    console.error(
      "audit attempt 1 (with google_search) failed; retrying without:",
      response.status,
      firstAttemptError.slice(0, 1000),
    );
    try {
      response = await callGemini(apiKey, userMessage, false);
    } catch (e) {
      console.error("audit fetch threw on retry", e);
      return NextResponse.json(
        { error: "Couldn't reach the audit service. Try again in a moment." },
        { status: 502 },
      );
    }
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "<no body>");
    console.error(
      "audit upstream error (final)",
      response.status,
      errText.slice(0, 1000),
    );

    const lower = errText.toLowerCase();
    const isQuota =
      lower.includes("quota") ||
      lower.includes("resource_exhausted") ||
      lower.includes("rate limit") ||
      response.status === 429;
    const isAuth =
      lower.includes("api key") ||
      lower.includes("permission_denied") ||
      response.status === 401 ||
      response.status === 403;

    if (isQuota) {
      return NextResponse.json(
        {
          error:
            "The audit demo is briefly throttled. Give it a minute and try again.",
        },
        { status: 429 },
      );
    }
    if (isAuth) {
      return NextResponse.json(
        {
          error:
            "The audit demo is offline for the moment. Email me at rrp0620@gmail.com and I'll run it for you.",
        },
        { status: 503 },
      );
    }

    const debugSuffix = EXPOSE_UPSTREAM_ERRORS
      ? ` — Upstream: ${errText.slice(0, 600)}${firstAttemptError ? ` | First attempt: ${firstAttemptError.slice(0, 300)}` : ""}`
      : "";
    return NextResponse.json(
      {
        error: `The audit service returned an error (status ${response.status}). Try again in a moment.${debugSuffix}`,
      },
      { status: 502 },
    );
  }

  const data = (await response.json()) as GeminiResponse;
  const finalText = getResponseText(data);

  if (!finalText) {
    console.error(
      "audit upstream returned no text",
      JSON.stringify(data).slice(0, 1000),
    );
    return NextResponse.json(
      {
        error: "The audit came back empty. Try rephrasing the workflow.",
      },
      { status: 502 },
    );
  }

  const parsed = extractJson(finalText);
  const normalized = normalizeAuditResult(parsed);

  if (!normalized) {
    console.error(
      "audit JSON parse/normalize failure",
      finalText.slice(0, 1000),
    );
    const debugSuffix = EXPOSE_UPSTREAM_ERRORS
      ? ` — Model output: ${finalText.slice(0, 400)}`
      : "";
    return NextResponse.json(
      {
        error: `The audit came back in a shape I didn't expect. Try rephrasing the workflow.${debugSuffix}`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(normalized);
}
