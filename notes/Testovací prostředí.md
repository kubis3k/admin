---
tags: [gastro-admin, dev]
---
# Testovací prostředí

Zpět: [[gastro-admin]]

## Neon
- Projekt **gastro-admin** — `dawn-cell-01812144`, region aws-eu-central-1
- Connection string + `AUTH_SECRET` jsou v `.env.local` (gitignored — nikdy necommitovat)
- Migrace: `npm run db:migrate` (aplikováno 0000–0002)

## Testovací data
| Web | Moduly |
|---|---|
| `bistro` (Bistro Test) | menu, hours |
| `jiny-web` (Jiny Web) | menu — slouží k testům IDOR napříč weby |

| Účet | Role |
|---|---|
| `owner@test.cz` | owner na `bistro` |
| `staff@test.cz` | staff na `bistro` |
| `nikdo@test.cz` | bez membership (test 403) |
| `super@test.cz` | **superadmin** (`is_superadmin = true`) |
| `novy.owner@test.cz` | owner na `pizzerie-u-mostu` (vytvořeno onboardingem) |

## Přihlášení v devu
Bez `EMAIL_SERVER` se magic link neposílá, jen vypíše do konzole dev serveru:
`[dev] přihlašovací odkaz pro …` → otevřít v prohlížeči.

## Pozor
- **Nespouštět `next build` při běžícím `next dev`** — sdílí `.next/`, dev server se rozbije (falešné chyby `EMAIL_SERVER`, chybějící chunk). Oprava: zastavit dev, `rm -rf .next`, spustit znovu.
- ID server actions se po restartu / novém buildu mění — pro podvržený POST vždy vzít aktuální ID ze stránky.

## Test obejití UI (podvržený POST)
Argumenty server actions z `.bind()` jsou ve formuláři jako JSON (`$ACTION_n:1`). Test práv = zkopírovat ID akce z owner stránky a poslat POST ze staff session s `FormData` (`$ACTION_REF_1`, `$ACTION_1:0`, `$ACTION_1:1`). Kontrolní test (owner smaže vlastní záznam) ověří, že POST akci opravdu spouští.
