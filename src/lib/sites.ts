// ---------------------------------------------------------------------------
// Čistá logika pro onboarding webu (F6) — žádné importy z "@/…", žádný
// přístup k DB. Stejný formát SLUG_RE jako CHECK sites_slug_format v
// src/db/schema.ts — DB je poslední pojistka, tohle je hláška pro uživatele.
// ---------------------------------------------------------------------------

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

// Slugy, které by kolidovaly s existujícími routami pod /admin/<slug>.
export const RESERVED_SLUGS = [
  "login",
  "new-site",
  "new",
  "admin",
  "api",
  "auth",
  "settings",
];

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateSlug(s: string): ValidationResult {
  const value = s.trim();
  if (value.length === 0) {
    return { ok: false, error: "Slug je povinný" };
  }
  if (value !== value.toLowerCase()) {
    return { ok: false, error: "Slug smí obsahovat jen malá písmena" };
  }
  if (!SLUG_RE.test(value)) {
    return {
      ok: false,
      error:
        "Slug smí obsahovat jen malá písmena, číslice a pomlčku, nesmí začínat ani končit pomlčkou (1–40 znaků)",
    };
  }
  if (RESERVED_SLUGS.includes(value)) {
    return { ok: false, error: `Slug "${value}" je rezervovaný` };
  }
  return { ok: true, value };
}

export function validateSiteName(s: string): ValidationResult {
  const value = s.trim();
  if (value.length < 1 || value.length > 100) {
    return { ok: false, error: "Název musí mít 1–100 znaků" };
  }
  return { ok: true, value };
}

// Normalizace e-mailu podle stejných pravidel, jaké Auth.js/DB očekávají
// (users_email_lowercase check v src/db/schema.ts).
export function normalizeEmail(s: string): ValidationResult {
  const trimmed = s.trim().normalize("NFKC");
  if (trimmed.length === 0) {
    return { ok: false, error: "E-mail je povinný" };
  }
  if (trimmed.length > 254) {
    return { ok: false, error: "E-mail je příliš dlouhý" };
  }
  if (/\s/.test(trimmed) || /["<>,;]/.test(trimmed)) {
    return { ok: false, error: "E-mail obsahuje nepovolené znaky" };
  }
  const parts = trimmed.split("@");
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    return { ok: false, error: "Neplatný formát e-mailu" };
  }
  return { ok: true, value: trimmed.toLowerCase() };
}

export const MODULE_KEYS = [
  "menu",
  "hours",
  "events",
  "gallery",
  "content",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
export type Modules = Record<ModuleKey, boolean>;

export function parseModules(formData: FormData): Modules {
  const result = {} as Modules;
  for (const key of MODULE_KEYS) {
    result[key] = formData.get(key) === "on";
  }
  return result;
}
