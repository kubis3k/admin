# gastro-admin — scaffold

Startovní kostra centralizovaného admin portálu pro gastro weby.
Postavená podle plánu: multi-tenant přes `sites` tabulku, moduly
zapínané per site (`sites.modules`), první implementovaný modul = **menu**.

## UI

Admin je postavený na **Tailwind CSS v4 + shadcn/ui** (Radix), světlý i tmavý režim
(`next-themes`, přepínač v hlavičce), font Geist, toasty `sonner`.

- `src/app/admin/(app)/layout.tsx` — sdílený shell: postranní navigace (web → moduly,
  superadmin navíc Nastavení a Nový web), na mobilu jako vysouvací panel. Route group
  `(app)` URL nemění; login je mimo.
- Server actions vrací `ActionResult` (`src/lib/action-result.ts`) místo vyhazování
  výjimek — validační chyby se zobrazí přímo u polí (`<FieldInput>`, `<FieldError>`),
  úspěch jako toast. Neočekávané chyby (DB) dál končí na `error.tsx`.
- Sdílené komponenty v `src/components/admin/`: `ActionForm` (useActionState, zachová
  vstup při chybě), `SubmitButton`, `ConfirmDeleteButton` (potvrzovací dialog u každého
  mazání), `PageHeader`, `ThemeToggle`, `AppSidebar`/`AppShell`.
- shadcn komponenty v `src/components/ui/` (generované CLI, `components.json`).

## Struktura

