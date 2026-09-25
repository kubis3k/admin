---
tags: [gastro-admin, moc]
---
# gastro-admin

Centrální admin pro gastro weby (multi-tenant přes `sites`, moduly per site).
Stack: Next.js 15.5 (App Router), Drizzle, Neon Postgres, Auth.js v5, Tailwind v4 + shadcn/ui.

## Fáze
| Fáze | Stav | Poznámka |
|---|---|---|
| 0 — Menu modul | ✅ | výchozí scaffold |
| 1 — Auth & role | ✅ ověřeno E2E | [[Fáze 1 — Auth & role]] |
| 2 — Otevírací doba | ✅ ověřeno E2E | [[Fáze 2 — Otevírací doba]] |
| 3 — Eventy | ✅ ověřeno E2E | [[Fáze 3 — Eventy]] |
| 4 — Galerie + upload | ✅ kód · ⏳ živý upload (token) | [[Fáze 4 — Galerie & upload]] |
| 5 — Textový obsah | ✅ ověřeno E2E | [[Fáze 5 — Textový obsah]] |
| 6 — Onboarding tenanta | ✅ ověřeno E2E | [[Fáze 6 — Onboarding tenanta]] |
| 7 — On-demand revalidace | ✅ ověřeno E2E | [[Fáze 7 — On-demand revalidace]] |

Zadání fází: `ROADMAP.md` v rootu.

## Follow-upy (mimo ROADMAP)
| Téma | Stav | Poznámka |
|---|---|---|
| Nastavení webu (superadmin) | ✅ ověřeno E2E | [[Nastavení webu (superadmin)]] |
| Chyby validace přímo ve formulářích | ✅ | součást [[UI adminu]] |
| UI adminu (Tailwind + shadcn) | ✅ ověřeno E2E | [[UI adminu]] |

## Rychlé odkazy
- [[Rozhodnutí]] — log architektonických rozhodnutí
- [[Testovací prostředí]] — Neon DB, testovací účty, jak se přihlásit v devu
- Stav pro agenty (flow systém): `.claude/state/flow-state.md`
