/**
 * Deep website audit for the WebSage Report Card. Every source here is free and
 * needs no key, except Google PageSpeed Insights which works better with one.
 */
import { lookup, resolveMx, resolveTxt } from "node:dns/promises";
import tls from "node:tls";
import { apiKey, decodeEntities, fetchPage, hrefs, metaContent, stripTags, titleOf, type Page } from "@/lib/tools";

export type Status = "pass" | "warn" | "fail" | "skip";
export type Check = { id: string; group: string; label: string; status: Status; detail: string; fix: string; weight: number };

const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 WebSageTools/1.0";

function timeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(fallback); });
  });
}

async function quickFetch(url: string, opts: { method?: string; ms?: number; maxBytes?: number } = {}): Promise<{ status: number; headers: Record<string, string>; text: string; bytes: number } | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.ms ?? 8000);
  try {
    const res = await fetch(url, { method: opts.method ?? "GET", redirect: "follow", signal: ctl.signal, headers: { "user-agent": UA, accept: "*/*" } });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    let text = "", bytes = Number(headers["content-length"] || 0);
    if (opts.method !== "HEAD") {
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = []; let n = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          n += value.byteLength;
          if (n <= (opts.maxBytes ?? 400_000)) chunks.push(value);
          if (n > (opts.maxBytes ?? 400_000) * 3) { await reader.cancel(); break; }
        }
      }
      bytes = n;
      const buf = new Uint8Array(chunks.reduce((a, c) => a + c.byteLength, 0)); let o = 0;
      for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
      text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    }
    return { status: res.status, headers, text, bytes };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/* ---------------- robots.txt and AI crawlers ---------------- */
export const AI_BOTS = [
  { ua: "GPTBot", who: "ChatGPT (training and search)" },
  { ua: "OAI-SearchBot", who: "ChatGPT search" },
  { ua: "ChatGPT-User", who: "ChatGPT browsing" },
  { ua: "ClaudeBot", who: "Claude" },
  { ua: "anthropic-ai", who: "Claude (older)" },
  { ua: "PerplexityBot", who: "Perplexity" },
  { ua: "Google-Extended", who: "Gemini training" },
  { ua: "Applebot-Extended", who: "Apple Intelligence" },
  { ua: "CCBot", who: "Common Crawl (many AI models)" },
  { ua: "Bytespider", who: "TikTok / ByteDance" },
  { ua: "Amazonbot", who: "Alexa" },
  { ua: "meta-externalagent", who: "Meta AI" },
];
export type BotRule = { ua: string; who: string; state: "allowed" | "blocked" | "partial" };

export function parseRobots(txt: string) {
  const groups: { agents: string[]; disallow: string[]; allow: string[] }[] = [];
  let cur: { agents: string[]; disallow: string[]; allow: string[] } | null = null;
  let lastWasAgent = false;
  const sitemaps: string[] = [];
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === "sitemap") { sitemaps.push(val); continue; }
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) { cur = { agents: [], disallow: [], allow: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase()); lastWasAgent = true; continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === "disallow") cur.disallow.push(val);
    if (key === "allow") cur.allow.push(val);
  }
  const stateFor = (ua: string): BotRule["state"] => {
    const u = ua.toLowerCase();
    let g = groups.find((x) => x.agents.some((a) => a === u || u.startsWith(a) || a.startsWith(u)));
    if (!g) g = groups.find((x) => x.agents.includes("*"));
    if (!g) return "allowed";
    if (g.disallow.some((d) => d === "/" ) && !g.allow.some((a) => a === "/")) return "blocked";
    if (g.disallow.some((d) => d.length > 0)) return "partial";
    return "allowed";
  };
  const star = groups.find((x) => x.agents.includes("*"));
  const blocksEverything = !!star && star.disallow.includes("/") && !star.allow.includes("/");
  const googleBlocked = stateFor("Googlebot") === "blocked";
  return { groups, sitemaps, stateFor, blocksEverything, googleBlocked };
}

/* ---------------- DNS / domain / TLS ---------------- */
async function emailSetup(domain: string) {
  const mx = await timeout(resolveMx(domain).then((r) => r.length > 0), 4000, null as boolean | null);
  const txt = await timeout(resolveTxt(domain).then((r) => r.map((x) => x.join(""))), 4000, [] as string[]);
  const spf = txt.find((t) => /^v=spf1/i.test(t)) ?? null;
  const dm = await timeout(resolveTxt(`_dmarc.${domain}`).then((r) => r.map((x) => x.join(""))), 4000, [] as string[]);
  const dmarc = dm.find((t) => /^v=DMARC1/i.test(t)) ?? null;
  return { mx, spf: !!spf, spfSoft: !!spf && /\+all/.test(spf), dmarc: !!dmarc, dmarcPolicy: dmarc?.match(/p=(\w+)/i)?.[1]?.toLowerCase() ?? null };
}

async function rdap(domain: string) {
  // Registrable domain: last two labels (good enough for .com/.net/.org; co.uk style gets 3)
  const parts = domain.split(".");
  const two = parts.slice(-2).join(".");
  const reg = /\.(co|com|org|net|gov|ac)\.[a-z]{2}$/.test(domain) ? parts.slice(-3).join(".") : two;
  const r = await quickFetch(`https://rdap.org/domain/${reg}`, { ms: 6000, maxBytes: 200_000 });
  if (!r || r.status !== 200) return null;
  try {
    const j = JSON.parse(r.text) as { events?: { eventAction: string; eventDate: string }[]; entities?: { roles?: string[]; vcardArray?: unknown[] }[] };
    const ev = (a: string) => j.events?.find((e) => e.eventAction === a)?.eventDate ?? null;
    let registrar: string | null = null;
    const ent = j.entities?.find((e) => e.roles?.includes("registrar"));
    const vc = ent?.vcardArray?.[1] as unknown[] | undefined;
    if (Array.isArray(vc)) { const fn = vc.find((x) => Array.isArray(x) && x[0] === "fn") as unknown[] | undefined; if (fn) registrar = String(fn[3]); }
    return { domain: reg, registered: ev("registration"), expires: ev("expiration"), registrar };
  } catch { return null; }
}

function sslInfo(host: string): Promise<{ validTo: string; days: number; issuer: string } | null> {
  return new Promise((resolve) => {
    const done = (v: { validTo: string; days: number; issuer: string } | null) => { clearTimeout(t); resolve(v); };
    const t = setTimeout(() => { try { s.destroy(); } catch { /* */ } done(null); }, 5000);
    const s = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false }, () => {
      const c = s.getPeerCertificate();
      const validTo = c?.valid_to ? new Date(c.valid_to) : null;
      const issuer = c?.issuer?.O ? String(c.issuer.O) : "";
      s.end();
      done(validTo ? { validTo: validTo.toISOString(), days: Math.round((validTo.getTime() - Date.now()) / 86_400_000), issuer } : null);
    });
    s.on("error", () => done(null));
  });
}