```
src/
  db/
    schema.ts       — sites, menu_categories, menu_items, opening_hours, opening_hour_exceptions
    index.ts        — Drizzle klient napojený na Neon
  lib/
    auth.ts         — requireSiteAccess(siteSlug, minRole) — kontrola role per site
    hours.ts        — čistá logika otevírací doby (computeEffectiveSchedule, bez DB)
    events.ts       — čistá logika validace eventů (validateEventInput, bez DB)
    content.ts      — čistá logika textového obsahu (isValidPageKey, validateContent, bez DB)
    upload.ts       — čistá logika validace obrázků (validateImageFile, isOurBlobUrl, bez DB/Blob)
    blob.ts         — I/O nad Vercel Blob (uploadImage, deleteImageIfOurs)
    sites.ts        — čistá logika onboardingu (validateSlug, validateSiteName, normalizeEmail, parseModules, bez DB)
    webhook.ts      — čistá logika on-demand revalidace (tag, validace URL, podpis/ověření, bez DB)
    revalidate.ts   — notifySiteChange(site, module, opts?) — revalidateTag + podepsaný webhook přes after()
    public-data.ts  — serverová cache veřejného API (unstable_cache po modulech, tag gastro:<slug>:<modul>, 60s)
  auth.ts           — Auth.js v5 (magic link přes e-mail, database sessions)
  app/
    api/auth/[...nextauth]/route.ts   — Auth.js handlers
    api/public/[site]/menu/route.ts   — veřejné API pro klientské weby
    api/public/[site]/hours/route.ts  — veřejné API otevírací doby (14 dní dopředu)
    api/public/[site]/events/route.ts — veřejné API eventů (jen publikované)
    api/public/[site]/content/route.ts           — veřejné API, seznam stránek (pageKey, updatedAt)
    api/public/[site]/content/[pageKey]/route.ts — veřejné API, obsah jedné stránky (surový markdown)
    api/public/[site]/gallery/route.ts           — veřejné API galerie (id, url, alt)
    admin/login/page.tsx              — přihlašovací stránka (magic link)
    admin/(app)/[site]/menu/
      page.tsx      — admin UI (kategorie, položky, dostupnost)
      actions.ts    — server actions (create/update/delete)
    admin/(app)/[site]/hours/
      page.tsx      — admin UI (týdenní rozvrh, výjimky)
      actions.ts    — server actions (setWeekday, upsertException, deleteException)
    admin/(app)/[site]/events/
      page.tsx      — admin UI (nadcházející/proběhlé eventy, publikace)
      actions.ts    — server actions (createEvent, updateEvent, setPublished, deleteEvent)
    admin/(app)/[site]/content/
      page.tsx      — admin UI (seznam stránek, editace obsahu, založení/smazání)
      actions.ts    — server actions (createPage, savePageContent, deletePage)
    admin/(app)/[site]/gallery/
      page.tsx      — admin UI (upload, mřížka obrázků, alt, pořadí, smazání)
      actions.ts    — server actions (uploadGalleryImage, updateAlt, moveImage, deleteGalleryImage)
    admin/(app)/new-site/
      page.tsx      — admin UI, jen pro superadmina (requireSuperadmin)
      form.tsx      — klientský formulář (useActionState)
      actions.ts    — server action createSite (validace, insert site+user+membership, magic link)
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
vlož řádek do `sites` s `modules: { menu: true, hours: false, events: false, gallery: false, content: false }`.
Modul textového obsahu se zapíná nastavením `modules.content = true`.
Modul galerie (a upload obrázků k menu položkám) se zapíná `modules.gallery = true`
a vyžaduje `BLOB_READ_WRITE_TOKEN` (viz `.env.example`) — bez něj upload
hlásí chybu, zbytek appky funguje beze změny.

> **Pro klientské weby:** `/api/public/[site]/content/[pageKey]` vrací **surový
> markdown bez sanitizace** — může obsahovat i HTML (`<script>`…). Vykreslujte ho
> s vypnutým HTML nebo přes sanitizér (např. `react-markdown` bez `rehype-raw`,
> případně `marked` + `DOMPurify`).

## Co je hotové

- Schéma pro `sites` (tenant) + modulové flagy
- Kompletní menu modul: kategorie, položky, cena v halířích, alergeny, dostupnost
- Modul otevírací doby: týdenní rozvrh (1 okno/den) + jednorázové výjimky
  (svátek, akce, nemoc) — výjimka přebíjí rozvrh; `weekday` 0 = pondělí
- Modul eventů: jednorázové akce (název, datum, čas, popis, obrázek jako URL,
  publikace) — bez RSVP/kapacity/opakování (mimo scope)
- Modul textového obsahu: stránky identifikované klíčem (`page_key`,
  `/^[a-z0-9-]{1,50}$/`), obsah v Markdownu (max 50 000 znaků), owner
  zakládá/maže stránky, staff edituje obsah — bez rich-text editoru,
  náhledu markdownu a verzování (mimo scope)
- Modul galerie: upload obrázků přes Vercel Blob (max 4 MB, JPEG/PNG/WebP/AVIF/GIF),
  alt text, ruční řazení (↑/↓), smazání (i z Blob storage) — bez komprese/resize,
  drag&drop a klientského (direct) uploadu (mimo scope F4)
- Upload obrázku i pro jednotlivé menu položky (nahrazuje textové `imageUrl`,
  stará hodnota z Blob storage se smaže; externí URL se nemažou)
- Veřejná API (`/api/public/[site]/menu`, `/api/public/[site]/hours`,
  `/api/public/[site]/events`, `/api/public/[site]/content`,
  `/api/public/[site]/gallery`) se serverovou cache (`unstable_cache`, max
  60 s, okamžitá invalidace tagem po uložení v adminu — viz `public-data.ts`)
- Admin UI s CRUD operacemi přes server actions
- Onboarding nového tenanta: superadmin (`users.is_superadmin`) založí web
  přes `/admin/new-site` (název, slug, e-mail ownera, moduly) — vznikne
  `sites` + `users` (pokud e-mail ještě neexistuje) + `site_memberships` s
  rolí owner, následně se pošle magic link na zadaný e-mail; úprava modulů
  po vytvoření webu zatím jen ručně v DB (mimo scope F6)
- On-demand revalidace: každá mutační server akce okamžitě invaliduje cache
  vlastního veřejného API (`revalidateTag`) a pokud má web nastavený webhook,
  pošle podepsané upozornění na klientský web, viz níže

## Co záměrně chybí (TODO, další fáze)

- **Úprava modulů po vytvoření webu** — zatím jen ručně v DB (SQL), bez UI
- **Reset hesla** — bez hesel vůbec (jen magic link), mimo scope
- **RSVP/kapacita a opakující se eventy** — mimo scope modulu eventů (F3)
- **Komprese/resize obrázků, drag&drop, klientský (direct) upload** — mimo scope
  modulu galerie (F4), upload je jen přes `<input type="file">`
- **Upload obrázku k eventům** — `events.imageUrl` zůstává jen text pole (URL)

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

## Superadmin

Superadmin může zakládat nové weby (`/admin/new-site`) — globální oprávnění
napříč všemi weby, nesouvisí s per-site rolí owner/staff. Nastavuje se ručně
v DB (uživatel musí nejdřív existovat):

```sql
-- e-mail vždy malými písmeny (hlídá to CHECK constraint)
INSERT INTO users (email) VALUES ('jmeno@example.com')
  ON CONFLICT (email) DO NOTHING;
