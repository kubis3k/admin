---
tags: [gastro-admin, faze]
stav: hotovo
commit: fa62cc0
---
# Fáze 1 — Auth & role

Zpět: [[gastro-admin]]

## Co vzniklo
- Auth.js v5, magic link (Nodemailer / libovolné SMTP), database sessions — `src/auth.ts`
- Tabulky `users`, `site_memberships` (owner | staff) + `accounts`, `sessions`, `verification_tokens` (vyžaduje DrizzleAdapter)
- `requireSiteAccess(siteSlug, minRole)` v `src/lib/auth.ts` — jediné místo kontroly přístupu
- `/admin/login`, rozcestník `/admin`, stránka 403 (`forbidden.tsx`)
- Migrace `0000_baseline` (stávající tabulky) + `0001_auth`

## Práva
| Akce | staff | owner |
|---|---|---|
| Položky menu (přidat/upravit/dostupnost/smazat) | ✅ | ✅ |
| Kategorie (přidat/smazat) | ❌ | ✅ |
| Nastavení webu (`site.modules`) | ❌ | ✅ (zatím žádná akce) |

## Nalezená díra (opraveno)
IDOR: server actions věřily ID z klienta — owner webu A mohl mazat položky webu B. Argumenty z `.bind()` jsou ve formuláři jako čitelný JSON, takže jdou přepsat. Každý dotaz teď váže záznam na `site.id`.

## E2E ověření (Neon, 2026-09-24)
- ✅ bez membership → 403 (i neexistující / cizí web)
- ✅ neznámý e-mail → žádný odkaz, žádný user
- ✅ použitý odkaz nejde znovu použít
- ✅ staff upraví položku; staff (podvržený POST) nesmaže kategorii
- ✅ owner smaže kategorii; IDOR na cizí web = no-op
- ✅ CHECK lowercase e-mail

Rozhodnutí: [[Rozhodnutí#Fáze 1]]
