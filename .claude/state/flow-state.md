# FLOW STATE
## Aktuální úkol
- cíl: Fáze 1 z ROADMAP.md — Auth.js v5 (magic link) + users + site_memberships + requireSiteAccess(siteSlug, minRole)
- tier: T4
- status: done
## Kde jsme skončili (checkpoint)
- poslední dokončený krok: Fáze 1 ověřena E2E proti Neon (projekt gastro-admin / dawn-cell-01812144, eu-central-1): 403 bez membership + neexistující site, žádná self-registrace, token jednorázový, staff upraví položku, staff (podvržený POST) nesmaže kategorii, owner smaže, IDOR na cizí site no-op, CHECK lowercase; přidán rozcestník /admin; commitnuto lokálně
- rozpracovaný soubor + řádek: —
- další krok: push do kubis3k/admin (na pokyn uživatele) → Fáze 2 (hodiny)
## Mapa poznání (co víme o codebase)
- src/db/schema.ts: sites, menu_categories, menu_items (beze změny) + users, accounts, sessions, verification_tokens (Auth.js/@auth/drizzle-adapter Postgres schéma, snake_case sloupce) + siteRole enum("owner","staff") + site_memberships (composite PK user_id+site_id, index na site_id); relations rozšířené o memberships
- src/db/index.ts: drizzle neon-http, export db (se schema)
- src/auth.ts (NOVÝ): NextAuth v5, DrizzleAdapter, session strategy "database", Nodemailer provider s vlastní sendVerificationRequest (tichý skip pro neexistující e-mail, dev fallback console.log bez EMAIL_SERVER), callbacks.signIn ověřuje existenci usera; pages → /admin/login
- src/lib/auth.ts: requireSiteAccess(siteSlug, minRole) — auth() → redirect /admin/login pokud bez session; 1 dotaz innerJoin site_memberships+sites; forbidden() při chybějícím řádku nebo nedostatečné roli; hasRole() pro UI; ROLE_RANK staff=1 owner=2
- src/app/admin/[site]/menu/actions.ts: createCategory/deleteCategory = "owner"; createItem/updateItem/toggleAvailability/deleteItem = "staff"; itemsOfSite(siteId) subquery pro ownership check přes inArray (oprava IDOR)
- src/app/admin/[site]/menu/page.tsx: requireSiteAccess místo vlastního findFirst; isOwner = hasRole(role,"owner") řídí zobrazení kategorie formulářů; přidán inline update formulář pro název+cenu položky
- src/app/admin/login/page.tsx (NOVÝ): server component, signIn("nodemailer")/signOut inline server actions, safeCallbackUrl() proti open redirectu
- src/app/api/auth/[...nextauth]/route.ts (NOVÝ): export GET/POST z handlers
- src/app/admin/page.tsx (NOVÝ): rozcestník po přihlášení — seznam webů z memberships
- src/app/layout.tsx (NOVÝ): minimální root layout, html lang="cs"
- src/app/forbidden.tsx (NOVÝ): 403 stránka + odkaz na /admin/login
- next.config.ts (NOVÝ): experimental.authInterrupts = true
- src/app/api/public/[site]/menu/route.ts: veřejné API, beze změny
- drizzle.config.ts: out ./src/db/migrations
- src/auth.ts: `next build` (NODE_ENV=production) vyžaduje EMAIL_SERVER — záměrný fail-fast; v devu bez něj placeholder + odkaz do konzole
## Rozhodnutí (append-only)
- [2026-09-24] next 15.0.0 → ^15.5: 15.0.0 nejde nainstalovat s react 19 stable; + CVE-2025-29927; + forbidden() pro skutečné 403
- [2026-09-24] 0000_baseline = stávající tabulky, auth tabulky jdou do 0001 (DB vytvořená přes push si 0000 označí jako aplikovanou)
- [2026-09-24] Auth.js: Nodemailer provider (libovolné SMTP), DrizzleAdapter, database sessions; + accounts/sessions/verification_tokens (adapter je vyžaduje), users navíc emailVerified+image
- [2026-09-24] Bez self-registrace: magic link jen pro e-mail existující v users (tichý skip → žádná enumerace)
- [2026-09-24] 403 přes forbidden() (experimental.authInterrupts); bez session → redirect /admin/login; neexistující site = 403 (ne 404)
- [2026-09-24] Práva: staff = položky (create/update/toggle/delete) + zobrazení; owner = navíc kategorie (create/delete) a budoucí nastavení site
- [2026-09-24] Každá akce ověřuje, že item/category patří do site z requireSiteAccess (oprava IDOR napříč sites)
- [2026-09-24] Žádný middleware — kontrola v page/action (Data Access Layer vzor)
- [2026-09-24] Rozcestník /admin — po loginu bez callbackUrl bylo 404
- [2026-09-24] Timing enumerace (await SMTP jen pro existující účet) vědomě neřešena — P3, fire-and-forget na serverless riskuje neodeslaný mail
## Otevřené otázky / blokery
- slug "login" je zastíněn /admin/login → rezervovat ve Fázi 6 (validace slugu)