UPDATE users SET is_superadmin = true WHERE email = 'jmeno@example.com';
```

Superadmin má také automaticky přístup (jako owner) na jakýkoli existující
web, i bez `site_memberships` řádku (viz `requireSiteAccess` v `src/lib/auth.ts`).

Nastavení konkrétního webu (název, zapnuté moduly, webhook URL, rotace
webhook secretu, testovací webhook) je přes UI na `/admin/<slug>/settings`
(jen pro superadmina). Secret se po vygenerování/rotaci zobrazí přesně
jednou — pokud si ho provozovatel nezkopíruje, musí ho vygenerovat znovu
(stará hodnota přestane platit). Alternativně jde nastavení upravit i přímo
v DB (viz SQL níže) — UI i SQL zapisují do stejných sloupců.

## On-demand revalidace

Vlastní veřejné API (`/api/public/[site]/[modul]`) je cachované na serveru
přes `unstable_cache` (viz `src/lib/public-data.ts`), tag `gastro:<slug>:<modul>`,
max 60 s. Po každé úspěšné mutaci v adminu (menu, hodiny, eventy, obsah, galerie) se:

1. okamžitě zavolá `revalidateTag()` nad tagem daného webu+modulu — další
   request na vlastní API dostane čerstvá data bez čekání na 60s cache;
2. pokud má web nastavený `webhook_url` + `webhook_secret`, pošle se (mimo request/
   response cyklus, přes `after()`) podepsaný POST požadavek na klientský web —
   ten si podle tagu sám zavolá `revalidateTag()`.

Bez nastaveného webhooku klientský web dál funguje beze změny — jen se spoléhá
na svou vlastní 60s/1h cache místo okamžité revalidace.

### Nastavení webhooku pro web

Webhook nastavuje provozovatel přes `/admin/<slug>/settings` (viz sekce
Superadmin výše), nebo ručně v DB:

```sql
UPDATE sites
SET webhook_url = 'https://klient.cz/api/revalidate',
    webhook_secret = '<openssl rand -hex 32>'
WHERE slug = 'nazev-webu';
```

`webhook_url` musí být `https://` (v produkci), `http://localhost`/`http://127.0.0.1`
je povolené jen pro lokální vývoj klientského webu.

### Formát požadavku na klientský web

```
POST <webhook_url>
Content-Type: application/json
X-Gastro-Timestamp: <unix čas v sekundách>
X-Gastro-Signature: sha256=<hex HMAC-SHA256 nad "{timestamp}.{tělo}", klíč = webhook_secret>

{"site":"nazev-webu","module":"menu","tags":["gastro:nazev-webu:menu"],"pageKey":null,"ts":1234567890}
```

`tags` obsahuje `gastro:<slug>:<modul>` — tag, který si klientský web přihlásí
u svých `fetch()` volání přes `next: { tags: [...] }`. Timeout požadavku 5 s,
bez retry (při výpadku klientský web spadne zpátky na svou vlastní cache).

### Kompletní snippet pro klientský Next.js web

`app/api/revalidate/route.ts` — ověření podpisu a revalidace tagů:

```ts
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createHmac, timingSafeEqual } from "node:crypto";

const WEBHOOK_SECRET = process.env.GASTRO_WEBHOOK_SECRET!;
const TOLERANCE_SEC = 300;

export async function POST(req: Request) {
  const rawBody = await req.text();
  const timestamp = Number(req.headers.get("X-Gastro-Timestamp"));
  const signature = req.headers.get("X-Gastro-Signature") ?? "";

  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SEC) {
    return NextResponse.json({ error: "Neplatný timestamp" }, { status: 401 });
  }

  const expected =
    "sha256=" +
    createHmac("sha256", WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  const valid =
    expectedBuf.length === actualBuf.length &&
    timingSafeEqual(expectedBuf, actualBuf);

  if (!valid) {
    return NextResponse.json({ error: "Neplatný podpis" }, { status: 401 });
  }

  const { tags } = JSON.parse(rawBody) as { tags: string[] };
  for (const tag of tags) revalidateTag(tag);

  return NextResponse.json({ revalidated: true });
}
```

Fetch dat s tagem (v libovolné komponentě klientského webu):

```ts
const res = await fetch("https://admin.tvuj-web.cz/api/public/nazev-webu/menu", {
  next: { tags: ["gastro:nazev-webu:menu"], revalidate: 3600 },
});
```

## Poznámka k ADMI/Strikeland

Až se ADMI/Strikeland vrátí do hry, jejich `sites.modules.menu` zůstane `false`
(drží ChoiceQR) — zapneš jim jen ostatní moduly, až budou hotové.
