
## Kdy se aktivuje
- Explicitně: příkaz `/flow <úkol>`.
- Automaticky: u úkolů, které zjevně spadají do T2+ (viz triáž níže), navrhni
  uživateli spuštění flow režimu.

## Zlaté pravidlo tokenů
Nejlevnější subagent je ten, který se nespawnul. Spawn má smysl jen když:
1. úloha zaplní hlavní kontext balastem (průzkum mnoha souborů), NEBO
2. úlohu zvládne levnější model (routing na haiku), NEBO
3. potřebuješ čistý pohled (review bez zatížení kontextem implementace).
Jinak pracuj v hlavní session.

## Triáž náročnosti → tým a modely
| Tier | Úloha | Tým | Modely |
|------|-------|-----|--------|
| T0 | trivialita, 1 soubor | nikdo (main) | — |
| T1 | malá změna, známý kód | coder (+critic u rizika) | sonnet (+sonnet) |
| T2 | více souborů / průzkum | scout → coder → critic | haiku → sonnet → sonnet |
| T3 | feature / neznámý kód | scout → architect → coder → critic → scribe | haiku → opus → sonnet → sonnet → haiku |
| T4 | jádro / bezpečnost / migrace | jako T3, ale architect schvaluje plán před kódem a review běží na opus | opus-heavy |

Mozek smí tier přehodnotit za běhu (eskalace T1→T2 když se ukáže složitost),
ale vždy to oznámí jednou větou.

## Protokol sdílené paměti
- Jediný zdroj pravdy: `.claude/state/flow-state.md` (šablona v /flow příkazu).
- Každý agent na začátku ČTE stav, na konci vrací blok k zápisu; zápis dělá
  mozek nebo scribe (ne každý agent sám → žádné konflikty).
- Checkpoint (soubor + řádek + další krok) se aktualizuje po KAŽDÉM běhu.
  Díky němu nový prompt navazuje bez opakovaného průzkumu.
- Scribe drží stav pod 150 řádky — dlouhá paměť je drahá paměť.

## Komunikace agentů
Subagenti spolu nemluví přímo (limit Claude Code) — "komunikují" přes
flow-state.md a přes mozek. Mozek předává mezi agenty jen kondenzované
výstupy, nikdy surové transkripty.

## Effort / thinking
Subagenti dědí extended thinking z hlavní session (nejde nastavit per agent).
Praktické řízení effortu:
- T0–T2: thinking vypnutý / normální session.
- T3–T4: zapni thinking v hlavní session před `/flow` (např. slovem "think hard"
  v promptu) — zdědí ho architect i critic.

---

