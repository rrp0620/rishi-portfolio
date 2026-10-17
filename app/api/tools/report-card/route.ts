import {
  apiKey, clip, fetchPage, hrefs, json, metaContent, normalizeUrl, preflight, rateLimit, readJson, stripTags, titleOf,
} from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Website Report Card (websageinc.com/tools/website-report-card.html)
 * POST { url } -> { grade, score, site, checks[], speed?, screenshot? }
 * Reads the live homepage and runs Google PageSpeed Insights (mobile) in parallel.
 */

type Status = "pass" | "warn" | "fail" | "skip";
type Check = { id: string; group: string; label: string; status: Status; detail: string; fix: string; weight: number };

export function OPTIONS(request: Request) {
  return preflight(request);
}

type Psi = { performance: number | null; seo: number | null; accessibility: number | null; lcp: string; screenshot: string };

async function pageSpeed(url: string): Promise<Psi | null> {
  const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const q = new URLSearchParams({ url, strategy: "mobile" });
  for (const c of ["performance", "seo", "accessibility"]) q.append("category", c);
  const attempt = async (withKey: boolean) => {
    const p = new URLSearchParams(q);
    const key = process.env.PAGESPEED_API_KEY ?? apiKey(); // a key with the PageSpeed Insights API allowed
    if (withKey && key) p.set("key", key);
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 48_000);
    try {
      const r = await fetch(`${base}?${p}`, { signal: ctl.signal });
      if (!r.ok) {
        console.error("psi", withKey ? "key" : "nokey", r.status, (await r.text().catch(() => "")).slice(0, 300));
        return { status: r.status, data: null };
      }
      return { status: 200, data: (await r.json()) as Record<string, unknown> };
    } catch {
      return { status: 504, data: null };
    } finally {
      clearTimeout(t);
    }
  };
  let r = await attempt(true);
  if (!r.data && r.status !== 504) r = await attempt(false);
  const lh = (r.data?.lighthouseResult ?? null) as
    | { categories?: Record<string, { score?: number | null }>; audits?: Record<string, { displayValue?: string; details?: { data?: string } }> }
    | null;
  if (!lh) return null;
  const pct = (k: string) => {
    const s = lh.categories?.[k]?.score;
    return typeof s === "number" ? Math.round(s * 100) : null;
  };
  const shot = lh.audits?.["final-screenshot"]?.details?.data ?? "";
  return {
    performance: pct("performance"),
    seo: pct("seo"),
    accessibility: pct("accessibility"),
    lcp: lh.audits?.["largest-contentful-paint"]?.displayValue ?? "",
    screenshot: shot.startsWith("data:image/") && shot.length < 400_000 ? shot : "",
  };
}

function jsonLdTypes(html: string): string[] {
  const types: string[] = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          const t = o["@type"];
          if (typeof t === "string") types.push(t);
          if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.push(x));
          if (o["@graph"]) walk(o["@graph"]);
        }
      };
      walk(JSON.parse(m[1].trim()));
    } catch {
      /* invalid block */
    }
  }
  return types;
}

const LOCAL_TYPES = /LocalBusiness|Restaurant|Store|Dentist|Physician|Plumber|Electrician|HVAC|Roofing|Contractor|AutoRepair|Salon|Spa|Gym|Attorney|LegalService|RealEstate|Bakery|Cafe|BarOrPub|Hotel|MedicalBusiness|HomeAndConstruction|ProfessionalService|Organization|Corporation/i;

