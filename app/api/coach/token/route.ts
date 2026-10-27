import { LIVE_COACH_OFF, off, preflight } from "@/lib/coach-off";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deepgram token for the Live Coach: switched off with the Live Coach (no paid AI).
 * Every call gets 503 { error: "Live Coach is off for now, use the call prep card.", off: true }
 * and Deepgram is never called. The full route is in git history before this change.
 */

export const OPTIONS = preflight;
export const GET = (request: Request) => off(request, LIVE_COACH_OFF);
export const POST = (request: Request) => off(request, LIVE_COACH_OFF);
