import { PREP_IN_CHAT, off, preflight } from "@/lib/coach-off";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Call prep (talk track) generator for the WebSage Hub: moved to chat (no paid AI credits). Every call gets
 * 503 { error: "Prep is done in chat now.", off: true } and no model is called.
 */

export const OPTIONS = preflight;
export const POST = (request: Request) => off(request, PREP_IN_CHAT);
