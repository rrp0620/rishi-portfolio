import {
  clip, extractJson, fetchPage, gemini, hrefs, json, metaContent, noDashes, normalizeUrl, pageText, preflight,
  rateLimit, readJson, signKb, titleOf, upstreamError, verifyKb,
} from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Free AI assistant builder (websageinc.com/tools/ai-assistant.html)
 * POST { action: "build", url }
 *   Reads the homepage plus up to 6 key pages, returns a knowledge base the
 *   server signs, so chat only ever answers from content we read ourselves.
 *   -> { name, site, pages[], starters[], phone, kb, sig }
 * POST { action: "chat", name, site, kb, sig, messages: [{role:"user"|"bot", content}] }
 *   -> { answer, handoff }
 */

export function OPTIONS(request: Request) {
  return preflight(request);
}

const KEY_PAGES = /about|service|menu|price|pricing|rates|contact|faq|question|hours|location|book|appointment|reserv|team|specials|catering|areas|what-we-do|treatments|classes|schedule|policies|shipping|returns/i;
const SKIP = /\.(pdf|jpe?g|png|gif|webp|svg|mp4|zip|docx?|xlsx?)(\?|$)|\/(wp-admin|wp-login|cart|checkout|account|login|signin|privacy|terms|cookie|feed|tag|category|author)\b/i;

function payload(name: string, site: string, kb: string) {
  return `${name}\n${site}\n${kb}`;
}

async function build(request: Request, b: Record<string, unknown>) {
  const start = normalizeUrl(clip(b.url, 400));
  if (!start) return json(request, { error: "Enter your website address, like yourbusiness.com" }, 400);
  if (!rateLimit(request, "asst-build", 10)) {
    return json(request, { error: "You've built a lot of assistants this hour. Try again a bit later." }, 429);
  }
  let home;
  try {
    home = await fetchPage(start, 12_000);
  } catch (e) {
    return json(request, { error: (e as Error).message }, 422);
  }
  if (home.status >= 400) return json(request, { error: `That website answered with an error (${home.status}).` }, 422);

  const base = new URL(home.finalUrl);
  const sameSite = (u: URL) => u.hostname.replace(/^www\./, "") === base.hostname.replace(/^www\./, "");
  const links = hrefs(home.html, home.finalUrl);
  const phone = links.find((l) => l.startsWith("tel:"))?.slice(4).replace(/%20/g, " ") ?? "";
  const email = links.find((l) => l.startsWith("mailto:"))?.slice(7).split("?")[0] ?? "";

  const candidates: string[] = [];
  for (const l of links) {
    try {
      const u = new URL(l);
      u.hash = "";
      u.search = "";
      if (!/^https?:$/.test(u.protocol) || !sameSite(u) || SKIP.test(u.pathname)) continue;
      const s = u.toString();
      if (s === base.toString() || candidates.includes(s)) continue;
      candidates.push(s);
    } catch {
      /* skip */
    }
  }
  candidates.sort((a, b2) => Number(KEY_PAGES.test(b2)) - Number(KEY_PAGES.test(a)));
  const picks = candidates.slice(0, 6);
  const pages = await Promise.all(
    picks.map(async (u) => {
      try {
        const p = await fetchPage(new URL(u), 8_000, 1_500_000);
        return p.status < 400 && sameSite(new URL(p.finalUrl)) ? p : null;
      } catch {
        return null;
      }
    }),
  );

  const title = titleOf(home.html);
  const name = (metaContent(home.html, "og:site_name") || title.split(/\s[|\-–—:]\s/)[0] || base.hostname.replace(/^www\./, "")).trim().slice(0, 80);
  const desc = metaContent(home.html, "description");
  const sections: string[] = [];
  sections.push(`# Home (${home.finalUrl})\n${desc ? `${desc}\n` : ""}${pageText(home.html, 5000)}`);
  if (phone) sections.push(`Phone: ${phone}`);
  if (email) sections.push(`Email: ${email}`);
  const used = [home.finalUrl];
  for (const p of pages) {
    if (!p) continue;
    const t = pageText(p.html, 3500);
    if (t.length < 80) continue;
    used.push(p.finalUrl);
    sections.push(`# ${titleOf(p.html) || new URL(p.finalUrl).pathname} (${p.finalUrl})\n${t}`);
  }
  const kb = sections.join("\n\n").slice(0, 20_000);
  if (kb.replace(/\s/g, "").length < 200) {
    return json(request, {
      error: "We couldn't read enough text on that site. It may be built in a way that hides the text from us. Try another page, like your About or Services page.",
    }, 422);
  }

  const s = await gemini({
    system: "You help set up a customer support assistant for a business website. Output JSON only.",
    json: true,
    temperature: 0.3,
    maxTokens: 800,
    timeoutMs: 20_000,
    contents: [{
      role: "user",
      parts: [{
        text: `From this website content, return {"name":"<the business's real name>","starters":["<3 short questions a real customer would ask that this content can answer>"]}. Questions under 9 words.\n\n${kb.slice(0, 8000)}`,
      }],
    }],
  });
  const meta = s.ok ? extractJson<{ name?: string; starters?: string[] }>(s.text) : null;
  const finalName = noDashes(String(meta?.name || name)).slice(0, 80);
  const starters = (Array.isArray(meta?.starters) ? meta!.starters : [])
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .slice(0, 3)
    .map((x) => noDashes(x).slice(0, 80));
  const site = base.hostname.replace(/^www\./, "");

  return json(request, {
    name: finalName,
    site,
    url: home.finalUrl,
    pages: used,
    starters: starters.length ? starters : ["What do you offer?", "How do I contact you?", "Where are you located?"],
    phone,
    kb,
    sig: signKb(payload(finalName, site, kb)),
  });
}

