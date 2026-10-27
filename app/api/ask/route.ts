import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ask Rishi (portfolio): switched off so it doesn't use the free Gemini quota the WebSage tools need.
 * The full route is in git history before this change.
 */
export function POST() {
  return NextResponse.json({ error: "This isn't available right now." }, { status: 503 });
}
