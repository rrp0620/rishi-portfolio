import { clip, extractJson, gemini, json, noDashes, preflight, rateLimit, readJson, upstreamError } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * "Does AI recommend you?" (websageinc.com/tools/ai-check.html)
 * POST { business, trade, town } -> asks Google Gemini (with live Google Search, one call)
 * three questions a customer would ask, checks whether the business is named,
 * and tallies share of voice across every business AI mentioned.
 */

export function OPTIONS(request: Request) {
  return preflight(request);
}

const CHECK_SYSTEM = `You are a helpful AI assistant answering real customers who want a local recommendation. Use Google Search to find real, currently operating businesses. For each question, recommend up to 8 specific businesses by their exact name, best first, each with one short reason. Only include businesses that actually serve the area asked about. Answer each question on its own, as if it were the only one asked. Output JSON only, no markdown.`;

type Pick = { name: string; reason: string };
type Read = { picks: Pick[]; match_index: number; match_name: string };

function clean(v: Partial<Read> | null | undefined): Read | null {
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

// One grounded call answers all three questions and reports the matches (free-tier quota is ~20 requests a day per model).
async function check(questions: string[], business: string) {
  const r = await gemini({
    system: CHECK_SYSTEM,
    search: true,
    temperature: 0.2,
    maxTokens: 6000,
    timeoutMs: 55_000,
    contents: [{
      role: "user",
      parts: [{
        text: `QUESTIONS:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

TARGET BUSINESS: ${business}

Return {"answers":[one object per question, in order: {"picks":[{"name":"<business name>","reason":"<one short reason, max 15 words>"}],"match_index":<0-based index in picks of the target business, or -1>,"match_name":"<name as written, or empty>"}]}.
Treat it as a match if it is clearly the same business even with small differences (Inc, LLC, "The", spacing, abbreviations). Do not match a different business that only shares a common word.`,
      }],
    }],
  });
  const v = r.ok ? extractJson<{ answers?: Partial<Read>[] }>(r.text) : null;
  const reads = questions.map((_, i) => clean(v?.answers?.[i]));
  return { status: r.status, sources: r.sources, reads };
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

  const singular = /ies$/i.test(trade) ? trade.replace(/ies$/i, "y") : /(ss|us)$/i.test(trade) ? trade : /(sh|ch|x|z|s)es$/i.test(trade) ? trade.replace(/es$/i, "") : trade.replace(/s$/i, "");
  const questions = [
    `What are the best ${trade} in ${town}? Who would you recommend?`,
    `I need a ${singular} near ${town}. Who has great reviews and is worth calling?`,
    `Who is a reliable, fairly priced ${singular} in ${town} that I can call today?`,
  ];
  const { status, sources, reads } = await check(questions, business);
  if (status !== 200) return upstreamError(request, status);
  // Normalize a business name for matching: drop addresses and parentheticals, legal suffixes, punctuation
  const tradeWords = new Set([trade, singular].join(" ").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2));
  const key = (n: string) => {
    const base = n.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\d.*$/, " ").replace(/[^a-z0-9]+/g, " ").trim();
    const k = base.split(" ").filter((w) => w && !/^(the|inc|llc|co|corp|company|ltd)$/.test(w) && !tradeWords.has(w)).join(" ");
    return k || base;
  };
  const bizKey = key(business);
  const bizWords = new Set(bizKey.split(" ").filter((w) => w.length > 2));
  const overlaps = (k: string) => k.split(" ").some((w) => w.length > 2 && bizWords.has(w));
  const matchIndex = (r: Read): number => {
    const byName = r.match_name ? r.picks.findIndex((p) => key(p.name) === key(r.match_name)) : -1;
    if (byName >= 0 && overlaps(key(r.picks[byName].name))) return byName;
    const exact = r.picks.findIndex((p) => key(p.name) === bizKey);
    if (exact >= 0) return exact;
    if (r.match_index >= 0 && r.match_index < r.picks.length && overlaps(key(r.picks[r.match_index].name))) return r.match_index;
    return -1;
  };
  const results = questions.map((q, i) => {
    const r = reads[i];
    const idx = r ? matchIndex(r) : -1;
    const found = idx >= 0;
    return {
      question: q,
      ok: !!r,
      found,
      position: found ? idx + 1 : null,
      picks: r?.picks ?? [],
      sources: sources
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

  // Share of voice: every business named across all questions, position weighted, same brand at different addresses merged
  const tally = new Map<string, { name: string; mentions: number; best: number; points: number }>();
  const matchKeys = new Set(valid.filter((r) => r.found).map((r) => key(r.picks[r.position! - 1].name)));
  valid.forEach((r) => {
    const seen = new Set<string>();
    r.picks.forEach((p, i) => {
      const k = key(p.name);
      if (!k || seen.has(k)) return;
      seen.add(k);
      const clean = p.name.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+\d.*$/, "").trim() || p.name;
      const t = tally.get(k) ?? { name: clean, mentions: 0, best: 99, points: 0 };
      t.mentions++; t.best = Math.min(t.best, i + 1); t.points += posScore(i + 1);
      tally.set(k, t);
    });
  });
  const totalPoints = Array.from(tally.values()).reduce((a, t) => a + t.points, 0) || 1;
  const competitors = Array.from(tally.entries())
    .map(([k, t]) => ({ name: t.name, mentions: t.mentions, best: t.best, share: Math.round((t.points / totalPoints) * 100), you: k === bizKey || matchKeys.has(k) }))
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
