# gastro-admin — scaffold

Startovní kostra centralizovaného admin portálu pro gastro weby.
Postavená podle plánu: multi-tenant přes `sites` tabulku, moduly
zapínané per site (`sites.modules`), první implementovaný modul = **menu**.

## Struktura

```
src/
  db/
    schema.ts       — sites, menu_categories, menu_items
    index.ts        — Drizzle klient napojený na Neon
  lib/
    auth.ts         — DOČASNÝ auth stub (cookie token), TODO Auth.js v5
  app/
    api/public/[site]/menu/route.ts   — veřejné API pro klientské weby
    admin/[site]/menu/
      page.tsx      — admin UI (kategorie, položky, dostupnost)
      actions.ts    — server actions (create/update/delete)
```

## Jak spustit

```bash
npm install
cp .env.example .env.local   # doplň DATABASE_URL z Neon
npm run db:generate           # vygeneruje SQL migraci ze schema.ts
npm run db:migrate            # aplikuje migraci na Neon DB
npm run dev
```

Testovací tenant si vytvoř ručně přes `db:studio` (nebo napiš seed script) —
vlož řádek do `sites` s `modules: { menu: true, hours: false, events: false, gallery: false }`.

## Co je hotové

- Schéma pro `sites` (tenant) + modulové flagy
- Kompletní menu modul: kategorie, položky, cena v halířích, alergeny, dostupnost
- Veřejné API (`/api/public/[site]/menu`) s 60s cache
- Admin UI s CRUD operacemi přes server actions

## Co záměrně chybí (TODO, další fáze)

- **Auth.js v5 + role** — teď je tam jen cookie token na celý systém, ne per-site role
  (owner/staff). `src/lib/auth.ts` je napsaný tak, aby výměna nezasáhla admin stránky.
- **Onboarding nového tenanta** — zatím se site vytváří ručně v DB
- **Ostatní moduly** — otevírací doba, eventy, galerie, textový obsah (stejný vzor
  jako menu: tabulka + server actions + admin page + veřejné API)
- **On-demand revalidace** — teď čeká na vypršení 60s cache; při uložení v adminu
  by šlo rovnou zavolat `revalidateTag()` na klientský web
- **Upload obrázků** — `imageUrl` je teď jen text pole, chybí napojení na Vercel Blob/R2

## Poznámka k ADMI/Strikeland

Až se ADMI/Strikeland vrátí do hry, jejich `sites.modules.menu` zůstane `false`
(drží ChoiceQR) — zapneš jim jen ostatní moduly, až budou hotové.
