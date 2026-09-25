import { createHmac, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Čistá logika pro on-demand revalidaci (F7) — žádné "@/" importy, žádné
// next importy, aby se dala testovat bez next runtime (viz webhook.test.ts).
// ---------------------------------------------------------------------------

export type SiteModule = "menu" | "hours" | "events" | "content" | "gallery";

// Tag pro next/cache revalidateTag na klientském webu — klient si přes
// `next: { tags: [...] }` přihlásí fetch k tomuto tagu (viz README).
export function revalidateTag(slug: string, module: SiteModule): string {
  return `gastro:${slug}:${module}`;
}

// Webhook URL nastavuje provozovatel ručně v DB (SSRF riziko vědomě
// akceptováno, viz flow-state F7) — přesto omezíme na https v produkci,
// http povolíme jen na localhost v devu (pohodlné E2E testování webhooku).
export function isValidWebhookUrl(url: string, isProduction: boolean): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol === "https:") return true;

  if (
    parsed.protocol === "http:" &&
    !isProduction &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
  ) {
    return true;
  }

  return false;
}

// Podpis nad `${timestamp}.${body}` — stejné schéma jako Stripe webhooks.
export function signPayload(
  secret: string,
  timestamp: number,
  body: string
): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(`${timestamp}.${body}`);
  return `sha256=${hmac.digest("hex")}`;
}

// Ověření na straně klientského webu (viz README snippet) — exportováno
// i odsud, ať se logika testuje na jednom místě.
export function verifySignature(
  secret: string,
  timestamp: number,
  body: string,
  signature: string,
  nowSec: number,
  toleranceSec = 300
): boolean {
  if (Math.abs(nowSec - timestamp) > toleranceSec) return false;

  const expected = signPayload(secret, timestamp, body);

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
