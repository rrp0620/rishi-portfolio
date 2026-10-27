/**
 * Shared handling for Gemini upstream errors in the Live Coach and call prep.
 * 402 (prepayment credits depleted) and 429 (quota) mean the AI credit is out:
 * the caller gets a plain message, and we log it once per instance until a call succeeds again.
 */
export const CREDIT_OUT = "AI credit is out, tell Rishi.";

let creditOutLogged = false;

export function upstreamFailure(where: string, status: number, detail: string): { error: string; status: number } {
  if (status === 402 || status === 429) {
    if (!creditOutLogged) {
      creditOutLogged = true;
      console.error(`${where} upstream: AI credit out`, status, detail.slice(0, 400));
    }
    return { error: CREDIT_OUT, status: 503 };
  }
  console.error(`${where} upstream`, status, detail.slice(0, 400));
  return { error: "Model error, try again.", status: 502 };
}

/** Call after a successful upstream response so the next credit outage is logged again. */
export function upstreamOk() {
  creditOutLogged = false;
}
