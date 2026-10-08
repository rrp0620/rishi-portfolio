/** Browser origins allowed to call the WebSage coach APIs. */
export function websageOriginAllowed(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return (
      host === "websage-demos.vercel.app" ||
      host === "websage-hub.vercel.app" ||
      (host.startsWith("websage-hub-") && host.endsWith(".vercel.app")) ||
      host === "websageinc.com" ||
      host.endsWith(".websageinc.com") ||
      host === "localhost"
    );
  } catch {
    return false;
  }
}
