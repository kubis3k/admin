# gastro-admin — scaffold

Startovní kostra centralizovaného admin portálu pro gastro weby.
Postavená podle plánu: multi-tenant přes `sites` tabulku, moduly
zapínané per site (`sites.modules`), první implementovaný modul = **menu**.

## Struktura

```
src/
  db/
    schema.ts       — sites, menu_categories, menu_items, opening_hours, opening_hour_exceptions
    index.ts        — Drizzle klient napojený na Neon
  lib/
    auth.ts         — requireSiteAccess(siteSlug, minRole) — kontrola role per site
    hours.ts        — čistá logika otevírací doby (computeEffectiveSchedule, bez DB)
  auth.ts           — Auth.js v5 (magic link přes e-mail, database sessions)
  app/
    api/auth/[...nextauth]/route.ts   — Auth.js handlers
    api/public/[site]/menu/route.ts   — veřejné API pro klientské weby
    api/public/[site]/hours/route.ts  — veřejné API otevírací doby (14 dní dopředu)
    admin/login/page.tsx              — přihlašovací stránka (magic link)
    admin/[site]/menu/
      page.tsx      — admin UI (kategorie, položky, dostupnost)
      actions.ts    — server actions (create/update/delete)
    admin/[site]/hours/
      page.tsx      — admin UI (týdenní rozvrh, výjimky)
      actions.ts    — server actions (setWeekday, upsertException, deleteException)
```

## Jak spustit

```bash
npm install
cp .env.example .env.local   # doplň DATABASE_URL z Neon
npm run db:generate           # vygeneruje SQL migraci ze schema.ts
npm run db:migrate            # aplikuje migraci na Neon DB
npm run dev
npm test                      # spustí unit testy (vitest)
```

Testovací tenant si vytvoř ručně přes `db:studio` (nebo napiš seed script) —
vlož řádek do `sites` s `modules: { menu: true, hours: false, events: false, gallery: false }`.

## Co je hotové

- Schéma pro `sites` (tenant) + modulové flagy
- Kompletní menu modul: kategorie, položky, cena v halířích, alergeny, dostupnost
- Modul otevírací doby: týdenní rozvrh (1 okno/den) + jednorázové výjimky
  (svátek, akce, nemoc) — výjimka přebíjí rozvrh; `weekday` 0 = pondělí
- Veřejná API (`/api/public/[site]/menu`, `/api/public/[site]/hours`) s 60s cache
- Admin UI s CRUD operacemi přes server actions

## Co záměrně chybí (TODO, další fáze)

- **Onboarding nového tenanta** — zatím se site vytváří ručně v DB
- **Superadmin role, reset hesla** — mimo scope, řeší se to per-site rolí owner/staff
- **Ostatní moduly** — eventy, galerie, textový obsah (stejný vzor
  jako menu/otevírací doba: tabulka + server actions + admin page + veřejné API)
- **On-demand revalidace** — teď čeká na vypršení 60s cache; při uložení v adminu
  by šlo rovnou zavolat `revalidateTag()` na klientský web
- **Upload obrázků** — `imageUrl` je teď jen text pole, chybí napojení na Vercel Blob/R2

## Přihlášení

Žádná self-registrace — účet i jeho role na webu se vytváří ručně v DB (přes
`db:studio` nebo SQL insertem):

```sql
-- e-mail vždy malými písmeny (hlídá to CHECK constraint)
INSERT INTO users (email) VALUES ('jmeno@example.com');
INSERT INTO site_memberships (user_id, site_id, role)
VALUES (
  (SELECT id FROM users WHERE email = 'jmeno@example.com'),
  (SELECT id FROM sites WHERE slug = 'nazev-webu'),
  'owner' -- nebo 'staff'
);
```

Přihlášení pak probíhá přes magic link na `/admin/login` — zadá se e-mail a
pokud pro něj existuje účet, přijde odkaz. Bez nastaveného `EMAIL_SERVER`
(mimo produkci) se odkaz místo odeslání jen vypíše do konzole serveru
(`[dev] přihlašovací odkaz pro ...`). V produkci musí být nastavené
`EMAIL_SERVER`, `EMAIL_FROM` a mimo Vercel i `AUTH_URL`.

Migrace: `0000_baseline` = stávající tabulky (sites, menu). Pokud DB vznikla
přes `drizzle-kit push` bez migrací, označ 0000 jako aplikovanou (nebo pusť
jen `0001_auth.sql`), jinak `db:migrate` spadne na existujících tabulkách.

## Poznámka k ADMI/Strikeland

Až se ADMI/Strikeland vrátí do hry, jejich `sites.modules.menu` zůstane `false`
(drží ChoiceQR) — zapneš jim jen ostatní moduly, až budou hotové.
