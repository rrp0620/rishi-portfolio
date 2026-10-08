import { NextResponse } from "next/server";
import { websageOriginAllowed } from "@/lib/websage-origins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Short-lived Deepgram token for the Call Coach page. The browser opens its
 * own streaming WebSocket to Deepgram with this token, so the real API key
 * never leaves the server. Tokens only gate the connection handshake; an open
 * stream keeps running after the token expires.
 *
 * POST /api/coach/token -> { token, expiresIn }
 * GET  /api/coach/token?check=1 -> { ok } (health check, no token returned)
 */

const HITS: Map<string, number[]> = new Map();

function allowed(origin: string): boolean {
  return websageOriginAllowed(origin);
}

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  return allowed(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, authorization",
        Vary: "Origin",
      }
    : {};
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) });
}

function rateLimit(key: string): boolean {
  const now = Date.now();
  const recent = (HITS.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 120) return false;
  recent.push(now);
  HITS.set(key, recent);
  return true;
}

async function grant(): Promise<{ token?: string; expiresIn?: number; status: number; error?: string }> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return { status: 503, error: "Transcription isn't configured." };
  let res: Response;
  try {
    res = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ ttl_seconds: 60 }),
    });
  } catch {
    return { status: 502, error: "Couldn't reach transcription service." };
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("deepgram grant", res.status, t.slice(0, 300));
    return { status: 502, error: `Transcription auth failed (${res.status}).` };
  }
  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) return { status: 502, error: "No token returned." };
  return { status: 200, token: j.access_token, expiresIn: j.expires_in ?? 60 };
}

export async function GET(request: Request) {
  const u = new URL(request.url);
  if (u.searchParams.get("check") !== "1") return NextResponse.json({ error: "Use POST." }, { status: 405 });
  const g = await grant();
  return NextResponse.json({ ok: g.status === 200, status: g.status, error: g.error ?? null });
}

export async function POST(request: Request) {
  const headers = cors(request);
  if (!headers["Access-Control-Allow-Origin"]) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!rateLimit(ip)) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers });
  const g = await grant();
  if (g.status !== 200) return NextResponse.json({ error: g.error }, { status: g.status, headers });
  return NextResponse.json(
    { token: g.token, expiresIn: g.expiresIn },
    { headers: { ...headers, "cache-control": "no-store" } },
  );
}
