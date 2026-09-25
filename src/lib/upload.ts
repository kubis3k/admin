// ---------------------------------------------------------------------------
// Čistá logika pro validaci nahrávaných obrázků — žádné importy z "@/…",
// žádný přístup k DB ani k Vercel Blob (viz ./blob.ts pro I/O).
// ---------------------------------------------------------------------------

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

// Limit vychází z limitu těla server action/API route (4,5 MB) — necháváme
// rezervu pro zbytek multipart formuláře.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type FileLike = { type: string; size: number };

export type ImageValidationResult =
  | { ok: true; ext: string }
  | { ok: false; error: string };

export function validateImageFile(file: FileLike): ImageValidationResult {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    return {
      ok: false,
      error: "Nepodporovaný typ souboru (povoleno: JPEG, PNG, WebP, AVIF, GIF)",
    };
  }
  if (file.size <= 0) {
    return { ok: false, error: "Prázdný soubor" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Soubor je příliš velký (max 4 MB)" };
  }
  return { ok: true, ext };
}

// Ověří, že URL patří do naší Vercel Blob storage — jinak nesmíme mazat
// (stará imageUrl u menu položek/eventů může být libovolná externí URL).
export function isOurBlobUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return parsed.hostname.endsWith(".public.blob.vercel-storage.com");
}

export function validateAlt(raw: string): string {
  return raw.trim().slice(0, 300);
}
