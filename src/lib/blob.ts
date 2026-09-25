import { put, del } from "@vercel/blob";
import { validateImageFile, isOurBlobUrl } from "./upload";

// ---------------------------------------------------------------------------
// I/O vrstva nad Vercel Blob. Validace typu/velikosti je v ./upload.ts
// (čistá funkce, bez závislosti na @vercel/blob), tady jen samotný upload/mazání.
// ---------------------------------------------------------------------------

export async function uploadImage(
  file: File,
  prefix: string
): Promise<{ url: string; pathname: string }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Upload obrázků není nakonfigurovaný (BLOB_READ_WRITE_TOKEN)"
    );
  }

  const validation = validateImageFile({ type: file.type, size: file.size });
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const key = `${prefix}/${crypto.randomUUID()}.${validation.ext}`;
  const blob = await put(key, file, {
    access: "public",
    contentType: file.type,
  });

  return { url: blob.url, pathname: blob.pathname };
}

// Chybu při mazání jen zalogujeme — DB řádek (nebo stará imageUrl) je v tu
// chvíli už přepsaný/smazaný, vyhazovat výjimku by uživateli jen ukázalo
// chybu u akce, která jinak proběhla v pořádku.
export async function deleteImageIfOurs(url: string | null): Promise<void> {
  if (!url) return;
  if (!isOurBlobUrl(url)) return;
  try {
    await del(url);
  } catch (err) {
    console.error("[blob] smazání obrázku selhalo", err);
  }
}
