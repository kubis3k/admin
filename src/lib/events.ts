// ---------------------------------------------------------------------------
// Čistá logika eventů — žádné importy z "@/…", žádný přístup k DB.
// Znovupoužívá isValidDate/isValidTime z ./hours (relativní import).
// ---------------------------------------------------------------------------

import { isValidDate, isValidTime } from "./hours";

export type RawEventInput = {
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  imageUrl?: string;
  isPublished?: boolean;
};

export type EventInput = {
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  imageUrl: string | null;
  isPublished: boolean;
};

export type ValidationResult =
  | { ok: true; value: EventInput }
  | { ok: false; error: string };

function isHttpUrl(s: string): boolean {
  if (s.length > 2000) return false;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

export function validateEventInput(raw: RawEventInput): ValidationResult {
  const title = raw.title.trim();
  if (title.length < 1 || title.length > 200) {
    return { ok: false, error: "Název musí mít 1 až 200 znaků" };
  }

  const descriptionTrimmed = (raw.description ?? "").trim();
  if (descriptionTrimmed.length > 5000) {
    return { ok: false, error: "Popis smí mít nejvýše 5000 znaků" };
  }
  const description = descriptionTrimmed === "" ? null : descriptionTrimmed;

  if (!isValidDate(raw.date)) {
    return { ok: false, error: "Neplatné datum" };
  }
  const date = raw.date;

  const startTimeRaw = (raw.startTime ?? "").trim();
  let startTime: string | null = null;
  if (startTimeRaw !== "") {
    if (!isValidTime(startTimeRaw)) {
      return { ok: false, error: "Neplatný čas" };
    }
    startTime = startTimeRaw;
  }

  const imageUrlRaw = (raw.imageUrl ?? "").trim();
  let imageUrl: string | null = null;
  if (imageUrlRaw !== "") {
    if (!isHttpUrl(imageUrlRaw)) {
      return { ok: false, error: "Neplatná URL obrázku" };
    }
    imageUrl = imageUrlRaw;
  }

  const isPublished = raw.isPublished ?? false;

  return {
    ok: true,
    value: { title, description, date, startTime, imageUrl, isPublished },
  };
}
