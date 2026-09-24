---
tags: [gastro-admin, faze]
stav: hotovo
---
# Fáze 3 — Eventy

Zpět: [[gastro-admin]] · Předchozí: [[Fáze 2 — Otevírací doba]]

## Co vzniklo
- Tabulka `events` (title, description, date, start_time, image_url, is_published) — migrace `0003_events`
- Validace `src/lib/events.ts` (+ 10 testů) — title 1–200, popis ≤ 5000, datum/čas, URL jen `http(s)`
- Admin `/admin/[site]/events` — nový event, nadcházející / proběhlé, inline úprava, publikovat/skrýt, smazat
- Veřejné API `/api/public/[site]/events` — jen publikované, od dneška; `?all=1` i minulé
- `src/app/admin/[site]/error.tsx` — čitelná hláška místo „Application error" při neplatném vstupu (platí pro všechny moduly)

## Pravidla
- `date` + volitelný `start_time`, místní čas Prahy (žádné převody TZ)
- Řazení: datum, pak čas; event bez času je v rámci dne první
- API vrací jen `id, title, description, date, startTime, imageUrl` — nic neveřejného

## Práva
Staff i owner: plný CRUD včetně publikace (jako položky menu).

## E2E ověření (Neon, 2026-09-24)
- ✅ staff vytvoří publikovaný event i koncept
- ✅ API: koncept chybí, řazení podle data, bez času první, žádná neveřejná pole
- ✅ publikování konceptu → objeví se v API
- ✅ minulý event jen s `?all=1`
- ✅ cizí web vidí jen svůj event
- ✅ HTML v popisu se v adminu zobrazí jako text (escapováno)
- ✅ URL `javascript:alert(1)` odmítnuta, nic se neuložilo
- Formuláře eventů používají inline server actions (ID v šifrované closure) → podvržení ID z klienta není možné; IDOR navíc hlídá `WHERE site_id`
- Critic: APPROVE. P3: `imageUrl` se v adminu zobrazuje jen jako text (náhled až s uploadem ve Fázi 4)

## Dluh
- Chyby validace by měly jít zpět do formuláře (`useActionState`) místo error stránky — týká se všech modulů
- Admin řadí event bez času na konec dne, API na začátek — kosmetický rozdíl

Rozhodnutí: [[Rozhodnutí#Fáze 3]]
