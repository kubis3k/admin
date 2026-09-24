# Roadmapa — gastro-admin

Každá fáze je navržená jako samostatný, uzavřený balík práce, který jde
zadat agentovi zvlášť, bez nutnosti znát budoucí fáze. "Mimo scope" u
každé fáze je záměrně explicitní — agent by se do toho neměl pouštět,
i kdyby to vypadalo jako logický další krok.

## Fáze 0 — Menu modul (HOTOVO)

Základ je v repu: `sites` tabulka s module-toggle, kompletní menu modul
(kategorie, položky, cena, alergeny, dostupnost), veřejné API, admin CRUD.

---

## Fáze 1 — Auth & role

**Proč první**: Teď je admin chráněný jen sdíleným cookie tokenem
(`src/lib/auth.ts`) — kdokoli se znalostí `ADMIN_SESSION_SECRET` má plný
přístup ke všem webům. To je bezpečnostní díra, ne teoretická, a čím víc
modulů přibude, tím dražší bude to řešit dodatečně.

**Zadání pro agenta:**
- Auth.js v5 (`next-auth@beta`) s email/password nebo magic link providerem
- Nová tabulka `users` (id, email, name)
- Nová tabulka `site_memberships` (userId, siteId, role: `owner` | `staff`)
- Middleware/helper `requireSiteAccess(siteSlug, minRole)` nahrazující
  `requireAdmin()` ve všech admin routes a server actions
- `staff` role: může editovat menu položky (název, cena, dostupnost),
  NEsmí mazat kategorie ani měnit nastavení webu
- `owner` role: plný přístup v rámci svého site
- Přihlašovací stránka `/admin/login`

**Mimo scope**: superadmin role napříč všemi sites (to řeší až Fáze 6 —
onboarding), password reset flow (stačí magic link nebo manuální reset v DB).

**Hotovo, když**: uživatel bez záznamu v `site_memberships` pro daný site
dostane 403, `staff` nemůže smazat kategorii, `owner` může.

---

## Fáze 2 — Otevírací doba

**Zadání pro agenta:**
- Tabulky `opening_hours` (siteId, weekday 0-6, opensAt, closesAt) a
  `opening_hour_exceptions` (siteId, date, isClosed, customOpensAt,
  customClosesAt, reason — text pro "Vánoce", "Soukromá akce" apod.)
- Admin stránka `/admin/[site]/hours` — týdenní rozvrh + seznam výjimek
- Veřejné API `/api/public/[site]/hours` vracející efektivní rozvrh
  (exception přebíjí recurring rozvrh pro daný den)
- Modul se řídí stejným `sites.modules.hours` flagem jako menu

**Mimo scope**: časové pásmo jiné než Europe/Prague, víc otevíracích
oken za den (např. zavřeno na obídovou pauzu) — pokud to nebude potřeba,
nekomplikovat datový model předem.

**Hotovo, když**: nastavená výjimka na konkrétní datum přebije běžný
rozvrh ve veřejném API.

---

## Fáze 3 — Eventy / novinky

**Zadání pro agenta:**
- Tabulka `events` (siteId, title, description, date, imageUrl, isPublished)
- Admin CRUD (stejný vzor jako menu — server actions + page.tsx)
- Veřejné API vracející jen `isPublished: true` a řazené podle data

**Mimo scope**: RSVP/kapacita, opakující se eventy.

---

## Fáze 4 — Galerie + upload obrázků

**Proč spolu**: galerie bez uploadu nemá smysl, a jakmile bude upload
hotový, retrofitneme ho i do menu položek (teď mají `imageUrl` jako
prázdné textové pole).

**Zadání pro agenta:**
- Vercel Blob (jednodušší setup než R2, sedí na Vercel hosting)
- Upload endpoint + admin komponenta (drag&drop nebo prostý file input)
- Tabulka `gallery_images` (siteId, url, alt, sortOrder)
- Doplnit upload i do menu item admin formuláře (Fáze 0 dluh)

**Mimo scope**: automatická komprese/resize obrázků (Vercel Blob to
částečně řeší přes `next/image`, netřeba řešit ručně).

---

## Fáze 5 — Textový obsah stránky

**Zadání pro agenta:**
- Tabulka `page_content` (siteId, pageKey — např. "about", "contact",
  content — richtext nebo markdown, updatedAt)
- Jednoduchý textarea editor v adminu (bohatý rich-text editor NENÍ
  potřeba pro MVP — markdown stačí)
- Veřejné API vracející obsah podle `pageKey`

---

## Fáze 6 — Onboarding nového tenanta

**Proč až teď**: dává smysl až když existuje dost modulů, aby bylo co
při onboardingu nastavovat, a vyžaduje hotovou Fázi 1 (role).

**Zadání pro agenta:**
- Superadmin role (napříč sites) — rozšíření role enumu z Fáze 1
- Admin UI `/admin/new-site`: vytvoří `site`, zapne vybrané moduly,
  vytvoří prvního `owner` usera a pošle mu přihlašovací email
- Validace unikátnosti slugu

---

## Fáze 7 — On-demand revalidace

**Zadání pro agenta:**
- Webhook/server action, který po uložení změny v adminu zavolá
  `revalidateTag()` nebo `revalidatePath()` na příslušném klientském webu
- Nahrazuje čekání na vypršení 60s cache z Fáze 0

**Mimo scope**: řešit teď — jde o optimalizaci, ne blokující funkci.
Klientské weby fungují i s 60s cache.

---

## Pořadí shrnutě

`0 (hotovo) → 1 (auth) → 2, 3, 4, 5 (obsahové moduly, libovolné pořadí
mezi sebou) → 6 (onboarding) → 7 (revalidace)`

Fáze 2–5 na sobě navzájem nezávisí — jde je zadávat v libovolném pořadí
nebo paralelně, pokud budeš mít víc agentů běžet najednou.
