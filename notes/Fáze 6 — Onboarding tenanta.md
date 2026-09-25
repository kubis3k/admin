---
tags: [gastro-admin, faze]
stav: hotovo
---
# Fáze 6 — Onboarding tenanta

Zpět: [[gastro-admin]] · Předchozí: [[Fáze 5 — Textový obsah]] · Závisí na: [[Fáze 1 — Auth & role]]

## Co vzniklo
- `users.is_superadmin` + CHECK formátu slugu na `sites` — migrace `0006_superadmin`
- `src/lib/sites.ts` (+ testy) — `validateSlug`, rezervované slugy, `normalizeEmail`, `parseModules`
- `src/lib/auth.ts` — `isSuperadmin()` (čte DB, `cache()` per request), `requireSuperadmin()`; `requireSiteAccess` pustí superadmina na každý existující web s efektivní rolí owner
- `/admin/new-site` — formulář (název, slug, e-mail ownera, moduly), chyby přímo ve formuláři (`useActionState`)
- Rozcestník `/admin`: superadmin vidí všechny weby + „+ Nový web"

## Jak funguje založení webu
1. Validace na serveru (slug, název, e-mail, moduly)
2. Jedna transakce `db.batch`: web + (nový user, pokud e-mail neexistuje) + membership `owner`
3. Až po uložení magic link ownerovi (`signIn(..., { redirect: false, redirectTo: "/admin" })`) — session superadmina se nemění
4. Když mail selže, web zůstává; owner si odkaz vyžádá na `/admin/login`

## Pravidla
- Slug: `a-z`, `0-9`, `-`, 1–40 znaků, nezačíná/nekončí pomlčkou
- Rezervované: `login`, `new-site`, `new`, `admin`, `api`, `auth`, `settings` (statické routy pod `/admin` by web zastínily)
- Superadmin = `users.is_superadmin` (**odchylka od ROADMAP** — ne hodnota v role enumu, viz [[Rozhodnutí#Fáze 6]])
- Vypnutý modul je vypnutý i pro superadmina

## Jak udělat superadmina
```sql
INSERT INTO users (email) VALUES ('ja@example.com');   -- pokud ještě neexistuje, lowercase
UPDATE users SET is_superadmin = true WHERE email = 'ja@example.com';
```

## E2E ověření (Neon, 2026-09-25)
- ✅ owner: `/admin/new-site` 403, vidí jen svůj web, žádný odkaz „Nový web"
- ✅ superadmin: vidí všechny weby, přístup bez membership; vypnutý modul zůstává vypnutý; neexistující web 403
- ✅ validace: rezervovaný (`login`, `new-site`), velká písmena, pomlčka na kraji, 41 znaků, duplicitní slug, e-mail s uvozovkou → čitelná chyba ve formuláři
- ✅ nový owner: `  Novy.Owner@Test.CZ ` → `novy.owner@test.cz`, magic link s `callbackUrl=/admin`, superadmin zůstal přihlášený
- ✅ existující uživatel jako owner → jen nový membership, žádný duplicitní účet
- ✅ 3 souběžná založení stejného slugu → právě 1 web
- ✅ nový owner se přihlásí odkazem z mailu → vidí jen svůj web a zapnuté moduly
- Critic (opus): APPROVE; P3 opraveny — čárka/středník v e-mailu (Auth.js by e-mail ořízl → fantomový účet), hláška délky slugu 1–40

## Mimo scope / další krok
- UI pro změnu modulů existujícího webu (zatím SQL) — návrh: `/admin/[site]/settings` jen pro superadmina
- Audit log akcí superadmina
