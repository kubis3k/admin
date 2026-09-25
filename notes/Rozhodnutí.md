---
tags: [gastro-admin, adr]
---
# Rozhodnutí

Zpět: [[gastro-admin]] · Append-only — starší rozhodnutí se nepřepisují, jen doplňují.

## Obecné
- **Next 15.0.0 → ^15.5** — 15.0.0 nejde nainstalovat s React 19 stable; oprava CVE-2025-29927 (obejití middleware); `forbidden()` pro skutečné 403 (`experimental.authInterrupts`).
- **Žádný middleware** — přístup kontroluje každá page/action přes `requireSiteAccess` (Data Access Layer).
- **Migrace od baseline** — `0000_baseline` = původní tabulky; DB vytvořená přes `push` si 0000 označí jako aplikovanou.

## Fáze 1
- Nodemailer provider (libovolné SMTP), database sessions.
- **Bez self-registrace** — odkaz jen pro e-mail existující v `users`; u neznámého se tiše nepošle nic (žádná enumerace).
- Neexistující web = 403, ne 404 (žádná enumerace webů).
- Staff smí i **mazat položky** (zadání neřešilo) — změna = 1 řádek v `deleteItem`.
- E-maily v `users` jen lowercase (CHECK v DB).
- Vědomě neřešeno: timing enumerace (odeslání mailu trvá déle).
- Slug `login` je zastíněn `/admin/login` → rezervovat ve [[gastro-admin|Fázi 6]].

## Fáze 2
- `weekday` 0 = pondělí (český týden), ne JS `getDay()`.
- 1 okno za den (`unique(site_id, weekday)`); přes půlnoc = `closesAt < opensAt`.
- **Týdenní rozvrh = owner, výjimky = staff** (nemoc, akce jsou provozní věc).
- Server actions kontrolují modulový flag (`requireModule`) — platí i zpětně pro menu.
- Zapínání modulů nedává ownerovi — je to rozhodnutí provozovatele (Fáze 6).
- Veřejné API vrací 14 dní dopředu už spočítaných (klientský web nemusí nic počítat).

## Fáze 3
- `date` (datum) + volitelný `start_time`, místní čas Prahy — stejně jako otevírací doba.
- Staff smí eventy vytvářet, upravovat, publikovat i mazat.
- Veřejné API: jen publikované od dneška; `?all=1` i minulé.
- `imageUrl` zatím jen text s validací `http(s)` — upload ve Fázi 4.
- Neplatný vstup → obecná error stránka (`admin/[site]/error.tsx`); vracení chyb do formuláře (`useActionState`) je dluh pro všechny moduly.

## Fáze 5
- Nový modulový flag `modules.content`; existující weby bez klíče = vypnuto.
- Owner zakládá a maže stránky (struktura webu), staff upravuje text.
- API vrací surový markdown — sanitizace při vykreslení je na klientském webu (zdokumentováno v README).
- `createPage` přes `ON CONFLICT DO NOTHING` — souběžné založení nespadne na unique constraint.
- Fáze 4 odložena: potřebuje Vercel Blob store + `BLOB_READ_WRITE_TOKEN` od uživatele.

## Fáze 4
- Upload přes server action + `put()` (ne klientský upload) — jednodušší, stačí pro obrázky do 4 MB.
- SVG zakázané (může obsahovat skript), typ podle `file.type` + Blob ukládá s `contentType: image/*`.
- Blob mazat jen pro naši doménu; chyba mazání nesmí shodit akci.
- `serverActions.bodySizeLimit = "5mb"` globálně — jiné akce velká data nepřijímají.
- Blob store nešlo založit přes Vercel MCP (403, chybí oprávnění) → zakládá uživatel.

## Fáze 6
- **Superadmin = `users.is_superadmin`, ne hodnota v `site_role`** (odchylka od ROADMAP): role v enumu je vázaná na web (membership) — superadmin by potřeboval membership na každém webu včetně těch, které teprve zakládá. Globální oprávnění ≠ role na webu.
- První superadmin vzniká ručním SQL (stejný model jako ostatní účty); v UI nejde nikoho povýšit.
- Superadmin v `requireSiteAccess` = efektivní owner na každém existujícím webu; `requireModule` platí i pro něj.
- Založení webu = jedna transakce (`db.batch`), mail až po uložení; selhání mailu nic nevrací zpět.
- E-mail s `,` / `;` odmítnut — Auth.js by ho ořízl a vznikl by účet, na který odkaz nedojde.
- Úprava modulů existujícího webu zatím jen SQL (rozhodnutí provozovatele) → budoucí `/admin/[site]/settings` jen pro superadmina.

## Fáze 7
- **Nález:** „60s cache" veřejného API z Fáze 0 nikdy nefungovala (routy byly dynamické) → zavedena skutečná cache přes `unstable_cache` s tagy `gastro:<slug>:<modul>`.
- Invalidace tagem (`revalidateTag`) místo `revalidatePath` — jeden tag pokryje modul včetně podstránek obsahu.
- Webhook podepsaný HMAC-SHA256 nad `${ts}.${body}` s tolerancí 300 s (ochrana proti replay); odesílá se přes `after()`, admin nečeká; bez retry — záloha je `revalidate` klienta.
- Webhook URL nastavuje jen provozovatel (SQL) → SSRF riziko akceptováno; produkce jen `https`.
- „Dnes" se počítá mimo cache, aby data nezastarala přes půlnoc.
