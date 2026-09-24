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
- Veřejné API vrací 14 dní dopředu už spočítaných (klientský web nemusí nic počítat).
