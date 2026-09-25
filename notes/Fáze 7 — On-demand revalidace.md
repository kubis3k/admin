---
tags: [gastro-admin, faze]
stav: hotovo
---
# Fáze 7 — On-demand revalidace

Zpět: [[gastro-admin]] · Předchozí: [[Fáze 6 — Onboarding tenanta]]

## ⚠️ Nález: „60s cache" z Fáze 0 nikdy nefungovala
Build označoval všechny `/api/public/*` jako `ƒ Dynamic` (Neon driver čte přes `fetch` bez cache) a odpovědi neměly cache hlavičky → **každý request šel do DB**. `export const revalidate = 60` byl mrtvý kód. Proto Fáze 7 nejdřív zavedla skutečnou cache.

## Co vzniklo
- `src/lib/public-data.ts` — data veřejného API přes `unstable_cache`, klíč `["public", slug, modul(, pageKey)]`, tag `gastro:<slug>:<modul>`, max 60 s
- `src/lib/revalidate.ts` — `notifySiteChange(site, modul)` volaný ve **všech 24** mutačních akcích 5 modulů → `revalidateTag` + webhook
- `src/lib/webhook.ts` (+ testy) — tag, validace URL, `signPayload` / `verifySignature` (HMAC-SHA256, tolerance 300 s)
- `sites.webhook_url`, `sites.webhook_secret` — migrace `0007_webhooks`
- Po založení webu (Fáze 6) se invalidují tagy nového slugu
- README: kompletní snippet pro klientský Next.js web (`app/api/revalidate/route.ts` + `fetch` s tagy)

## Jak to funguje
1. Uložení v adminu → `revalidateTag("gastro:<slug>:<modul>")` → API vrátí nová data okamžitě
2. Pokud má web webhook: `after()` pošle POST `{ site, module, tags, pageKey, ts }` s hlavičkami `X-Gastro-Timestamp` a `X-Gastro-Signature: sha256=…` (podpis nad `${ts}.${body}`), timeout 5 s, bez opakování
3. Klient ověří podpis a zavolá `revalidateTag(tag)` na svých `fetch`
4. Bez webhooku / při výpadku → klientský web se obnoví podle vlastního `revalidate`
- „Dnes" (otevírací doba, eventy) se počítá **mimo cache** — nic nezastará přes půlnoc

## Nastavení webhooku (zatím SQL, provozovatel)
```sql
UPDATE sites SET webhook_url = 'https://klient.cz/api/revalidate',
                 webhook_secret = '<openssl rand -hex 32>'
WHERE slug = '…';
```
Produkce jen `https`; `http://localhost` jen v devu.

## E2E ověření (2026-09-25)
Produkční build (`next build && next start`):
- ✅ změna **přímo v DB** → API vrací stará data (cache funguje)
- ✅ změna **přes admin** → API okamžitě nová data (včetně té vložené mimo admin → invalidace tagem, ne náhoda)
- ✅ jiný web si drží vlastní cache (izolace tagů)
Dev + lokální přijímač:
- ✅ webhook doručen, tag `gastro:pizzerie-u-mostu:menu`, **podpis platný**, upravené tělo odmítnuto
- Critic: 2× APPROVE (webhook, cache vrstva); P3 „nový web až 60 s neviditelný" opraveno

## Mimo scope
- Retry / fronta webhooků, UI pro nastavení webhooku (budoucí `/admin/[site]/settings`)