/* ---------------- Lighthouse via PageSpeed Insights ---------------- */
export type Lighthouse = {
  scores: { performance: number | null; seo: number | null; accessibility: number | null; best: number | null };
  metrics: { lcp: string; cls: string; tbt: string; fcp: string; si: string };
  audits: { category: string; title: string; display: string; score: number | null; id: string }[];
  total: number;
  passed: number;
  screenshot: string;
};
export async function lighthouse(url: string): Promise<Lighthouse | null> {
  const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const q = new URLSearchParams({ url, strategy: "mobile" });
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) q.append("category", c);
  const attempt = async (withKey: boolean) => {
    const p = new URLSearchParams(q);
    const key = process.env.PAGESPEED_API_KEY ?? apiKey();
    if (withKey && key) p.set("key", key);
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 50_000);
    try {
      const r = await fetch(`${base}?${p}`, { signal: ctl.signal });
      if (!r.ok) { console.error("psi", withKey ? "key" : "nokey", r.status); return { status: r.status, data: null }; }
      return { status: 200, data: (await r.json()) as Record<string, unknown> };
    } catch { return { status: 504, data: null }; } finally { clearTimeout(t); }
  };
  let r = await attempt(true);
  if (!r.data && r.status !== 504) r = await attempt(false);
  const lh = (r.data?.lighthouseResult ?? null) as {
    categories?: Record<string, { score?: number | null; title?: string; auditRefs?: { id: string; weight: number; group?: string }[] }>;
    audits?: Record<string, { id: string; title: string; score: number | null; scoreDisplayMode: string; displayValue?: string; details?: { data?: string } }>;
  } | null;
  if (!lh?.categories || !lh.audits) return null;
  const pct = (k: string) => { const s = lh.categories?.[k]?.score; return typeof s === "number" ? Math.round(s * 100) : null; };
  const catName: Record<string, string> = { performance: "Speed", seo: "Google", accessibility: "Accessibility", "best-practices": "Best practices" };
  const audits: Lighthouse["audits"] = [];
  let total = 0, passed = 0;
  const seen = new Set<string>();
  for (const [ck, cat] of Object.entries(lh.categories)) {
    for (const ref of cat.auditRefs ?? []) {
      const a = lh.audits[ref.id];
      if (!a || seen.has(ref.id)) continue;
      if (!["numeric", "binary", "metricSavings"].includes(a.scoreDisplayMode) || typeof a.score !== "number") continue;
      seen.add(ref.id); total++;
      if (a.score >= 0.9) { passed++; continue; }
      audits.push({ category: catName[ck] ?? ck, title: a.title, display: (a.displayValue ?? "").replace(/ /g, " "), score: Math.round(a.score * 100), id: ref.id });
    }
  }
  audits.sort((x, y) => (x.score ?? 0) - (y.score ?? 0));
  const m = (id: string) => (lh.audits?.[id]?.displayValue ?? "").replace(/ /g, " ");
  const shot = lh.audits["final-screenshot"]?.details?.data ?? "";
  return {
    scores: { performance: pct("performance"), seo: pct("seo"), accessibility: pct("accessibility"), best: pct("best-practices") },
    metrics: { lcp: m("largest-contentful-paint"), cls: m("cumulative-layout-shift"), tbt: m("total-blocking-time"), fcp: m("first-contentful-paint"), si: m("speed-index") },
    audits: audits.slice(0, 60), total, passed,
    screenshot: shot.startsWith("data:image/") && shot.length < 400_000 ? shot : "",
  };
}

/* ---------------- HTML helpers ---------------- */
const LOCAL_TYPES = /LocalBusiness|Restaurant|Store|Dentist|Physician|Plumber|Electrician|HVAC|Roofing|Contractor|AutoRepair|Salon|Spa|Gym|Attorney|LegalService|RealEstate|Bakery|Cafe|BarOrPub|Hotel|MedicalBusiness|HomeAndConstruction|ProfessionalService|Organization|Corporation/i;

function jsonLd(html: string): { blocks: Record<string, unknown>[]; invalid: number } {
  const blocks: Record<string, unknown>[] = []; let invalid = 0;
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") { blocks.push(v as Record<string, unknown>); const g = (v as Record<string, unknown>)["@graph"]; if (g) walk(g); }
      };
      walk(JSON.parse(m[1].trim()));
    } catch { invalid++; }
  }
  return { blocks, invalid };
}
const typesOf = (b: Record<string, unknown>) => { const t = b["@type"]; return Array.isArray(t) ? t.map(String) : typeof t === "string" ? [t] : []; };

export type PageInfo = { url: string; status: number; title: string; desc: string; h1: number; words: number; ms: number };

/* ---------------- The audit ---------------- */
export type Audit = {
  site: string; url: string; name: string; score: number; grade: string;
  counts: { pass: number; warn: number; fail: number; skip: number };
  checks: Omit<Check, "weight">[];
  groups: { key: string; score: number; pass: number; total: number }[];
  jsApp: boolean;
  lighthouse: Lighthouse | null;
  bots: BotRule[];
  pages: PageInfo[];
  domain: { domain: string; registered: string | null; expires: string | null; registrar: string | null } | null;
  ssl: { validTo: string; days: number; issuer: string } | null;
  email: { mx: boolean | null; spf: boolean; dmarc: boolean; dmarcPolicy: string | null } | null;
  facts: { label: string; value: string; tone: "good" | "mid" | "bad" | "na" }[];
  screenshot: string | null;
  checkedAt: string;
};

