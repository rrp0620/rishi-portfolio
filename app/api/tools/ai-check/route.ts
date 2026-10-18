import { clip, extractJson, gemini, json, noDashes, preflight, rateLimit, readJson, upstreamError } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * "Does AI recommend you?" (websageinc.com/tools/ai-check.html)
 * POST { business, trade, town } -> asks Google Gemini (with live Google Search)
 * three questions a customer would ask, checks whether the business is named,
 * and tallies share of voice across every business AI mentioned.
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

  const singular = trade.replace(/s$/i, "");
  const questions = [
    `What are the best ${trade} in ${town}? Who would you recommend?`,
    `I need a ${singular} near ${town}. Who has great reviews and is worth calling?`,
    `Who is a reliable, fairly priced ${singular} in ${town} that I can call today?`,
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

  // Visibility score: position-weighted average across questions (1st = 100, each spot down = -12, not named = 0)
  const posScore = (p: number | null) => (p == null ? 0 : Math.max(20, 100 - (p - 1) * 12));
  const score = Math.round(valid.reduce((a, r) => a + posScore(r.position), 0) / valid.length);

  // Share of voice: every business named across all questions, position weighted
  const key = (n: string) => n.toLowerCase().replace(/\b(the|inc|llc|co|corp|company|ltd)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const tally = new Map<string, { name: string; mentions: number; best: number; points: number }>();
  valid.forEach((r) => {
    r.picks.forEach((p, i) => {
      const k = key(p.name);
      if (!k) return;
      const t = tally.get(k) ?? { name: p.name, mentions: 0, best: 99, points: 0 };
      t.mentions++; t.best = Math.min(t.best, i + 1); t.points += posScore(i + 1);
      tally.set(k, t);
    });
  });
  const youKey = key(business);
  const matchKeys = new Set(valid.filter((r) => r.found).map((r) => key(r.picks[r.position! - 1].name)));
  const totalPoints = Array.from(tally.values()).reduce((a, t) => a + t.points, 0) || 1;
  const competitors = Array.from(tally.entries())
    .map(([k, t]) => ({ name: t.name, mentions: t.mentions, best: t.best, share: Math.round((t.points / totalPoints) * 100), you: k === youKey || matchKeys.has(k) }))
    .sort((a, b) => b.share - a.share || a.best - b.best)
    .slice(0, 10);

  return json(request, {
    business,
    trade,
    town,
    verdict,
    found_in: hits,
    asked: valid.length,
    best_position: best,
    score,
    competitors,
    results: valid,
    engine: "Google Gemini with Google Search",
    checkedAt: new Date().toISOString(),
  });
}
