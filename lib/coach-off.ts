import { NextResponse } from "next/server";
import { websageOriginAllowed } from "@/lib/websage-origins";

/**
 * The Hub's AI features are switched off (no paid AI credits): the Live Coach is hidden and
 * call prep / post-call review are done in chat. These endpoints answer with a plain message
 * the Hub can show, and never call a model.
 */
export const LIVE_COACH_OFF = "Live Coach is off for now, use the call prep card.";
export const PREP_IN_CHAT = "Prep is done in chat now.";

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  return websageOriginAllowed(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, authorization",
        Vary: "Origin",
      }
    : {};
}

export function preflight(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) });
}

export function off(request: Request, message: string) {
  return NextResponse.json({ error: message, off: true }, { status: 503, headers: cors(request) });
}