async function chat(request: Request, b: Record<string, unknown>) {
  const name = clip(b.name, 80);
  const site = clip(b.site, 120);
  const kb = typeof b.kb === "string" ? b.kb.slice(0, 20_000) : "";
  if (!name || !kb || !verifyKb(payload(name, site, kb), String(b.sig ?? ""))) {
    return json(request, { error: "This assistant expired. Build it again to keep chatting." }, 401);
  }
  if (!rateLimit(request, "asst-chat", 80)) {
    return json(request, { error: "That's a lot of questions! Give it a few minutes and try again." }, 429);
  }
  const messages = (Array.isArray(b.messages) ? b.messages : [])
    .filter((m): m is { role: string; content: string } =>
      !!m && typeof m === "object" && ((m as { role?: string }).role === "user" || (m as { role?: string }).role === "bot") &&
      typeof (m as { content?: unknown }).content === "string" && (m as { content: string }).content.trim().length > 0)
    .slice(-12)
    .map((m) => ({ role: (m.role === "bot" ? "model" : "user") as "model" | "user", parts: [{ text: m.content.slice(0, 1200) }] }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return json(request, { error: "Ask a question." }, 400);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  const r = await gemini({
    system: `You are the customer support assistant on the website of ${name} (${site}). Today is ${today}.
Answer using ONLY the website content below. Be warm, quick and specific, like a great front desk person. Plain language.
Rules:
- 1 to 4 sentences, or a short dash list when comparing options.
- Never invent prices, hours, availability, policies or promises. If the content doesn't cover it, say you're not sure and offer to have the team follow up, or point to the phone or contact page if the content lists one.
- You can't make bookings or check live availability. Point to how the site says to book.
- Set "handoff" true when they want a person, want to book or get a quote, have a complaint, or ask something the content can't answer.
- Stay on topic and politely decline unrelated requests. Never use em dashes. No markdown headers.

WEBSITE CONTENT:
${kb}

Output one JSON object: {"answer":"<reply>","handoff":<true|false>}`,
    contents: messages,
    json: true,
    temperature: 0.3,
    maxTokens: 1200,
    timeoutMs: 30_000,
  });
  if (!r.ok) return upstreamError(request, r.status);
  const v = extractJson<{ answer?: string; handoff?: boolean }>(r.text);
  const answer = noDashes(typeof v?.answer === "string" ? v.answer : r.text).trim();
  return json(request, { answer, handoff: v?.handoff === true });
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return json(request, { error: "Bad request." }, 400);
  if (body.action === "build") return build(request, body);
  if (body.action === "chat") return chat(request, body);
  return json(request, { error: "Unknown action." }, 400);
}
