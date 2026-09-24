---
tags: [gastro-admin, faze]
stav: hotovo
---
# Fáze 5 — Textový obsah

Zpět: [[gastro-admin]] · Předchozí: [[Fáze 3 — Eventy]]

## Co vzniklo
- Tabulka `page_content` (page_key, content markdown, updated_at), `unique(site_id, page_key)` — migrace `0004_content`
- Nový modulový flag `sites.modules.content` (chybějící klíč = vypnuto)
- Validace `src/lib/content.ts` (+ testy) — `pageKey` jen `a-z0-9-` max 50, obsah ≤ 50 000 znaků, CRLF → LF
- Admin `/admin/[site]/content` — textarea editor, nová stránka, smazání
- Veřejné API `/api/public/[site]/content` (seznam) a `/api/public/[site]/content/[pageKey]` (obsah)

## Práva
| Akce | staff | owner |
|---|---|---|
| Upravit obsah stránky | ✅ | ✅ |
| Založit / smazat stránku | ❌ | ✅ |

## ⚠️ Pro klientské weby
API vrací **surový markdown bez sanitizace** (může obsahovat `<script>`). Klientský web musí markdown vykreslit s vypnutým HTML nebo přes sanitizér. Důvod: server nevyrábí HTML → žádné XSS v adminu ani v API; bezpečné vykreslení je na straně webu.

## E2E ověření (Neon, 2026-09-24)
- ✅ staff vidí jen „Uložit" (žádné zakládání/mazání)
- ✅ owner založí stránku, uloží markdown, CRLF normalizováno
- ✅ API: obsah podle klíče, seznam stránek, neexistující / neplatný (`..%2Fetc`, `About`) klíč → 404
- ✅ cizí web má vlastní obsah (bez prolínání)
- ✅ staff přehraje ownerův formulář „Založit" (i se šifrovanou closure) → odmítnuto, nic nevzniklo
- ✅ 3 souběžná založení stejného klíče → vznikne právě 1, ostatní čitelná chyba
- Critic: APPROVE; jeho P3 (race condition v `createPage`) opraveno přes `ON CONFLICT DO NOTHING`

Rozhodnutí: [[Rozhodnutí#Fáze 5]]
