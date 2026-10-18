import { clip, json, normalizeUrl, preflight, rateLimit, readJson } from "@/lib/tools";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Website Report Card (websageinc.com/tools/website-report-card.html)
 * POST { url } -> full audit (see lib/audit.ts for the shape)
 * ~70 checks from free sources: the live page, robots.txt, sitemap, llms.txt,
 * DNS (MX/SPF/DMARC), SSL, RDAP (domain), Google Lighthouse via PageSpeed Insights,
 * plus an internal crawl of up to 8 pages and image HEAD checks.
 */

export function OPTIONS(request: Request) {
  return preflight(request);
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const target = normalizeUrl(clip(body?.url, 400));
  if (!target) return json(request, { error: "Enter your website address, like yourbusiness.com" }, 400);
  if (!rateLimit(request, "report", 15)) {
    return json(request, { error: "You've run a lot of reports. Give it an hour and try again." }, 429);
  }
  const result = await audit(target);
  if ("error" in result) return json(request, { error: result.error }, result.status);
  return json(request, result);
}
