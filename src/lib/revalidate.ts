import { revalidateTag as revalidateCacheTag } from "next/cache";
import { after } from "next/server";
import {
  revalidateTag,
  isValidWebhookUrl,
  signPayload,
  type SiteModule,
} from "@/lib/webhook";

// ---------------------------------------------------------------------------
// Nízkoúrovňové odeslání jednoho webhook požadavku — sdílené mezi
// notifySiteChange (přes after(), fire-and-forget) a sendTestWebhook
// (settings, synchronně, výsledek se zobrazí v UI). Secret se sem nikdy
// nevrací ani neloguje.
// ---------------------------------------------------------------------------
export async function deliverWebhook(
  site: { slug: string; webhookUrl: string | null; webhookSecret: string | null },
  payload: object
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const { webhookUrl, webhookSecret } = site;
  if (!webhookUrl || !webhookSecret) {
    return { ok: false, error: "Webhook není nastavený" };
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (!isValidWebhookUrl(webhookUrl, isProduction)) {
    return { ok: false, error: "Neplatná webhook URL" };
  }

  const ts = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);
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
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, error: "timeout" };
    }
    return { ok: false, error: err instanceof Error ? err.message : "chyba" };
  }
}

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

  if (!site.webhookUrl || !site.webhookSecret) return;

  after(async () => {
    const payload = {
      site: site.slug,
      module,
      tags: [revalidateTag(site.slug, module)],
      pageKey: opts?.pageKey ?? null,
      ts: Math.floor(Date.now() / 1000),
    };
    const result = await deliverWebhook(site, payload);
    if (!result.ok) {
      console.error(
        `notifySiteChange: webhook selhal pro site ${site.slug}, module ${module}: ${result.error}`
      );
    }
  });
}
