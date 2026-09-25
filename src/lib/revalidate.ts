import { revalidateTag as revalidateCacheTag } from "next/cache";
import { after } from "next/server";
import {
  revalidateTag,
  isValidWebhookUrl,
  signPayload,
  type SiteModule,
} from "@/lib/webhook";

// ---------------------------------------------------------------------------
// Voláno na konci každé mutační server akce (menu/hours/events/content/
// gallery), vedle stávajícího revalidatePath admin stránky (ten zůstává).
// 1) revalidateTag() invaliduje serverovou cache vlastního veřejného API
//    (viz src/lib/public-data.ts) — okamžitě, synchronně.
// 2) pokud má site nastavený webhook, podepsané upozornění na klientský web
//    přes after() — mimo request/response cyklus, nezpomaluje odpověď adminu.
// ---------------------------------------------------------------------------
export async function notifySiteChange(
  site: { slug: string; webhookUrl: string | null; webhookSecret: string | null },
  module: SiteModule,
  opts?: { pageKey?: string }
): Promise<void> {
  revalidateCacheTag(revalidateTag(site.slug, module));

  const { webhookUrl, webhookSecret } = site;
  if (!webhookUrl || !webhookSecret) return;

  const isProduction = process.env.NODE_ENV === "production";
  if (!isValidWebhookUrl(webhookUrl, isProduction)) {
    console.warn(
      `notifySiteChange: neplatná webhook URL pro site ${site.slug}, webhook se neposílá`
    );
    return;
  }

  after(async () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      site: site.slug,
      module,
      tags: [revalidateTag(site.slug, module)],
      pageKey: opts?.pageKey ?? null,
      ts,
    });
    const signature = signPayload(webhookSecret, ts, body);

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gastro-Timestamp": String(ts),
          "X-Gastro-Signature": signature,
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        console.error(
          `notifySiteChange: webhook selhal pro site ${site.slug}, module ${module}, status ${res.status}`
        );
      }
    } catch (err) {
      console.error(
        `notifySiteChange: webhook selhal pro site ${site.slug}, module ${module}`,
        err
      );
    }
  });
}
