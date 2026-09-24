---
tags: [gastro-admin, faze]
stav: hotovo
---
# Fáze 2 — Otevírací doba

Zpět: [[gastro-admin]] · Předchozí: [[Fáze 1 — Auth & role]]

## Co vzniklo
- Tabulky `opening_hours` (1 okno/den) a `opening_hour_exceptions` (výjimka na datum) — migrace `0002_hours`
- Čistá logika `src/lib/hours.ts` — `computeEffectiveSchedule`, `todayInPrague`, validace
- Admin `/admin/[site]/hours` — týdenní rozvrh + výjimky
- Veřejné API `/api/public/[site]/hours` — `days` (14 dní dopředu), `today`, `weekly`
- Rozcestník `/admin` ukazuje odkazy podle zapnutých modulů

## Pravidla
- `weekday`: **0 = pondělí … 6 = neděle**
- Den bez řádku = zavřeno
- `closesAt < opensAt` = otevřeno přes půlnoc (`overnight: true`)
- Výjimka pro datum **přebíjí** týdenní rozvrh (`source: "exception"`)
- Vše v Europe/Prague

## Práva
| Akce | staff | owner |
|---|---|---|
| Výjimky (přidat/smazat) | ✅ | ✅ |
| Týdenní rozvrh | jen čtení | ✅ |

## E2E ověření (Neon, 2026-09-24)
- ✅ staff vidí rozvrh jen ke čtení, přidá výjimku
- ✅ výjimka „zavřeno" (so 26. 9.) přebije sobotní 10–22; běžná so 3. 10. otevřeno
- ✅ výjimka s vlastními časy (3. 10. 12–16 „Svatba") přebije rozvrh
- ✅ pátek 18:00–02:00 → `overnight: true`
- ✅ staff (podvržený POST) nezmění týdenní rozvrh
- Critic: APPROVE. P3: `today` v API může být až 60 s po půlnoci starý (ISR cache, stejně jako menu)

Rozhodnutí: [[Rozhodnutí#Fáze 2]]
