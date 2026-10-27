import { LIVE_COACH_OFF, off, preflight } from "@/lib/coach-off";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WebSage Live Coach backend: switched off (no paid AI credits). Every call gets
 * 503 { error: "Live Coach is off for now, use the call prep card.", off: true } and no model is called.
 */

export const OPTIONS = preflight;
export const GET = (request: Request) => off(request, LIVE_COACH_OFF);
export const POST = (request: Request) => off(request, LIVE_COACH_OFF);
