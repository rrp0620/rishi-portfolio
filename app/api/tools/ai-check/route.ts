import { clip, extractJson, gemini, json, noDashes, preflight, rateLimit, readJson, upstreamError } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * "Does AI recommend you?" (websageinc.com/tools/ai-check.html)
 * POST { business, trade, town } -> asks Google Gemini (with live Google Search)
 * the questions a customer would ask, then checks whether the business is named.
 */

export function OPTIONS(request: Request) {
  return preflight(request);
}

const ASK_SYSTEM = `You are a helpful AI assistant answering a real customer who wants a local recommendation. Use Google Search to find real, currently operating businesses. Recommend up to 8 specific businesses by their exact name, best first, each with one short reason. Only include businesses that actually serve the area asked about. Plain text, one business per line in the form "1. Name: reason".`;

const READ_SYSTEM = `You read an AI assistant's answer and report which businesses it recommended. Output JSON only.`;

type Pick = { name: string; reason: string };
type Read = { picks: Pick[]; match_index: number; match_name: string };

async function ask(question: string) {
  return gemini({
    system: ASK_SYSTEM,
    contents: [{ role: "user", parts: [{ text: question }] }],
    search: true,
    temperature: 0.2,
    maxTokens: 3000,
    timeoutMs: 45_000,
  });
}

async function read(answer: string, business: string): Promise<Read | null> {
  const r = await gemini({
    system: READ_SYSTEM,
    json: true,
    temperature: 0,
    maxTokens: 1500,
    timeoutMs: 20_000,
    contents: [{
      role: "user",
      parts: [{
        text: `TARGET BUSINESS: ${business}

AI ANSWER:
${answer.slice(0, 6000)}

Return {"picks":[{"name":"<business name as written>","reason":"<the reason given, max 15 words>"}],"match_index":<0-based index in picks of the target business, or -1>,"match_name":"<name as written, or empty>"}.
Treat it as a match if it is clearly the same business even with small differences (Inc, LLC, "The", spacing, abbreviations). Do not match a different business that only shares a common word.`,
      }],
    }],
  });
  if (!r.ok) return null;
  const v = extractJson<Read>(r.text);
  if (!v || !Array.isArray(v.picks)) return null;
  return {
    picks: v.picks
      .filter((p) => p && typeof p.name === "string" && p.name.trim())
      .slice(0, 8)
      .map((p) => ({ name: noDashes(p.name.trim()).slice(0, 90), reason: noDashes(String(p.reason ?? "")).slice(0, 140) })),
    match_index: typeof v.match_index === "number" ? v.match_index : -1,
    match_name: typeof v.match_name === "string" ? v.match_name : "",
  };
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const business = clip(body?.business, 120);
  const trade = clip(body?.trade, 80);
  const town = clip(body?.town, 80);
  if (!business || !trade || !town) {
    return json(request, { error: "Fill in your business name, what you do, and your town." }, 400);
  }
  if (!rateLimit(request, "aicheck", 10)) {
    return json(request, { error: "You've run a lot of checks. Give it an hour and try again." }, 429);
  }

  const questions = [
    `What are the best ${trade} in ${town}? Who would you recommend?`,
    `I need a ${trade.replace(/s$/i, "")} near ${town}. Who has great reviews and is worth calling?`,
  ];
  const answers = await Promise.all(questions.map(ask));
  if (answers.every((a) => !a.ok)) return upstreamError(request, answers[0].status);

  const reads = await Promise.all(answers.map((a) => (a.ok ? read(a.text, business) : Promise.resolve(null))));
  const results = questions.map((q, i) => {
    const r = reads[i];
    const found = r ? r.match_index >= 0 && r.match_index < r.picks.length : false;
    return {
      question: q,
      ok: !!r,
      found,
      position: found ? r!.match_index + 1 : null,
      picks: r?.picks ?? [],
      sources: answers[i].sources
        .filter((s, j, all) => all.findIndex((x) => x.title === s.title) === j)
        .slice(0, 6),
    };
  });

  const valid = results.filter((r) => r.ok);
  if (!valid.length) return upstreamError(request, 502);
  const hits = valid.filter((r) => r.found).length;
  const best = valid.filter((r) => r.found).map((r) => r.position!).sort((a, b) => a - b)[0] ?? null;
  const verdict = hits === valid.length ? (best && best <= 3 ? "strong" : "listed") : hits > 0 ? "sometimes" : "missing";

  return json(request, {
    business,
    trade,
    town,
    verdict,
    found_in: hits,
    asked: valid.length,
    best_position: best,
    results: valid,
    engine: "Google Gemini with Google Search",
    checkedAt: new Date().toISOString(),
  });
}
