// ---------------------------------------------------------------------------
// Čistá logika textového obsahu stránek — žádné importy z "@/…", žádný
// přístup k DB. Obsah je Markdown, žádné HTML se na serveru negeneruje.
// ---------------------------------------------------------------------------

export const PAGE_KEY_RE = /^[a-z0-9-]{1,50}$/;

export const MAX_CONTENT_LENGTH = 50_000;

export function isValidPageKey(s: string): boolean {
  return PAGE_KEY_RE.test(s);
}

export type ContentValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateContent(s: string): ContentValidationResult {
  const normalized = s.replace(/\r\n/g, "\n");
  if (normalized.length > MAX_CONTENT_LENGTH) {
    return {
      ok: false,
      error: `Obsah smí mít nejvýše ${MAX_CONTENT_LENGTH} znaků`,
    };
  }
  return { ok: true, value: normalized };
}
