import { clip, extractJson, gemini, json, noDashes, preflight, rateLimit, readJson, upstreamError } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/**
 * Writing tools for websageinc.com/tools.
 * POST { kind: "review-reply", business, rating, review, reviewer?, tone? }
 *   -> { replies: [{ label, text }] }
 * POST { kind: "instant-reply", business, trade, town?, message, channel: "email"|"text", phone?, booking? }
 *   -> { subject?, reply, ms }
 */

export function OPTIONS(request: Request) {
  return preflight(request);
}

const STYLE = `Write like a real owner of a business, not like AI. Plain, warm, specific. Short sentences.
Never use em dashes or en dashes. Never use these words: delighted, thrilled, elevate, seamless, journey, valued customer, we strive, rest assured, top-notch.
No hashtags, no emoji.`;

async function reviewReply(request: Request, b: Record<string, unknown>) {
  const business = clip(b.business, 120);
  const review = clip(b.review, 2500);
  const reviewer = clip(b.reviewer, 60);
  const rating = Math.min(5, Math.max(1, Math.round(Number(b.rating) || 0)));
  const tone = ["friendly", "professional", "short"].includes(String(b.tone)) ? String(b.tone) : "friendly";
  if (!business || review.length < 3 || !Number(b.rating)) {
    return json(request, { error: "Add your business name, the star rating and the review." }, 400);
  }
  const r = await gemini({
    system: `You write public replies to Google reviews for a business owner. ${STYLE}
Rules:
- Reply as the business (we/us), signed off naturally. Use the reviewer's first name if given.
- Mention one specific thing from the review so it's clearly not a template.
- 1 to 3 star reviews: thank them, own it without arguing or making excuses, never admit legal fault, never share private details, and invite them to contact the business directly to make it right. Do not offer refunds or discounts.
- 4 to 5 star reviews: thank them, reflect what they liked, invite them back.
- Never invent facts about the business (names, policies, prices, fixes) that are not in the review.
- Keep each reply under ${tone === "short" ? 40 : 90} words.
Output JSON only.`,
    json: true,
    temperature: 0.8,
    maxTokens: 1800,
    contents: [{
      role: "user",
      parts: [{
        text: `Business: ${business}
Stars: ${rating} out of 5
Reviewer name: ${reviewer || "not given"}
Tone: ${tone}
Review:
"""${review}"""

Write 3 different replies. Return {"replies":[{"label":"<2-3 word description of the angle>","text":"<reply>"}]}`,
      }],
    }],
  });
  if (!r.ok) return upstreamError(request, r.status);
  const v = extractJson<{ replies?: { label?: string; text?: string }[] }>(r.text);
  const replies = (v?.replies ?? [])
    .filter((x) => typeof x?.text === "string" && x.text.trim())
    .slice(0, 3)
    .map((x) => ({ label: noDashes(String(x.label ?? "Option")).slice(0, 40), text: noDashes(String(x.text).trim()) }));
  if (!replies.length) return upstreamError(request, 502);
  return json(request, { replies });
}

async function instantReply(request: Request, b: Record<string, unknown>) {
  const business = clip(b.business, 120);
  const trade = clip(b.trade, 80);
  const town = clip(b.town, 80);
  const message = clip(b.message, 1500);
  const phone = clip(b.phone, 40);
  const booking = clip(b.booking, 300);
  const channel = b.channel === "text" ? "text" : "email";
  if (!business || !trade || message.length < 3) {
    return json(request, { error: "Add your business name, what you do, and a customer message." }, 400);
  }
  const t0 = Date.now();
  const r = await gemini({
    system: `You are the instant reply assistant for ${business}, a ${trade}${town ? ` in ${town}` : ""}. A new customer just reached out. Reply right away so they don't go call a competitor. ${STYLE}
Rules:
- Thank them, show you understood exactly what they need, and give the one clear next step.
- Ask at most 2 quick questions that help quote or schedule (like address, timing, photos, party size), only if needed.
- Never invent prices, availability, guarantees or hours. Say the team will confirm details.
${phone ? `- They can call ${phone}.` : ""}
${booking ? `- They can book here: ${booking}` : ""}
- ${channel === "text" ? "This is a text message: under 320 characters, no subject, no sign-off beyond the business name." : "This is an email: a short subject line and a body under 120 words, signed from the team at the business."}
Output JSON only.`,
    json: true,
    temperature: 0.6,
    maxTokens: 1200,
    contents: [{
      role: "user",
      parts: [{ text: `Customer message:\n"""${message}"""\n\nReturn {${channel === "email" ? '"subject":"<subject>",' : ""}"reply":"<the reply>"}` }],
    }],
  });
  if (!r.ok) return upstreamError(request, r.status);
  const v = extractJson<{ subject?: string; reply?: string }>(r.text);
  if (!v?.reply) return upstreamError(request, 502);
  return json(request, {
    channel,
    subject: channel === "email" ? noDashes(String(v.subject ?? `Thanks for reaching out to ${business}`)).slice(0, 120) : null,
    reply: noDashes(String(v.reply).trim()),
    ms: Date.now() - t0,
  });
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return json(request, { error: "Bad request." }, 400);
  if (!rateLimit(request, "write", 30)) {
    return json(request, { error: "You've used this a lot in the last hour. Give it a bit and try again." }, 429);
  }
  if (body.kind === "review-reply") return reviewReply(request, body);
  if (body.kind === "instant-reply") return instantReply(request, body);
  return json(request, { error: "Unknown tool." }, 400);
}
