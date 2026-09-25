---
name: shadcn-cli-v4-registry
description: shadcn CLI major version jump (now package "shadcn" v4.x) changed init flags and generated component imports
metadata:
  type: project
---

As of 2026-09-25, `npx shadcn@latest` resolves to the "shadcn" package v4.x, which
has a different `init` CLI than older tutorials/plans assume:
- `-b/--base` now takes `radix|base|aria` (component library), not a Tailwind base
  color name like `neutral`. Trying `-b neutral` fails with a validation error.
- The current registry's generated components import `cn` from the standalone
  npm package `"cn"` (shadcn-ui/cn) and Radix primitives from the monolithic
  `"radix-ui"` package — not from `@/lib/utils` + individual `@radix-ui/react-*`
  packages + `clsx`/`tailwind-merge` like the classic convention.
- class-variance-authority and lucide-react are used by generated components but
  are NOT auto-installed as direct deps by `shadcn@latest add` — install them
  explicitly or `tsc`/build will fail on missing modules.

**Why:** A plan/architect step assumed the classic shadcn CLI (`components.json`
with `baseColor`, `@/lib/utils` cn() convention). That workflow still exists but
needs `npx shadcn@2.10.0 init -y -b neutral` (older pinned version) to write a
classic `components.json`. After that, `npx shadcn@latest add ...` (newest CLI)
correctly reads the existing `components.json` and installs components fine —
mixing the two CLI versions this way works and was the practical resolution.

**How to apply:** If a plan expects "baseColor neutral" / `@/lib/utils` cn()
conventions, expect to (1) write globals.css / components.json by hand or via
the pinned `shadcn@2.10.0 init`, (2) let `shadcn@latest add` install actual
components (they'll use `cn`/`radix-ui` packages internally — leave them as-is,
don't refactor vendor-generated ui/* files), and (3) keep a hand-written
`src/lib/utils.ts` (clsx+tailwind-merge cn()) for your OWN components only.
Explicitly `npm i class-variance-authority clsx tailwind-merge lucide-react`
since the CLI won't always add them to package.json even though generated code
imports them.