function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const target = normalizeUrl(clip(body?.url, 400));
  if (!target) return json(request, { error: "Enter your website address, like yourbusiness.com" }, 400);
  if (!rateLimit(request, "report", 15)) {
    return json(request, { error: "You've run a lot of reports. Give it an hour and try again." }, 429);
  }

  const psiPromise = pageSpeed(target.toString());
  let page;
  try {
    page = await fetchPage(target);
    if (page.status >= 400 && target.protocol === "https:") {
      // some sites only answer on www
      if (!target.hostname.startsWith("www.")) {
        const www = new URL(target.toString());
        www.hostname = `www.${target.hostname}`;
        const p2 = await fetchPage(www).catch(() => null);
        if (p2 && p2.status < 400) page = p2;
      }
    }
  } catch (e) {
    return json(request, { error: (e as Error).message }, 422);
  }
  if (page.status >= 400) {
    return json(request, { error: `That website answered with an error (${page.status}). Check the address and try again.` }, 422);
  }
  if (!/html/i.test(page.contentType) && !/<html|<body/i.test(page.html)) {
    return json(request, { error: "That address isn't a web page we can read." }, 422);
  }

  const html = page.html;
  const final = new URL(page.finalUrl);
  const links = hrefs(html, page.finalUrl);
  const lower = html.toLowerCase();
  const checks: Check[] = [];
  // Sites built as JavaScript apps send an almost empty page and fill it in the
  // browser. We can't see what loads later, so we don't fail them for missing
  // things; we flag the real issue instead (AI tools read the raw page).
  const visible = stripTags(html.replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, " "));
  const scripts = (html.match(/<script\b[^>]*src=/gi) || []).length;
  const jsApp = visible.length < 600 && (scripts > 0 || /id=["'](root|app|__next|__nuxt)["']/i.test(html));
  const SKIPPABLE = new Set(["tel", "contact", "reviews", "social", "fresh", "alt", "h1", "share", "icon"]);
  const add = (c: Check) => {
    if (jsApp && SKIPPABLE.has(c.id) && c.status !== "pass") {
      c = { ...c, status: "skip", detail: "Your site loads this part with JavaScript, so we couldn't check it from outside. Open your site on your phone to check it yourself.", fix: "" };
    }
    checks.push(c);
  };
  if (jsApp) {
    checks.push({
      id: "readable", group: "Google", label: "Readable by AI tools and search crawlers", weight: 10, status: "fail",
      detail: `Your site's words only show up after JavaScript runs in a browser. Before that, the page has about ${visible.split(/\s+/).filter(Boolean).length} words. Google can usually work it out, but many AI tools like ChatGPT and Perplexity read the page before JavaScript runs, so to them your site is nearly blank.`,
      fix: "Have your developer turn on server side rendering or prerendering so the full page is sent right away.",
    });
  }

  // Trust and basics
  const https = final.protocol === "https:";
  add({
    id: "https", group: "Trust", label: "Secure connection (the padlock)", weight: 10,
    status: https ? "pass" : "fail",
    detail: https ? "Your site loads over https, so browsers show it as secure." : "Your site loads without https. Chrome marks it \"Not secure\" and many people leave.",
    fix: "Turn on a free SSL certificate with your host and redirect every page to https.",
  });

  const year = new Date().getFullYear();
  const years = [...stripTags(html).matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1]));
  const latest = years.length ? Math.max(...years) : 0;
  add({
    id: "fresh", group: "Trust", label: "Looks up to date", weight: 4,
    status: latest >= year - 1 ? "pass" : latest ? "warn" : "warn",
    detail: latest >= year - 1 ? `Footer shows ${latest}, so the site looks cared for.` : latest ? `Footer still says ${latest}. Visitors notice and wonder if you're still open.` : "We couldn't find a copyright year. Small thing, but it helps the site look current.",
    fix: "Update the footer year (or make it update itself) and refresh anything dated.",
  });

  // Phones
  const viewport = /<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html);
  add({
    id: "mobile", group: "Phones", label: "Built for phones", weight: 12,
    status: viewport ? "pass" : "fail",
    detail: viewport ? "Your site is set up to fit phone screens." : "Your site isn't set up for phones, so it shows tiny and zoomed out. Most visitors are on a phone.",
    fix: "Use a mobile friendly (responsive) design. This is usually a rebuild, not a tweak.",
  });

  const tel = links.some((l) => l.startsWith("tel:"));
  add({
    id: "tel", group: "Phones", label: "Tap to call", weight: 10,
    status: tel ? "pass" : "fail",
    detail: tel ? "Your phone number is tappable, so people can call in one tap." : "Your phone number isn't tappable. On a phone, people have to copy it by hand, and many won't.",
    fix: "Link your phone number with tel: so it dials in one tap. Put it at the top of the page.",
  });

  // Getting customers
  const form = /<form\b/i.test(html);
  const mail = links.some((l) => l.startsWith("mailto:"));
  const booking = links.some((l) => /calendly|acuityscheduling|squareup\.com\/appointments|square\.site|booksy|vagaro|setmore|schedulicity|opentable|resy|toasttab|housecallpro|jobber|book|schedule|appointment|reserv/i.test(l));
  add({
    id: "contact", group: "Getting customers", label: "Easy way to reach you online", weight: 10,
    status: form || booking ? "pass" : mail ? "warn" : "fail",
    detail: form || booking
      ? `People can ${booking ? "book or request" : "send a message"} right from your homepage.`
      : mail ? "There's an email link, but no form or booking button. Many people won't open their email app." : "We couldn't find a form, booking button or email link on your homepage. People who don't want to call have no way in.",
    fix: "Add a short contact form or a Book Now button near the top of the homepage.",
  });

  const reviews = links.some((l) => /g\.page|maps\.app\.goo\.gl|google\.[a-z.]+\/maps|maps\.google|search\.google\.com\/local|yelp\.com\/biz/i.test(l)) || /elfsight|trustindex|birdeye|podium|reviews?\s+widget/i.test(lower);
  add({
    id: "reviews", group: "Getting customers", label: "Shows off your reviews", weight: 6,
    status: reviews ? "pass" : "warn",
    detail: reviews ? "Your site links to your reviews or map listing." : "We didn't see your Google reviews or map listing on the homepage. Reviews are the first thing new customers check.",
    fix: "Add your best Google reviews to the homepage with a link to your Google listing.",
  });

  const social = links.filter((l) => /facebook\.com|instagram\.com|tiktok\.com|linkedin\.com|youtube\.com|x\.com|twitter\.com|nextdoor\.com/i.test(l));
  add({
    id: "social", group: "Getting customers", label: "Linked to your social pages", weight: 3,
    status: social.length ? "pass" : "warn",
    detail: social.length ? "Your social pages are linked, so people can see you're active." : "No links to your social pages. People like to check you're real and active.",
    fix: "Link your Facebook, Instagram or other active pages in the footer.",
  });

  // Google
  const title = titleOf(html);
  add({
    id: "title", group: "Google", label: "Page title Google shows", weight: 8,
    status: title.length >= 15 && title.length <= 70 ? "pass" : title ? "warn" : "fail",
    detail: !title ? "Your homepage has no title. Google has to guess what to show in search." : title.length < 15 ? `Your title is very short: "${title}". It should say what you do and where.` : title.length > 70 ? `Your title is long and gets cut off in Google: "${title.slice(0, 70)}..."` : `Google shows: "${title}"`,
    fix: "Write a title like \"Business Name | What you do in Your Town\" in under 60 characters.",
  });

  const desc = metaContent(html, "description");
  add({
    id: "desc", group: "Google", label: "Search description", weight: 6,
    status: desc.length >= 50 && desc.length <= 170 ? "pass" : desc ? "warn" : "fail",
    detail: !desc ? "No search description, so Google pulls random text from your page." : desc.length < 50 ? "Your search description is too short to sell the click." : desc.length > 170 ? "Your search description is long and gets cut off." : `Google may show: "${desc}"`,
    fix: "Write one or two sentences (about 150 characters) that say what you do, where, and why to pick you.",
  });

  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])).filter(Boolean);
  add({
    id: "h1", group: "Google", label: "Clear main headline", weight: 5,
    status: h1s.length === 1 ? "pass" : h1s.length > 1 ? "warn" : "fail",
    detail: h1s.length === 1 ? `Main headline: "${h1s[0].slice(0, 90)}"` : h1s.length > 1 ? `Your page has ${h1s.length} main headlines. One clear headline works better for people and Google.` : "Your homepage has no main headline. Visitors and Google can't tell right away what you do.",
    fix: "Use one headline at the top that says what you do and who it's for.",
  });

  const types = jsonLdTypes(html);
  const local = types.some((t) => LOCAL_TYPES.test(t));
  add({
    id: "schema", group: "Google", label: "Business details Google can read", weight: 6,
    status: local ? "pass" : "fail",
    detail: local ? "Your site tells Google and AI tools your business type, hours and contact details in a format they read directly." : "Your site doesn't include business details in the format Google and AI assistants read directly (called schema). It's invisible to visitors but helps you show up.",
    fix: "Add LocalBusiness schema with your name, address, phone, hours and service area.",
  });

  const ogImage = metaContent(html, "og:image");
  const ogTitle = metaContent(html, "og:title");
  add({
    id: "share", group: "Google", label: "Looks good when shared", weight: 3,
    status: ogImage && ogTitle ? "pass" : ogImage || ogTitle ? "warn" : "fail",
    detail: ogImage && ogTitle ? "When someone texts or posts your link, it shows a title and picture." : "When someone texts or posts your link, it shows up plain or with no picture.",
    fix: "Add share tags (og:title, og:description, og:image) with a good photo.",
  });

  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const withAlt = imgs.filter((t) => /\balt\s*=\s*["'][^"']{2,}["']/i.test(t)).length;
  const altPct = imgs.length ? Math.round((withAlt / imgs.length) * 100) : 100;
  add({
    id: "alt", group: "Google", label: "Photos are described", weight: 3,
    status: !imgs.length && jsApp ? "warn" : altPct >= 80 ? "pass" : altPct >= 40 ? "warn" : "fail",
    detail: imgs.length ? `${withAlt} of ${imgs.length} images have descriptions (alt text).` : "No images on the homepage to check.",
    fix: "Give each photo a short description of what's in it. Helps Google and people using screen readers.",
  });

  const icon = /<link\b[^>]*rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(html);
  add({
    id: "icon", group: "Trust", label: "Site icon in the browser tab", weight: 2,
    status: icon ? "pass" : "warn",
    detail: icon ? "Your logo shows in the browser tab." : "No site icon, so the browser tab shows a blank page symbol.",
    fix: "Add a small square version of your logo as the site icon.",
  });

  // Speed
  const psi = await psiPromise;
  const kb = Math.round(page.bytes / 1024);
  const firstByte = page.ms;
  if (psi?.performance != null) {
    const p = psi.performance;
    add({
      id: "speed", group: "Speed", label: "Speed on a phone", weight: 12,
      status: p >= 80 ? "pass" : p >= 50 ? "warn" : "fail",
      detail: `Google scores your site ${p} out of 100 for speed on a phone${psi.lcp ? `. The main content shows up in ${psi.lcp.replace(/ /g, " ")}` : ""}.${p < 50 ? " Slow sites lose visitors before the page even shows up." : ""}`,
      fix: "Compress big photos, cut extra plugins and scripts, and use good hosting.",
    });
  } else {
    add({
      id: "speed", group: "Speed", label: "Speed", weight: 12,
      status: jsApp ? "skip" : firstByte < 1500 ? "pass" : firstByte < 3500 ? "warn" : "fail",
      detail: jsApp
        ? "Your site finishes loading in the browser, so we couldn't time it from here. Google's speed test was busy. Try again in a few minutes for a full speed score."
        : `Your homepage answered in ${(firstByte / 1000).toFixed(1)} seconds (${kb} KB of page code).${firstByte >= 3500 ? " That's slow. People leave." : ""}`,
      fix: "Compress big photos, cut extra plugins and scripts, and use good hosting.",
    });
  }

  const scored = checks.filter((c) => c.status !== "skip");
  const score = Math.round(
    (scored.reduce((s, c) => s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0) /
      scored.reduce((s, c) => s + c.weight, 0)) * 100,
  );
  const order: Record<Status, number> = { fail: 0, warn: 1, pass: 2, skip: 3 };
  checks.sort((a, b) => order[a.status] - order[b.status] || b.weight - a.weight);

  return json(request, {
    site: final.hostname.replace(/^www\./, ""),
    url: page.finalUrl,
    name: (metaContent(html, "og:site_name") || title.split(/\s[|\-–—:]\s/)[0] || "").slice(0, 80),
    score,
    grade: grade(score),
    counts: {
      pass: checks.filter((c) => c.status === "pass").length,
      warn: checks.filter((c) => c.status === "warn").length,
      fail: checks.filter((c) => c.status === "fail").length,
      skip: checks.filter((c) => c.status === "skip").length,
    },
    jsApp,
    checks: checks.map((c) => ({ id: c.id, group: c.group, label: c.label, status: c.status, detail: c.detail, fix: c.fix })),
    speed: psi ? { performance: psi.performance, seo: psi.seo, accessibility: psi.accessibility, lcp: psi.lcp } : null,
    screenshot: psi?.screenshot || null,
    checkedAt: new Date().toISOString(),
  });
}