export async function audit(target: URL): Promise<Audit | { error: string; status: number }> {
  const lhPromise = timeout(lighthouse(target.toString()), 52_000, null as Lighthouse | null);
  let page: Page;
  try {
    page = await fetchPage(target);
    if (page.status >= 400 && !target.hostname.startsWith("www.")) {
      const www = new URL(target.toString()); www.hostname = `www.${target.hostname}`;
      const p2 = await fetchPage(www).catch(() => null);
      if (p2 && p2.status < 400) page = p2;
    }
  } catch (e) { return { error: (e as Error).message, status: 422 }; }
  if (page.status >= 400) return { error: `That website answered with an error (${page.status}). Check the address and try again.`, status: 422 };
  if (!/html/i.test(page.contentType) && !/<html|<body/i.test(page.html)) return { error: "That address isn't a web page we can read.", status: 422 };

  const html = page.html, lower = html.toLowerCase();
  const final = new URL(page.finalUrl);
  const host = final.hostname, bare = host.replace(/^www\./, "");
  const origin = final.origin;
  const links = hrefs(html, page.finalUrl);
  const sameSite = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "") === bare; } catch { return false; } };
  const checks: Check[] = [];
  const facts: Audit["facts"] = [];

  const visible = stripTags(html.replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " "));
  const words = visible.split(/\s+/).filter(Boolean).length;
  const scripts = (html.match(/<script\b[^>]*src=/gi) || []).length;
  const jsApp = words < 120 && (scripts > 0 || /id=["'](root|app|__next|__nuxt)["']/i.test(html));
  const SKIPPABLE = new Set(["tel", "contact", "reviews", "social", "fresh", "alt", "h1", "share", "icon", "words", "headings", "ratio", "map", "hours", "nap", "privacy", "booking", "analytics", "lazy", "imgsize", "imgfmt"]);
  const add = (c: Omit<Check, "weight"> & { weight?: number }) => {
    const w = c.weight ?? 3;
    if (jsApp && SKIPPABLE.has(c.id) && c.status !== "pass") {
      checks.push({ ...c, weight: w, status: "skip", detail: "Your site fills this in with JavaScript after loading, so we couldn't check it from outside.", fix: "" });
    } else checks.push({ ...c, weight: w });
  };

  // ---- run the network checks in parallel ----
  const internal = Array.from(new Set(links.filter((l) => /^https?:/.test(l) && sameSite(l) && !/\.(pdf|jpe?g|png|gif|webp|svg|mp4|zip|docx?)(\?|$)/i.test(l)).map((l) => l.split("#")[0]))).filter((l) => l !== page.finalUrl && l !== page.finalUrl.replace(/\/$/, ""));
  const KEY = /about|service|menu|price|pricing|contact|faq|hours|location|book|appointment|team|areas|treatment|product|gallery|review/i;
  internal.sort((a, b) => Number(KEY.test(b)) - Number(KEY.test(a)));
  const crawlList = internal.slice(0, 8);
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgSrcs = Array.from(new Set(imgs.map((t) => t.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]).filter((x): x is string => !!x && !x.startsWith("data:")).map((x) => { try { return new URL(decodeEntities(x), page.finalUrl).toString(); } catch { return ""; } }).filter(Boolean))).slice(0, 12);
  const external = links.filter((l) => /^https?:/.test(l) && !sameSite(l));

  const [robotsR, sitemapR, llmsR, notFoundR, httpR, altHostR, emailR, domainR, sslR, pageRs, imgRs] = await Promise.all([
    quickFetch(`${origin}/robots.txt`, { ms: 6000, maxBytes: 100_000 }),
    quickFetch(`${origin}/sitemap.xml`, { ms: 6000, maxBytes: 300_000 }),
    quickFetch(`${origin}/llms.txt`, { ms: 5000, maxBytes: 50_000 }),
    quickFetch(`${origin}/websage-404-check-${Date.now()}`, { ms: 6000, maxBytes: 20_000 }),
    (async () => { try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 6000); const r = await fetch(`http://${host}/`, { redirect: "manual", signal: c.signal, headers: { "user-agent": UA } }); clearTimeout(t); return { status: r.status, location: r.headers.get("location") ?? "" }; } catch { return null; } })(),
    (async () => { const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`; try { if (!(await lookup(alt).catch(() => null))) return { alt, status: 0, location: "" }; const c = new AbortController(); const t = setTimeout(() => c.abort(), 6000); const r = await fetch(`https://${alt}/`, { redirect: "manual", signal: c.signal, headers: { "user-agent": UA } }); clearTimeout(t); return { alt, status: r.status, location: r.headers.get("location") ?? "" }; } catch { return { alt, status: 0, location: "" }; } })(),
    timeout(emailSetup(bare), 9000, null),
    timeout(rdap(bare), 8000, null),
    sslInfo(host),
    Promise.all(crawlList.map((u) => quickFetch(u, { ms: 9000, maxBytes: 600_000 }).then((r) => ({ url: u, r })))),
    Promise.all(imgSrcs.map((u) => quickFetch(u, { method: "HEAD", ms: 5000 }).then((r) => ({ url: u, r })))),
  ]);

  /* ===== Phones ===== */
  const viewport = /<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html);
  add({ id: "mobile", group: "Phones", label: "Built for phones", weight: 12, status: viewport ? "pass" : "fail",
    detail: viewport ? "Your site is set up to fit phone screens." : "Your site isn't set up for phones, so it shows tiny and zoomed out. Most visitors are on a phone.",
    fix: "Use a mobile friendly (responsive) design. This is usually a rebuild, not a tweak." });
  const tel = links.some((l) => l.startsWith("tel:"));
  add({ id: "tel", group: "Phones", label: "Tap to call", weight: 10, status: tel ? "pass" : "fail",
    detail: tel ? "Your phone number is tappable, so people can call in one tap." : "Your phone number isn't tappable. On a phone, people have to copy it by hand, and many won't.",
    fix: "Link your phone number with tel: so it dials in one tap. Put it at the top of the page." });
  const fontSmall = /font-size\s*:\s*(\d+(\.\d+)?)px/gi;
  let tiny = 0; for (const m of html.matchAll(fontSmall)) if (Number(m[1]) < 12) tiny++;
  add({ id: "tinytext", group: "Phones", label: "Readable text size", weight: 2, status: tiny > 5 ? "warn" : "pass",
    detail: tiny > 5 ? `We found ${tiny} places with text under 12px. That's hard to read on a phone.` : "No tiny text found in the page code.",
    fix: "Keep body text at 16px or larger on phones." });
  const appleIcon = /<link\b[^>]*rel\s*=\s*["']apple-touch-icon/i.test(html);
  add({ id: "touchicon", group: "Phones", label: "Home screen icon", weight: 1, status: appleIcon ? "pass" : "warn",
    detail: appleIcon ? "Your site has an icon for when someone saves it to their phone's home screen." : "No home screen icon. If someone saves your site to their phone it shows a blank tile.",
    fix: "Add a 180x180 apple-touch-icon with your logo." });

  /* ===== Getting customers ===== */
  const form = /<form\b/i.test(html);
  const mail = links.some((l) => l.startsWith("mailto:"));
  const booking = links.some((l) => /calendly|acuityscheduling|squareup\.com\/appointments|square\.site|booksy|vagaro|setmore|schedulicity|opentable|resy|toasttab|housecallpro|jobber|servicetitan|book|schedule|appointment|reserv/i.test(l));
  add({ id: "contact", group: "Getting customers", label: "Easy way to reach you online", weight: 10, status: form || booking ? "pass" : mail ? "warn" : "fail",
    detail: form || booking ? `People can ${booking ? "book or request" : "send a message"} right from your homepage.` : mail ? "There's an email link, but no form or booking button. Many people won't open their email app." : "We couldn't find a form, booking button or email link on your homepage. People who don't want to call have no way in.",
    fix: "Add a short contact form or a Book Now button near the top of the homepage." });
  add({ id: "booking", group: "Getting customers", label: "Online booking or quote request", weight: 4, status: booking ? "pass" : "warn",
    detail: booking ? "Visitors can book or request service without calling." : "No booking or quote button found. People who browse after hours can't take the next step.",
    fix: "Add a Book Now or Get a Quote button that works 24/7 (a form or a scheduling link)." });
  const reviews = links.some((l) => /g\.page|maps\.app\.goo\.gl|google\.[a-z.]+\/maps|maps\.google|search\.google\.com\/local|yelp\.com\/biz/i.test(l)) || /elfsight|trustindex|birdeye|podium|reviews?\s+widget|"aggregaterating"/i.test(lower);
  add({ id: "reviews", group: "Getting customers", label: "Shows off your reviews", weight: 6, status: reviews ? "pass" : "warn",
    detail: reviews ? "Your site links to your reviews or map listing." : "We didn't see your Google reviews or map listing on the homepage. Reviews are the first thing new customers check.",
    fix: "Add your best Google reviews to the homepage with a link to your Google listing." });
  const cta = /<(a|button)\b[^>]*>(?:[^<]|<(?!\/))*?(call|book|get a quote|free quote|schedule|contact|order|request|get started|estimate)/i.test(html);
  add({ id: "cta", group: "Getting customers", label: "Clear next step (call to action)", weight: 5, status: cta ? "pass" : "warn",
    detail: cta ? "There's a clear button telling people what to do next." : "We couldn't find a button like Call, Book or Get a Quote. Visitors shouldn't have to guess.",
    fix: "Put one clear button in the top section: Call now, Book online or Get a quote." });
  const social = links.filter((l) => /facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|youtube\.com|x\.com|twitter\.com|nextdoor\.com/i.test(l));
  add({ id: "social", group: "Getting customers", label: "Linked to your social pages", weight: 3, status: social.length ? "pass" : "warn",
    detail: social.length ? "Your social pages are linked, so people can see you're active." : "No links to your social pages. People like to check you're real and active.",
    fix: "Link your Facebook, Instagram or other active pages in the footer." });
  const analytics = /gtag\(|googletagmanager|google-analytics|fbq\(|clarity\(|plausible|fathom|hotjar/i.test(html);
  add({ id: "analytics", group: "Getting customers", label: "Visitor tracking installed", weight: 2, status: analytics ? "pass" : "warn",
    detail: analytics ? "You can see how many people visit and what they do." : "No analytics found. You can't tell how many people visit or where they come from.",
    fix: "Install Google Analytics (free) or a simple alternative like Plausible." });

  /* ===== Google ===== */
  const title = titleOf(html);
  add({ id: "title", group: "Google", label: "Page title Google shows", weight: 8, status: title.length >= 15 && title.length <= 70 ? "pass" : title ? "warn" : "fail",
    detail: !title ? "Your homepage has no title. Google has to guess what to show in search." : title.length < 15 ? `Your title is very short: "${title}". It should say what you do and where.` : title.length > 70 ? `Your title is long and gets cut off in Google: "${title.slice(0, 70)}..."` : `Google shows: "${title}"`,
    fix: "Write a title like \"Business Name | What you do in Your Town\" in under 60 characters." });
  const desc = metaContent(html, "description");
  add({ id: "desc", group: "Google", label: "Search description", weight: 6, status: desc.length >= 50 && desc.length <= 170 ? "pass" : desc ? "warn" : "fail",
    detail: !desc ? "No search description, so Google pulls random text from your page." : desc.length < 50 ? "Your search description is too short to sell the click." : desc.length > 170 ? "Your search description is long and gets cut off." : `Google may show: "${desc}"`,
    fix: "Write one or two sentences (about 150 characters) that say what you do, where, and why to pick you." });
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])).filter(Boolean);
  add({ id: "h1", group: "Google", label: "Clear main headline", weight: 5, status: h1s.length === 1 ? "pass" : h1s.length > 1 ? "warn" : "fail",
    detail: h1s.length === 1 ? `Main headline: "${h1s[0].slice(0, 90)}"` : h1s.length > 1 ? `Your page has ${h1s.length} main headlines. One clear headline works better.` : "Your homepage has no main headline. Visitors and Google can't tell right away what you do.",
    fix: "Use one headline at the top that says what you do and who it's for." });
  const canon = html.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i)?.[1] ?? html.match(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["']/i)?.[1] ?? "";
  add({ id: "canonical", group: "Google", label: "Tells Google the main address", weight: 3, status: canon ? "pass" : "warn",
    detail: canon ? "Your page says which address is the real one, so Google doesn't split credit between copies." : "No canonical tag. If your site answers on several addresses (www, http, trailing slash), Google may see duplicates.",
    fix: "Add a canonical link tag pointing to the main address of each page." });
  const robotsMeta = metaContent(html, "robots");
  add({ id: "noindex", group: "Google", label: "Allowed in search results", weight: 12, status: /noindex/i.test(robotsMeta) ? "fail" : "pass",
    detail: /noindex/i.test(robotsMeta) ? "Your homepage tells Google NOT to list it. You won't show up in search at all." : "Your homepage allows Google to list it.",
    fix: "Remove the noindex tag from pages you want people to find." });
  const rb = robotsR && robotsR.status === 200 ? parseRobots(robotsR.text) : null;
  add({ id: "robots", group: "Google", label: "robots.txt in place", weight: 3, status: rb ? (rb.blocksEverything || rb.googleBlocked ? "fail" : "pass") : "warn",
    detail: rb ? (rb.blocksEverything ? "Your robots.txt blocks every crawler from the whole site. Google can't read it." : rb.googleBlocked ? "Your robots.txt blocks Google specifically." : "Your robots.txt lets search engines in.") : "No robots.txt found. Not fatal, but it's where you tell Google where your sitemap is.",
    fix: rb && (rb.blocksEverything || rb.googleBlocked) ? "Remove the Disallow: / line for Googlebot and * in robots.txt." : "Add a simple robots.txt with a Sitemap: line." });
  const smOk = sitemapR && sitemapR.status === 200 && /<urlset|<sitemapindex/i.test(sitemapR.text);
  const smCount = smOk ? (sitemapR!.text.match(/<loc>/gi) || []).length : 0;
  add({ id: "sitemap", group: "Google", label: "Sitemap for Google", weight: 4, status: smOk ? "pass" : "warn",
    detail: smOk ? `Your sitemap lists ${smCount} address${smCount === 1 ? "" : "es"}, so Google can find every page.` : "No sitemap.xml found. Google has to discover your pages by clicking around.",
    fix: "Publish a sitemap.xml (most website builders do this automatically) and list it in robots.txt." });
  const { blocks, invalid } = jsonLd(html);
  const types = blocks.flatMap(typesOf);
  const local = blocks.find((b) => typesOf(b).some((t) => LOCAL_TYPES.test(t)));
  add({ id: "schema", group: "Google", label: "Business details Google can read", weight: 6, status: local ? "pass" : "fail",
    detail: local ? `Your site tells Google and AI tools your business type (${typesOf(local).join(", ")}) in a format they read directly.` : "Your site doesn't include business details in the format Google and AI assistants read directly (called schema). It's invisible to visitors but helps you show up.",
    fix: "Add LocalBusiness schema with your name, address, phone, hours and service area." });
  if (local) {
    const has = (k: string) => local[k] != null && local[k] !== "";
    const missing = ["name", "address", "telephone", "openingHours", "url"].filter((k) => !(has(k) || (k === "openingHours" && has("openingHoursSpecification"))));
    add({ id: "schemafields", group: "Local", label: "Business details are complete", weight: 4, status: missing.length === 0 ? "pass" : missing.length <= 2 ? "warn" : "fail",
      detail: missing.length === 0 ? "Name, address, phone, hours and website are all there." : `Missing from your business details: ${missing.join(", ")}.`,
      fix: "Fill in every field: name, address, telephone, openingHours, url, and a geo location." });
  }
  add({ id: "jsonld", group: "Google", label: "Structured data is valid", weight: 2, status: invalid ? "warn" : "pass",
    detail: invalid ? `${invalid} block${invalid === 1 ? "" : "s"} of structured data won't parse, so Google ignores it.` : blocks.length ? `${blocks.length} block${blocks.length === 1 ? "" : "s"} of structured data parse cleanly (${Array.from(new Set(types)).slice(0, 5).join(", ")}).` : "No structured data to validate.",
    fix: "Run the JSON-LD through Google's Rich Results Test and fix the errors." });
  const lang = /<html\b[^>]*\blang\s*=/i.test(html);
  add({ id: "lang", group: "Google", label: "Language declared", weight: 1, status: lang ? "pass" : "warn",
    detail: lang ? "Your page says what language it's in." : "Your page doesn't say what language it's in. Small thing for search and screen readers.",
    fix: 'Add lang="en" to the html tag.' });
  const ogImage = metaContent(html, "og:image"), ogTitle = metaContent(html, "og:title");
  add({ id: "share", group: "Google", label: "Looks good when shared", weight: 3, status: ogImage && ogTitle ? "pass" : ogImage || ogTitle ? "warn" : "fail",
    detail: ogImage && ogTitle ? "When someone texts or posts your link, it shows a title and picture." : "When someone texts or posts your link, it shows up plain or with no picture.",
    fix: "Add share tags (og:title, og:description, og:image) with a good photo." });
  const icon = /<link\b[^>]*rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(html);
  add({ id: "icon", group: "Trust", label: "Site icon in the browser tab", weight: 2, status: icon ? "pass" : "warn",
    detail: icon ? "Your logo shows in the browser tab." : "No site icon, so the browser tab shows a blank page symbol.",
    fix: "Add a small square version of your logo as the site icon." });

  /* ===== Content ===== */
  add({ id: "words", group: "Content", label: "Enough words for Google to work with", weight: 4, status: words >= 300 ? "pass" : words >= 120 ? "warn" : "fail",
    detail: `Your homepage has about ${words} words.${words < 300 ? " Google and AI tools need real text to understand what you do and where." : ""}`,
    fix: "Add a short section that says your services, your area and why you, in plain words. 300 words is a good floor." });
  const hs = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  let skips = 0; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) skips++;
  add({ id: "headings", group: "Content", label: "Headings in order", weight: 2, status: hs.length === 0 ? "warn" : skips ? "warn" : "pass",
    detail: hs.length === 0 ? "No headings found. Headings break the page into sections people and Google can scan." : skips ? `${skips} place${skips === 1 ? "" : "s"} where headings skip a level (like H1 straight to H3).` : `${hs.length} headings in a clean order.`,
    fix: "Use H1 for the main headline, H2 for sections, H3 under those. Don't skip levels." });
  const ratio = page.bytes ? Math.round((visible.length / page.bytes) * 100) : 0;
  add({ id: "ratio", group: "Content", label: "Text vs code balance", weight: 1, status: ratio >= 10 ? "pass" : ratio >= 4 ? "warn" : "fail",
    detail: `About ${ratio}% of your page is readable text, the rest is code.${ratio < 10 ? " Heavy code with little text is slower and harder for Google to read." : ""}`,
    fix: "Trim unused scripts and page builder bloat, and add real text." });
  const year = new Date().getFullYear();
  const years = [...visible.matchAll(/(?:©|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1]));
  const latest = years.length ? Math.max(...years) : 0;
  add({ id: "fresh", group: "Trust", label: "Looks up to date", weight: 3, status: latest >= year - 1 ? "pass" : "warn",
    detail: latest >= year - 1 ? `Footer shows ${latest}, so the site looks cared for.` : latest ? `Footer still says ${latest}. Visitors notice and wonder if you're still open.` : "We couldn't find a copyright year. Small thing, but it helps the site look current.",
    fix: "Update the footer year (or make it update itself) and refresh anything dated." });
  const privacy = links.some((l) => /privacy/i.test(l));
  add({ id: "privacy", group: "Trust", label: "Privacy policy linked", weight: 2, status: privacy ? "pass" : "warn",
    detail: privacy ? "You link to a privacy policy." : "No privacy policy link. Ad platforms and some states expect one if you collect any info.",
    fix: "Add a simple privacy policy page and link it in the footer." });
  const deprecated = (html.match(/<(font|center|marquee|blink|frame)\b/gi) || []).length;
  add({ id: "deprecated", group: "Content", label: "No outdated code", weight: 1, status: deprecated ? "warn" : "pass",
    detail: deprecated ? `${deprecated} outdated HTML tag${deprecated === 1 ? "" : "s"} (font, center, marquee). A sign the site hasn't been rebuilt in a long time.` : "No outdated HTML tags.",
    fix: "Rebuild with modern HTML and CSS." });

  /* ===== Local ===== */
  const phoneInText = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/.test(visible);
  const addressInText = /\d{1,6}\s+[A-Za-z0-9.' ]{2,40}\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|hwy|highway|pike|ct|court|pl|place)\b/i.test(visible) || /\b[A-Z]{2}\s+\d{5}\b/.test(visible);
  add({ id: "nap", group: "Local", label: "Phone and address on the page", weight: 6, status: phoneInText && addressInText ? "pass" : phoneInText || addressInText ? "warn" : "fail",
    detail: phoneInText && addressInText ? "Your phone number and address are written on the page, where Google and customers can read them." : phoneInText ? "Your phone is on the page but we couldn't find a street address or ZIP." : addressInText ? "Your address is on the page but we couldn't find a phone number." : "No phone number or address found on the homepage. Local search leans on both.",
    fix: "Put your phone, street address and town in the footer of every page, as plain text." });
  const mapEmbed = /google\.com\/maps\/embed|maps\.google\.com\/maps\?.*output=embed|<iframe[^>]+maps/i.test(html);
  add({ id: "map", group: "Local", label: "Map on the site", weight: 2, status: mapEmbed ? "pass" : "warn",
    detail: mapEmbed ? "A map is embedded, so people can find you fast." : "No map found. A map embed helps customers and ties your site to your Google listing.",
    fix: "Embed your Google Maps listing on the contact section." });
  const hours = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s*(-|–|to|through)?\s*(mon|tue|wed|thu|fri|sat|sun)?[a-z]*\.?:?\s*\d{1,2}(:\d{2})?\s*(am|pm)/i.test(visible) || /\b(open|hours)\b[^.]{0,40}\d{1,2}\s*(am|pm)/i.test(visible) || (local != null && (local.openingHours != null || local.openingHoursSpecification != null));
  add({ id: "hours", group: "Local", label: "Hours listed", weight: 3, status: hours ? "pass" : "warn",
    detail: hours ? "Your hours are on the site." : "We couldn't find your hours. It's one of the top things people look for.",
    fix: "List your hours in the footer or contact section, and in your business schema." });

  /* ===== Links ===== */
  const pages: PageInfo[] = pageRs.map(({ url, r }) => ({
    url, status: r ? r.status : 0, title: r ? titleOf(r.text) : "", desc: r ? metaContent(r.text, "description") : "",
    h1: r ? (r.text.match(/<h1\b/gi) || []).length : 0, words: r ? stripTags(r.text.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")).split(/\s+/).filter(Boolean).length : 0, ms: 0,
  }));
  const broken = pages.filter((p) => p.status === 0 || p.status >= 400);
  add({ id: "broken", group: "Links", label: "Internal links work", weight: 6, status: broken.length === 0 ? "pass" : broken.length <= 1 ? "warn" : "fail",
    detail: pages.length ? (broken.length ? `${broken.length} of ${pages.length} links we tested are broken: ${broken.map((b) => new URL(b.url).pathname).slice(0, 3).join(", ")}.` : `All ${pages.length} internal links we tested work.`) : "No internal links to test on the homepage.",
    fix: "Fix or remove the broken links. Dead ends lose visitors and look careless." });
  const titles = pages.filter((p) => p.title).map((p) => p.title);
  const dupTitles = titles.length - new Set(titles).size;
  const dupHome = titles.filter((t) => t === title).length;
  add({ id: "duptitle", group: "Links", label: "Each page has its own title", weight: 3, status: dupTitles + dupHome === 0 ? "pass" : "warn",
    detail: dupTitles + dupHome === 0 ? "Every page we checked has a different title." : `${dupTitles + dupHome} page${dupTitles + dupHome === 1 ? "" : "s"} share the same title. Google sees them as copies.`,
    fix: "Give each page a title that says what that page is about." });
  const noDesc = pages.filter((p) => p.status === 200 && !p.desc).length;
  add({ id: "pagedesc", group: "Links", label: "Inner pages have descriptions", weight: 2, status: pages.length === 0 ? "pass" : noDesc === 0 ? "pass" : noDesc <= 2 ? "warn" : "fail",
    detail: pages.length ? (noDesc ? `${noDesc} of ${pages.length} pages have no search description.` : "Every page we checked has a search description.") : "No inner pages to check.",
    fix: "Write a one-sentence description for each page." });
  const notFound = notFoundR ? notFoundR.status : 0;
  add({ id: "soft404", group: "Links", label: "Missing pages say so", weight: 2, status: notFound === 404 || notFound === 410 ? "pass" : notFound === 0 ? "skip" : "warn",
    detail: notFound === 404 || notFound === 410 ? "A wrong address shows a proper not-found page." : notFound ? `A wrong address returns ${notFound} instead of 404, so Google may index junk pages.` : "Couldn't test.",
    fix: "Make sure missing pages return a real 404 status with a friendly page." });
  const extBlank = [...html.matchAll(/<a\b[^>]*target\s*=\s*["']_blank["'][^>]*>/gi)].filter((m) => !/rel\s*=\s*["'][^"']*(noopener|noreferrer)/i.test(m[0])).length;
  add({ id: "extlinks", group: "Links", label: "Outside links open safely", weight: 1, status: extBlank ? "warn" : "pass",
    detail: extBlank ? `${extBlank} link${extBlank === 1 ? "" : "s"} open in a new tab without rel="noopener". Minor security and speed issue.` : external.length ? `${external.length} outside link${external.length === 1 ? "" : "s"}, all set up safely.` : "No outside links on the homepage.",
    fix: 'Add rel="noopener" to links that open in a new tab.' });
  const emptyAnchors = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].filter((m) => !stripTags(m[1]) && !/aria-label|<img|<svg/i.test(m[0])).length;
  add({ id: "anchors", group: "Links", label: "Links have text", weight: 1, status: emptyAnchors > 2 ? "warn" : "pass",
    detail: emptyAnchors > 2 ? `${emptyAnchors} links have no text or label, so screen readers and Google can't tell where they go.` : "Links have readable text.",
    fix: "Give every link visible text or an aria-label." });

  /* ===== Images ===== */
  const withAlt = imgs.filter((t) => /\balt\s*=\s*["'][^"']{2,}["']/i.test(t)).length;
  const altPct = imgs.length ? Math.round((withAlt / imgs.length) * 100) : 100;
  add({ id: "alt", group: "Images", label: "Photos are described", weight: 3, status: !imgs.length && jsApp ? "warn" : altPct >= 80 ? "pass" : altPct >= 40 ? "warn" : "fail",
    detail: imgs.length ? `${withAlt} of ${imgs.length} images have descriptions (alt text).` : "No images on the homepage to check.",
    fix: "Give each photo a short description of what's in it. Helps Google and people using screen readers." });
  const sized = imgRs.filter(({ r }) => r && r.status === 200);
  const big = sized.filter(({ r }) => Number(r!.headers["content-length"] || 0) > 350_000);
  const totalImg = sized.reduce((a, { r }) => a + Number(r!.headers["content-length"] || 0), 0);
  add({ id: "imgsize", group: "Images", label: "Photos aren't oversized", weight: 5, status: sized.length === 0 ? "pass" : big.length === 0 ? "pass" : big.length <= 2 ? "warn" : "fail",
    detail: sized.length ? (big.length ? `${big.length} of ${sized.length} images we measured are over 350 KB (largest ${Math.round(Math.max(...big.map(({ r }) => Number(r!.headers["content-length"]))) / 1024)} KB). Big photos are the number one reason sites feel slow on a phone.` : `${sized.length} images measured, all a sensible size (${Math.round(totalImg / 1024)} KB total).`) : "No images to measure.",
    fix: "Resize photos to the size they display at and compress them (aim under 200 KB each)." });
  const modern = sized.filter(({ r }) => /webp|avif/i.test(r!.headers["content-type"] || "")).length;
  add({ id: "imgfmt", group: "Images", label: "Modern image formats", weight: 2, status: sized.length === 0 ? "pass" : modern / sized.length >= 0.5 ? "pass" : "warn",
    detail: sized.length ? `${modern} of ${sized.length} images use WebP or AVIF.${modern / sized.length < 0.5 ? " Those formats are 30 to 50% smaller than JPG and PNG." : ""}` : "No images to check.",
    fix: "Export photos as WebP. Most builders and CDNs can do it automatically." });
  const lazy = imgs.filter((t) => /loading\s*=\s*["']lazy["']/i.test(t)).length;
  add({ id: "lazy", group: "Images", label: "Images load as needed", weight: 2, status: imgs.length < 4 ? "pass" : lazy > 0 ? "pass" : "warn",
    detail: imgs.length < 4 ? "Few images, nothing to defer." : lazy ? `${lazy} images load only when scrolled into view.` : `${imgs.length} images all load at once, even the ones far down the page.`,
    fix: 'Add loading="lazy" to images below the first screen.' });
  const noDims = imgs.filter((t) => !/\bwidth\s*=/i.test(t) || !/\bheight\s*=/i.test(t)).length;
  add({ id: "imgdims", group: "Images", label: "Page doesn't jump while loading", weight: 2, status: imgs.length === 0 ? "pass" : noDims / imgs.length > 0.5 ? "warn" : "pass",
    detail: imgs.length ? (noDims / imgs.length > 0.5 ? `${noDims} of ${imgs.length} images have no width and height set, so the page jumps around as they load.` : "Images reserve their space, so the page doesn't jump.") : "No images.",
    fix: "Set width and height on images." });

  /* ===== Security ===== */
  const https = final.protocol === "https:";
  add({ id: "https", group: "Security", label: "Secure connection (the padlock)", weight: 10, status: https ? "pass" : "fail",
    detail: https ? "Your site loads over https, so browsers show it as secure." : "Your site loads without https. Chrome marks it \"Not secure\" and many people leave.",
    fix: "Turn on a free SSL certificate with your host and redirect every page to https." });
  const httpRedirects = httpR && httpR.status >= 300 && httpR.status < 400 && /^https:/i.test(httpR.location);
  add({ id: "httpredirect", group: "Security", label: "http sends people to https", weight: 4, status: !httpR ? "skip" : httpRedirects ? "pass" : https ? "warn" : "fail",
    detail: !httpR ? "Couldn't test." : httpRedirects ? "Typing your address without https still lands on the secure site." : "The plain http version of your site doesn't redirect to https. Some visitors land on the insecure copy.",
    fix: "Add a permanent redirect from http to https on your host." });
  const H = page.headers;
  const hsts = !!H["strict-transport-security"];
  add({ id: "hsts", group: "Security", label: "Browser always uses https (HSTS)", weight: 2, status: hsts ? "pass" : "warn",
    detail: hsts ? "Browsers remember to use https for your site." : "No HSTS header. Browsers won't remember to always use https.",
    fix: "Add the Strict-Transport-Security header (one line on most hosts)." });
  const secHeaders = ["x-content-type-options", "x-frame-options", "content-security-policy", "referrer-policy", "permissions-policy"].filter((h) => H[h]);
  add({ id: "secheaders", group: "Security", label: "Security headers", weight: 2, status: secHeaders.length >= 3 ? "pass" : secHeaders.length >= 1 ? "warn" : "fail",
    detail: `${secHeaders.length} of 5 common security headers are set${secHeaders.length ? ` (${secHeaders.join(", ")})` : ""}.`,
    fix: "Add X-Content-Type-Options, X-Frame-Options and Referrer-Policy headers. Most hosts have a settings file for this." });
  const mixed = https ? (html.match(/\b(src|href)\s*=\s*["']http:\/\//gi) || []).length : 0;
  add({ id: "mixed", group: "Security", label: "No insecure content", weight: 3, status: mixed ? "warn" : "pass",
    detail: mixed ? `${mixed} file${mixed === 1 ? "" : "s"} load over plain http on a secure page. Browsers may block them or drop the padlock.` : "Everything on the page loads securely.",
    fix: "Change http:// links for images, scripts and styles to https://." });
  if (sslR) {
    add({ id: "ssl", group: "Security", label: "SSL certificate is healthy", weight: 4, status: sslR.days > 14 ? "pass" : sslR.days > 0 ? "warn" : "fail",
      detail: sslR.days > 0 ? `Certificate from ${sslR.issuer || "your host"} is valid for ${sslR.days} more days.` : "Your SSL certificate has expired. Visitors get a scary warning page.",
      fix: "Renew the certificate (most hosts auto-renew; check that it's turned on)." });
    facts.push({ label: "SSL expires", value: new Date(sslR.validTo).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), tone: sslR.days > 14 ? "good" : sslR.days > 0 ? "mid" : "bad" });
  }
  const serverLeak = H["x-powered-by"] || "";
  add({ id: "poweredby", group: "Security", label: "Doesn't advertise its software", weight: 1, status: serverLeak ? "warn" : "pass",
    detail: serverLeak ? `Your server announces "${serverLeak.slice(0, 40)}". That tells attackers what to try.` : "Your server doesn't announce its software version.",
    fix: "Turn off the X-Powered-By header." });

  /* ===== Speed (non-Lighthouse) ===== */
  const compressed = /gzip|br|deflate/i.test(H["content-encoding"] || "");
  add({ id: "compress", group: "Speed", label: "Page is compressed", weight: 3, status: compressed ? "pass" : "warn",
    detail: compressed ? `Your page is sent compressed (${H["content-encoding"]}).` : "Your page is sent uncompressed. Compression makes it load 60 to 80% faster.",
    fix: "Turn on gzip or Brotli compression on your host or CDN." });
  const cache = H["cache-control"] || "";
  add({ id: "cache", group: "Speed", label: "Caching set up", weight: 2, status: cache ? "pass" : "warn",
    detail: cache ? "Browsers are told how long to keep your files, so repeat visits are faster." : "No caching instructions. Every visit downloads everything again.",
    fix: "Set Cache-Control headers for images, scripts and styles." });
  add({ id: "ttfb", group: "Speed", label: "Server responds quickly", weight: 3, status: page.ms < 1200 ? "pass" : page.ms < 2500 ? "warn" : "fail",
    detail: `Your server answered in ${(page.ms / 1000).toFixed(1)} seconds${page.redirects ? ` after ${page.redirects} redirect${page.redirects === 1 ? "" : "s"}` : ""}.${page.ms >= 2500 ? " That's slow before anything even shows." : ""}`,
    fix: "Use better hosting or a CDN, and cut redirect chains." });
  const kb = Math.round(page.bytes / 1024);
  add({ id: "htmlsize", group: "Speed", label: "Page code isn't bloated", weight: 2, status: kb < 150 ? "pass" : kb < 400 ? "warn" : "fail",
    detail: `${kb} KB of page code.${kb >= 150 ? " Page builders often add a lot you don't use." : ""}`,
    fix: "Remove unused plugins and sections, and keep inline code small." });
  const blocking = [...html.matchAll(/<script\b[^>]*src=[^>]*>/gi)].filter((m) => !/\b(async|defer|type\s*=\s*["']module)/i.test(m[0]) && html.indexOf(m[0]) < (html.search(/<\/head>/i) === -1 ? html.length : html.search(/<\/head>/i))).length;
  add({ id: "blocking", group: "Speed", label: "Scripts don't block the page", weight: 3, status: blocking === 0 ? "pass" : blocking <= 2 ? "warn" : "fail",
    detail: blocking ? `${blocking} script${blocking === 1 ? "" : "s"} in the head make the browser wait before showing anything.` : "No scripts hold up the first paint.",
    fix: "Add defer to scripts or move them to the end of the page." });
  const dom = (html.match(/<[a-z][a-z0-9-]*\b/gi) || []).length;
  add({ id: "dom", group: "Speed", label: "Page isn't overbuilt", weight: 1, status: dom < 1500 ? "pass" : dom < 3000 ? "warn" : "fail",
    detail: `About ${dom.toLocaleString("en-US")} elements on the page.${dom >= 1500 ? " Very large pages are slow to render on phones." : ""}`,
    fix: "Simplify the layout. Fewer nested boxes and widgets." });
  add({ id: "redirects", group: "Speed", label: "No redirect chain", weight: 1, status: page.redirects <= 1 ? "pass" : "warn",
    detail: page.redirects <= 1 ? "Your address goes straight to the page." : `Your address bounces through ${page.redirects} redirects before loading.`,
    fix: "Point everything at the final address directly." });
  if (altHostR && altHostR.status) {
    const consistent = altHostR.status >= 300 && altHostR.status < 400;
    add({ id: "wwwredirect", group: "Google", label: "www and non-www agree", weight: 2, status: consistent ? "pass" : "warn",
      detail: consistent ? `${altHostR.alt} redirects to your main address.` : `${altHostR.alt} serves a separate copy of the site. Google may split your ranking between the two.`,
      fix: "Redirect one version to the other (301)." });
  }

  /* ===== Email ===== */
  if (emailR) {
    add({ id: "mx", group: "Email", label: "Email set up on your domain", weight: 2, status: emailR.mx ? "pass" : emailR.mx === false ? "warn" : "skip",
      detail: emailR.mx ? `${bare} can receive email (you@${bare}).` : emailR.mx === false ? `No email records for ${bare}. A you@${bare} address looks more professional than a free one.` : "Couldn't check.",
      fix: "Set up Google Workspace or Microsoft 365 on your domain." });
    add({ id: "spf", group: "Email", label: "Email can't be faked (SPF)", weight: 2, status: emailR.spf ? (emailR.spfSoft ? "warn" : "pass") : emailR.mx ? "fail" : "skip",
      detail: emailR.spf ? (emailR.spfSoft ? "You have an SPF record but it allows anyone (+all)." : "SPF is set, so mail providers can tell your real email from fakes.") : "No SPF record. Scammers can send email that looks like it's from you, and your own email is more likely to land in spam.",
      fix: "Add an SPF TXT record from your email provider." });
    add({ id: "dmarc", group: "Email", label: "Email protected (DMARC)", weight: 2, status: emailR.dmarc ? (emailR.dmarcPolicy === "none" ? "warn" : "pass") : emailR.mx ? "warn" : "skip",
      detail: emailR.dmarc ? (emailR.dmarcPolicy === "none" ? "DMARC is set but only monitors (p=none). Fakes still get through." : `DMARC is on (p=${emailR.dmarcPolicy}). Gmail and Outlook trust your email more.`) : "No DMARC record. Since 2024 Gmail and Yahoo filter bulk mail without it.",
      fix: "Add a DMARC TXT record (start with p=quarantine)." });
  }

  /* ===== AI readiness ===== */
  add({ id: "readable", group: "AI readiness", label: "Readable without JavaScript", weight: 8, status: jsApp ? "fail" : "pass",
    detail: jsApp ? `Your site's words only show up after JavaScript runs in a browser. Before that, the page has about ${words} words. Google can usually work it out, but many AI tools like ChatGPT and Perplexity read the page before JavaScript runs, so to them your site is nearly blank.` : "Your page text is in the HTML itself, so AI tools and search crawlers can read it directly.",
    fix: "Have your developer turn on server side rendering or prerendering so the full page is sent right away." });
  const bots: BotRule[] = AI_BOTS.map((b) => ({ ua: b.ua, who: b.who, state: rb ? rb.stateFor(b.ua) : "allowed" }));
  const blockedBots = bots.filter((b) => b.state === "blocked");
  add({ id: "aibots", group: "AI readiness", label: "AI assistants allowed to read your site", weight: 6, status: blockedBots.length === 0 ? "pass" : blockedBots.length <= 2 ? "warn" : "fail",
    detail: blockedBots.length ? `Your robots.txt blocks ${blockedBots.map((b) => b.who).slice(0, 3).join(", ")}${blockedBots.length > 3 ? ` and ${blockedBots.length - 3} more` : ""}. Those assistants can't recommend what they can't read.` : "ChatGPT, Claude, Perplexity and Google's AI can all read your site.",
    fix: "Remove the Disallow rules for AI crawlers in robots.txt, or at least for OAI-SearchBot, PerplexityBot and ClaudeBot." });
  const llms = llmsR && llmsR.status === 200 && llmsR.text.trim().length > 20 && !/<html/i.test(llmsR.text);
  add({ id: "llms", group: "AI readiness", label: "llms.txt summary for AI", weight: 2, status: llms ? "pass" : "warn",
    detail: llms ? "You have an llms.txt file, a plain summary AI tools can read first." : "No llms.txt. It's a new, optional file that gives AI tools a clean summary of your business. Easy win.",
    fix: "Add /llms.txt with your business name, what you do, your area, and links to key pages." });
  add({ id: "aischema", group: "AI readiness", label: "Facts AI can quote (schema)", weight: 3, status: local ? "pass" : "warn",
    detail: local ? "Your business details are in a format AI tools can lift directly (name, type, address, phone)." : "Without business schema, AI tools have to guess your details from the page text.",
    fix: "Add LocalBusiness schema (same fix as the Google check)." });
  const faqSchema = types.some((t) => /FAQPage/i.test(t));
  const faqText = /\bfaq\b|frequently asked|questions\b/i.test(visible);
  add({ id: "faq", group: "AI readiness", label: "Answers common questions", weight: 2, status: faqSchema ? "pass" : faqText ? "warn" : "warn",
    detail: faqSchema ? "You have a FAQ section marked up so AI and Google can pull the answers." : faqText ? "You mention FAQs but without markup AI tools can't pull the answers cleanly." : "No FAQ section. AI assistants love short questions and answers in your own words.",
    fix: "Add 5 to 8 real customer questions with short answers, marked up as FAQPage schema." });

  /* ===== Lighthouse ===== */
  const lh = await lhPromise;
  if (lh) {
    const p = lh.scores.performance;
    if (p != null) add({ id: "speed", group: "Speed", label: "Speed on a phone (Google test)", weight: 12, status: p >= 80 ? "pass" : p >= 50 ? "warn" : "fail",
      detail: `Google scores your site ${p} out of 100 for speed on a phone${lh.metrics.lcp ? `. The main content shows up in ${lh.metrics.lcp}` : ""}.${p < 50 ? " Slow sites lose visitors before the page even shows up." : ""}`,
      fix: "Compress big photos, cut extra plugins and scripts, and use good hosting." });
    const a = lh.scores.accessibility;
    if (a != null) add({ id: "a11y", group: "Trust", label: "Usable by everyone (accessibility)", weight: 4, status: a >= 90 ? "pass" : a >= 70 ? "warn" : "fail",
      detail: `Google scores accessibility ${a} out of 100.${a < 90 ? " Contrast, labels and tap targets are the usual fixes." : ""}`,
      fix: "Fix the accessibility audits listed below. Start with color contrast and form labels." });
    const b = lh.scores.best;
    if (b != null) add({ id: "bestpractices", group: "Security", label: "Modern web practices (Google test)", weight: 3, status: b >= 90 ? "pass" : b >= 70 ? "warn" : "fail",
      detail: `Google scores best practices ${b} out of 100.${b < 90 ? " Usually old libraries, console errors or insecure requests." : ""}`,
      fix: "Work through the best practices audits below." });
    const s = lh.scores.seo;
    if (s != null) add({ id: "lhseo", group: "Google", label: "Google's own SEO check", weight: 4, status: s >= 90 ? "pass" : s >= 70 ? "warn" : "fail",
      detail: `Google scores on-page SEO ${s} out of 100.`,
      fix: "Fix the SEO audits listed below." });
  } else {
    add({ id: "speed", group: "Speed", label: "Speed on a phone (Google test)", weight: 12, status: "skip",
      detail: "Google's speed test didn't answer this time. The other speed checks above still count. Try again in a few minutes for the full score.", fix: "" });
  }

  /* ===== facts ===== */
  if (domainR?.registered) {
    const yrs = (Date.now() - new Date(domainR.registered).getTime()) / (365.25 * 86_400_000);
    facts.push({ label: "Domain age", value: yrs >= 1 ? `${Math.floor(yrs)} year${Math.floor(yrs) === 1 ? "" : "s"}` : `${Math.max(1, Math.round(yrs * 12))} months`, tone: yrs >= 2 ? "good" : yrs >= 1 ? "mid" : "na" });
  }
  if (domainR?.expires) {
    const days = Math.round((new Date(domainR.expires).getTime() - Date.now()) / 86_400_000);
    facts.push({ label: "Domain renews", value: new Date(domainR.expires).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), tone: days > 60 ? "good" : days > 0 ? "mid" : "bad" });
    add({ id: "domainexp", group: "Trust", label: "Domain isn't about to expire", weight: 3, status: days > 60 ? "pass" : days > 0 ? "warn" : "fail",
      detail: days > 60 ? `Your domain is registered until ${new Date(domainR.expires).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.` : days > 0 ? `Your domain expires in ${days} days. If it lapses, your site and email go dark.` : "Your domain registration shows as expired.",
      fix: "Turn on auto-renew with your registrar and renew for multiple years." });
  }
  if (domainR?.registrar) facts.push({ label: "Registrar", value: domainR.registrar.slice(0, 30), tone: "na" });
  facts.push({ label: "Pages checked", value: String(1 + pages.filter((p) => p.status === 200).length), tone: "na" });
  facts.push({ label: "Server response", value: `${(page.ms / 1000).toFixed(1)}s`, tone: page.ms < 1200 ? "good" : page.ms < 2500 ? "mid" : "bad" });
  if (H["server"]) facts.push({ label: "Hosted on", value: String(H["server"]).split("/")[0].slice(0, 24), tone: "na" });
  if (emailR?.mx != null) facts.push({ label: "Email on domain", value: emailR.mx ? "Yes" : "No", tone: emailR.mx ? "good" : "mid" });

  /* ===== score ===== */
  const scored = checks.filter((c) => c.status !== "skip");
  const score = Math.round((scored.reduce((s, c) => s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0) / scored.reduce((s, c) => s + c.weight, 0)) * 100);
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  const order: Record<Status, number> = { fail: 0, warn: 1, pass: 2, skip: 3 };
  checks.sort((a, b) => order[a.status] - order[b.status] || b.weight - a.weight);
  const groupOrder = ["Phones", "Getting customers", "Google", "AI readiness", "Speed", "Local", "Content", "Links", "Images", "Security", "Email", "Trust"];
  const groups = groupOrder.map((g) => {
    const cs = scored.filter((c) => c.group === g);
    if (!cs.length) return null;
    const pts = cs.reduce((a, c) => a + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
    const tot = cs.reduce((a, c) => a + c.weight, 0);
    return { key: g, score: Math.round(pts / tot * 100), pass: cs.filter((c) => c.status === "pass").length, total: cs.length };
  }).filter((g): g is NonNullable<typeof g> => !!g);

  return {
    site: bare, url: page.finalUrl,
    name: (metaContent(html, "og:site_name") || title.split(/\s[|\-–—:]\s/)[0] || "").slice(0, 80),
    score, grade,
    counts: { pass: checks.filter((c) => c.status === "pass").length, warn: checks.filter((c) => c.status === "warn").length, fail: checks.filter((c) => c.status === "fail").length, skip: checks.filter((c) => c.status === "skip").length },
    checks: checks.map((c) => ({ id: c.id, group: c.group, label: c.label, status: c.status, detail: c.detail, fix: c.fix })),
    groups, jsApp, lighthouse: lh, bots, pages, domain: domainR, ssl: sslR,
    email: emailR ? { mx: emailR.mx, spf: emailR.spf, dmarc: emailR.dmarc, dmarcPolicy: emailR.dmarcPolicy } : null,
    facts, screenshot: lh?.screenshot || null, checkedAt: new Date().toISOString(),
  };
}
