---
tags: [gastro-admin, follow-up, ui]
stav: hotovo
---
# UI adminu

Zpět: [[gastro-admin]] · Navazuje na všechny fáze (restyl celého adminu)

## Volby (uživatel)
- **Tailwind v4 + shadcn/ui**, čistý SaaS admin, **světlý + tmavý** režim
- Rozsah: chyby přímo u polí, toasty „Uloženo", potvrzení mazání, login + rozcestník

## Architektura
- **Route group `admin/(app)/`** se sdíleným layoutem (sidebar web → moduly; superadmin Nastavení + Nový web; mobil = vysouvací panel). URL beze změny, login mimo.
- **Kontrakt akcí:** `(…vázanáId, prev, formData) => ActionResult` — validace `fail({ fieldErrors })`, úspěch `ok("…")`, DB chyba dál `throw` → `error.tsx`, `forbidden()`/`redirect` se nikdy nechytá.
- **`ActionForm`** odesílá přes `startTransition` → React 19 by jinak při chybě vymazal, co uživatel napsal; reset jen po úspěchu.
- **`ConfirmDeleteButton`** — toast volaný přímo po dokončení akce (ne přes efekt), jinak by se po smazání řádku neukázal.
- Česká lokalizace: `pluralCs` („1 položka / 2 položky / 5 položek"), `formatDateCs` („st 30. 9. 2026, 18:00").

## Jak to vzniklo (flow)
1. architect (opus) — plán + vlny; mozek schválil s úpravou: paralelní coderi bez `next build` (sdílené `.next`)
2. vlna A (coder) — setup, shell, login, rozcestník, 403, error, new-site
3. vlna B — **3 coderi paralelně**: menu+hours · events+content · gallery+settings
4. critic (**opus**) — obsah všech 27 akcí proti HEAD: autorizace první, role/moduly 1:1, WHERE i `notifySiteChange` beze změny → APPROVE
5. E2E → 2 kola oprav (coder) + drobnosti (mozek)

## Nalezeno při E2E a opraveno
- menu/hours vracely jen obecnou chybu (první problém) → chyby u všech polí + `aria-invalid`
- toast „Smazáno" se nezobrazil (komponenta se odmontovala se smazaným řádkem)
- „1 položek" → správné skloňování
- mobil: položky menu v tabulce s vodorovným scrollem → karty, nejčastější akce (dostupnost) nahoře
- mobil: rozvrh a výjimky přetékaly → akce v buňce, užší pole, důvod pod datem, zalamovací štítek
- otevírací doba: chyběl stav dne → štítek „Otevřeno 10:00–22:00" / „Zavřeno"
- galerie (critic P3): obecná hláška pro chyby mimo validaci; do klienta jen `{id, url, alt}`
- anglický popisek „Toggle Sidebar" → česky

## Ověření (2026-09-25)
- ✅ chyby u polí (hodnoty zůstanou), toast po úspěchu, formulář se vyprázdní
- ✅ mazání: Zrušit nic nesmaže, Smazat smaže + toast
- ✅ světlý / tmavý režim, po reloadu zachován
- ✅ mobil 375 px: vysouvací sidebar, žádná z 8 stránek nepřetéká
- ✅ staff: jen jeho web, bez Nastavení/Nového webu/mazání kategorií; settings 403
- ✅ 403 stránka nastylovaná
- ✅ počty autorizačních volání ve všech akcích shodné s výchozím stavem; `src/app/api/**`, `src/auth.ts`, lib beze změny
- ✅ tsc, 125/125 testů, build
- Pozn.: nový balíček `cn` (utilita shadcn) ověřen — publikuje `shadcn`, bez instalačních skriptů
