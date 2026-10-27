/**
 * Shared helpers for the WebSage free tools (websageinc.com/tools).
 * Pages live in the websageinc-site repo; these routes are only the backend.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { generateContent } from "@/lib/gemini";
import { limitMessage, logUpstream, upstreamOk } from "@/lib/model-errors";

export function apiKey(): string | null {
  return process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? null;
}

/* ---------- CORS ---------- */

function originOk(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return (
      host === "websageinc.com" ||
      host.endsWith(".websageinc.com") ||
      host === "websageinc.netlify.app" ||
      host.endsWith("--websageinc.netlify.app") ||
      host === "websageinc.pages.dev" ||
      host.endsWith(".websageinc.pages.dev") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  return originOk(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : {};
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...corsHeaders(request) },
  });
}

/* ---------- rate limit (per instance, in memory) ---------- */

const HITS: Map<string, number[]> = new Map();

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anon"
  );
}

export function rateLimit(request: Request, bucket: string, perHour: number): boolean {
  const key = `${bucket}:${clientIp(request)}`;
  const now = Date.now();
  const recent = (HITS.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= perHour) {
    HITS.set(key, recent);
    return false;
  }
  recent.push(now);
  HITS.set(key, recent);
  return true;
}

/* ---------- input helpers ---------- */

export const clip = (v: unknown, n: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f]+/g, " ").trim().slice(0, n) : "";

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Removes em and en dashes so nothing we generate reads as AI copy. */
export function noDashes(s: string): string {
  return s.replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",");
}

/* ---------- Gemini ---------- */

type GeminiOpts = {
  system: string;
  contents: { role: "user" | "model"; parts: { text: string }[] }[];
  json?: boolean;
  search?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export type GeminiResult = {
  ok: boolean;
  status: number;
  text: string;
  sources: { title: string; uri: string }[];
};

export async function gemini(opts: GeminiOpts): Promise<GeminiResult> {
  const key = apiKey();
  if (!key) return { ok: false, status: 503, text: "", sources: [] };
  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.4,
    maxOutputTokens: opts.maxTokens ?? 2048,
  };
  const body: Record<string, unknown> = {
    contents: opts.contents,
    systemInstruction: { parts: [{ text: opts.system }] },
    generationConfig,
  };
  if (opts.search) body.tools = [{ google_search: {} }];
  else if (opts.json) generationConfig.responseMimeType = "application/json";

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 40_000);
  try {
    const res = await generateContent(key, body, { search: opts.search, signal: ctl.signal });
    if (!res.ok) {
      logUpstream("tools gemini", res.status, await res.text().catch(() => ""));
      return { ok: false, status: res.status, text: "", sources: [] };
    }
    upstreamOk();
    const data = (await res.json()) as {
      candidates?: {
        content?: { parts?: { text?: string; thought?: boolean }[] };
        groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] };
      }[];
    };
    const c = data.candidates?.[0];
    const text = (c?.content?.parts ?? [])
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim();
    const sources = (c?.groundingMetadata?.groundingChunks ?? [])
      .map((g) => ({ title: String(g.web?.title ?? ""), uri: String(g.web?.uri ?? "") }))
      .filter((s) => s.uri);
    return { ok: text.length > 0, status: 200, text, sources };
  } catch (e) {
    console.error("tools gemini fetch", e);
    return { ok: false, status: 504, text: "", sources: [] };
  } finally {
    clearTimeout(timer);
  }
}

export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  const s = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const first = Math.min(...["{", "["].map((c) => (s.indexOf(c) === -1 ? Infinity : s.indexOf(c))));
  const last = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (!Number.isFinite(first) || last < first) return null;
  try {
    return JSON.parse(s.slice(first, last + 1)) as T;
  } catch {
    return null;
  }
}

export function upstreamError(request: Request, status: number): Response {
  if (status === 503) return json(request, { error: "This tool is down for a moment. Please try again soon." }, 503);
  const limit = limitMessage(status);
  if (limit) return json(request, { error: limit.error }, limit.status);
  return json(request, { error: "Something went wrong on our side. Please try again." }, 502);
}

/* ---------- safe page fetch (blocks private networks) ---------- */

function privateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const m = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return m ? privateIp(m[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  );
}

export function normalizeUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw || raw.length > 400) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    if (!/\.[a-z]{2,}$/i.test(u.hostname) || isIP(u.hostname)) return null;
    if (u.port && u.port !== "80" && u.port !== "443") return null;
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}

async function hostIsPublic(hostname: string): Promise<boolean> {
  try {
    const addrs = await lookup(hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !privateIp(a.address));
  } catch {
    return false;
  }
}

export type Page = {
  url: string;
  finalUrl: string;
  status: number;
  ms: number;
  bytes: number;
  html: string;
  contentType: string;
  redirects: number;
  headers: Record<string, string>;
  hops: string[];
};

const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 WebSageTools/1.0";

/** Fetch a public web page. Throws Error with a friendly message on failure. */
export async function fetchPage(start: URL, timeoutMs = 12_000, maxBytes = 2_500_000): Promise<Page> {
  let url = new URL(start.toString());
  const t0 = Date.now();
  const hops: string[] = [];
  for (let hop = 0; hop <= 5; hop++) {
    if (!(await hostIsPublic(url.hostname))) throw new Error("We couldn't find that website. Check the address and try again.");
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), Math.max(1000, timeoutMs - (Date.now() - t0)));
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: ctl.signal,
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-language": "en-US,en;q=0.9" },
      });
    } catch (e) {
      clearTimeout(timer);
      if ((e as Error).name === "AbortError") throw new Error("That website took too long to answer.");
      throw new Error("We couldn't reach that website. Check the address and try again.");
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      clearTimeout(timer);
      const next = new URL(res.headers.get("location")!, url);
      if (next.protocol !== "http:" && next.protocol !== "https:") throw new Error("That website redirects somewhere we can't follow.");
      hops.push(next.toString());
      url = next;
      continue;
    }
    const contentType = res.headers.get("content-type") ?? "";
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    if (reader) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes <= maxBytes) chunks.push(value);
          if (bytes > maxBytes * 2) { await reader.cancel(); break; }
        }
      } catch {
        // keep whatever arrived
      }
    }
    clearTimeout(timer);
    const buf = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
    let o = 0;
    for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
    return {
      url: start.toString(),
      finalUrl: url.toString(),
      status: res.status,
      ms: Date.now() - t0,
      bytes,
      html: new TextDecoder("utf-8", { fatal: false }).decode(buf),
      contentType,
      redirects: hop,
      headers,
      hops,
    };
  }
  throw new Error("That website redirects too many times.");
}

/* ---------- HTML helpers ---------- */

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n) || 32))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16) || 32));
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Readable text of a page: headings and body copy, no nav chrome or scripts. */
export function pageText(html: string, max = 4000): string {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _h, t) => `\n## ${stripTags(t)}\n`)
    .replace(/<(br|\/p|\/li|\/div|\/tr|\/section|\/article)\b[^>]*>/gi, "\n");
  const text = decodeEntities(body.replace(/<[^>]+>/g, " "))
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const l of text) {
    if (seen.has(l)) continue;
    seen.add(l);
    out.push(l);
  }
  return out.join("\n").slice(0, max);
}

export function metaContent(html: string, key: string): string {
  const re = new RegExp(
    `<meta\\b[^>]*(?:name|property)\\s*=\\s*["']${key}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  if (!tag) return "";
  return decodeEntities(tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] ?? "").trim();
}

export function titleOf(html: string): string {
  return stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

export function hrefs(html: string, base: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)) {
    try {
      out.push(new URL(decodeEntities(m[1]), base).toString());
    } catch {
      /* skip */
    }
  }
  return out;
}

/* ---------- signed knowledge base (assistant tool) ---------- */

function kbKey(): Buffer {
  return createHash("sha256").update(`websage-tools-kb:${apiKey() ?? "unset"}`).digest();
}

export function signKb(payload: string): string {
  return createHmac("sha256", kbKey()).update(payload).digest("base64url");
}

export function verifyKb(payload: string, sig: string): boolean {
  const want = Buffer.from(signKb(payload));
  const got = Buffer.from(String(sig));
  return want.length === got.length && timingSafeEqual(want, got);
}
