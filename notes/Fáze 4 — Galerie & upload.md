---
tags: [gastro-admin, faze]
stav: kód hotový — čeká na živý test uploadu
---
# Fáze 4 — Galerie & upload

Zpět: [[gastro-admin]] · Předchozí: [[Fáze 3 — Eventy]]

## Co vzniklo
- `@vercel/blob`; `src/lib/blob.ts` (upload/mazání) + čistá validace `src/lib/upload.ts` (+ 14 testů)
- Tabulka `gallery_images` (url, pathname, alt, sort_order) — migrace `0005_gallery`
- Admin `/admin/[site]/gallery` — upload (file input), popisek, ↑ ↓, smazání; náhledy přes `next/image`
- Menu: upload / odebrání obrázku položky (`setItemImage`, `removeItemImage`) + náhled 64×64
- Veřejné API `/api/public/[site]/gallery` — `{ images: [{ id, url, alt }] }` podle pořadí
- `next.config.ts`: `remotePatterns` na `*.public.blob.vercel-storage.com`, `serverActions.bodySizeLimit = "5mb"` (default 1 MB by odmítl i běžnou fotku)

## Pravidla
- Max **4 MB** (limit těla funkce na Vercelu 4,5 MB); JPEG, PNG, WebP, AVIF, GIF — **SVG ne** (může nést skript)
- Klíč v Blobu `<slug>/gallery/<uuid>.<ext>` / `<slug>/menu/…` — prefix ze serveru, ne od klienta
- Blob se maže jen pro URL z naší Blob domény; selhání mazání se jen zaloguje (řádek v DB už je pryč)
- Bez `BLOB_READ_WRITE_TOKEN` upload skončí čitelnou chybou, build funguje

## Práva
Staff i owner: galerie (upload, popisek, pořadí, mazání) i obrázky položek menu.

## Ověření (2026-09-25)
- ✅ admin galerie, pořadí ↑ ↓ vč. okrajů, úprava popisku → API
- ✅ smazání obrázku bez tokenu: řádek pryč, chyba Blobu jen v logu
- ✅ upload bez tokenu → „Uložení se nezdařilo", nic neuloženo
- ✅ cizí web má vlastní galerii; menu dál funguje
- ✅ `npm test` 66/66, tsc, build
- ⏳ **živý upload** (galerie + obrázek položky) — až bude `BLOB_READ_WRITE_TOKEN` (Vercel → Storage → Blob, store `gastro-admin`, fra1, Public)
- Critic: APPROVE. P3: `sort_order = max+1` mimo transakci → souběžné uploady mohou dostat stejné pořadí (tichá kolize, ne pád) — pro V1 akceptováno

Rozhodnutí: [[Rozhodnutí#Fáze 4]]
