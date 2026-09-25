---
tags: [gastro-admin, follow-up]
stav: hotovo
---
# Nastavení webu (superadmin)

Zpět: [[gastro-admin]] · Navazuje na: [[Fáze 6 — Onboarding tenanta]], [[Fáze 7 — On-demand revalidace]]

Follow-up mimo ROADMAP — nahrazuje ruční SQL pro moduly a webhook.

## Co vzniklo
- `/admin/[site]/settings` — **jen superadmin** (owner/staff 403); odkaz „Nastavení" v rozcestníku
- Sekce **Web**: název + zapnutí/vypnutí 5 modulů
- Sekce **Webhook**: URL (prázdné = vypnout, smaže i secret), „Vygenerovat nový secret"
- Sekce **Test**: „Odeslat testovací webhook" → výsledek (HTTP status / chyba) v UI
- `deliverWebhook()` v `src/lib/revalidate.ts` — sdílené odeslání (automatické notifikace i test)

## Pravidla
- Změna modulů → okamžitá invalidace cache API všech modulů webu + webhook jen pro **přepnuté** moduly
- Secret: `randomBytes(32)`, v DB čitelně (nutné pro podpis), **celý zobrazen jen jednou** hned po vygenerování; stránka ukazuje jen „nastaven / nenastaven"
- Testovací webhook: `module: "test"`, `tags: []` → klient nic neinvaliduje
- Moduly zapínat jen po domluvě s provozovatelem (ADMI menu přes ChoiceQR)

## Ověření (2026-09-25)
- ✅ owner na nastavení vlastního webu → 403, odkaz nevidí
- ✅ superadmin nastaví URL → vygeneruje se secret, zobrazí se jednou
- ✅ rotace → nový secret v DB; secret není v čerstvě načtené stránce (RSC payload)
- ✅ testovací webhook → přijímač dostal `module: "test"`, UI „OK — odpověď HTTP 200"
- ✅ zapnutí Eventů → API `/events` 404 → 200 okamžitě, webhook s tagem `gastro:…:events`
- 🐛→✅ po rotaci stránka ukazovala i starý (neplatný) secret s „zkopírujte si ho" → skryto
- Critic: APPROVE
