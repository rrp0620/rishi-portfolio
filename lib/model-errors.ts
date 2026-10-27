/**
 * Shared handling for Gemini upstream errors in the public tools, demo bots, Ask Rishi and the audit demo.
 * 402 (prepayment credits depleted) means the AI credit is out; 429 (rate limit / quota) means busy.
 * Each of those is logged once per instance until a call succeeds again; other errors log every time.
 */
export const CREDIT_OUT = "AI credit is out, tell Rishi.";
export const BUSY = "Busy right now, try again in a minute.";

const logged = new Set<number>();

export function logUpstream(where: string, status: number, detail: string) {
  if (status === 402 || status === 429) {
    if (logged.has(status)) return;
    logged.add(status);
  }
  console.error(`${where} upstream`, status, detail.slice(0, 400));
}

/** The visitor-facing message and status for a 402 or 429, or null for any other error. */
export function limitMessage(status: number): { error: string; status: number } | null {
  if (status === 402) return { error: CREDIT_OUT, status: 503 };
  if (status === 429) return { error: BUSY, status: 429 };
  return null;
}

/** Call after a successful upstream response so the next outage is logged again. */
export function upstreamOk() {
  logged.clear();
}
