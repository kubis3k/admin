"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { requireSiteAccess, requireModule } from "@/lib/auth";
import { validateEventInput, type RawEventInput } from "@/lib/events";
import { notifySiteChange } from "@/lib/revalidate";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult, type ActionState } from "@/lib/action-result";

// Staff má plný CRUD eventů vč. publikace (jako položky menu).

function rawEventInputFromFormData(formData: FormData): RawEventInput {
  return {
    title: String(formData.get("title") || ""),
    date: String(formData.get("date") || ""),
    startTime: String(formData.get("startTime") || ""),
    imageUrl: String(formData.get("imageUrl") || ""),
    description: String(formData.get("description") || ""),
    isPublished: formData.get("isPublished") === "on",
  };
}

// validateEventInput vrací jen jednu textovou chybu — mapujeme ji na
// konkrétní pole podle přesného znění (viz src/lib/events.ts), jinak obecná chyba.
function eventFieldErrors(error: string): Record<string, string> {
  if (error === "Název musí mít 1 až 200 znaků") return { title: error };
  if (error === "Popis smí mít nejvýše 5000 znaků") return { description: error };
  if (error === "Neplatné datum") return { date: error };
  if (error === "Neplatný čas") return { startTime: error };
  if (error === "Neplatná URL obrázku") return { imageUrl: error };
  return {};
}

function eventFail(error: string): ActionResult<never> {
  const fieldErrors = eventFieldErrors(error);
  if (Object.keys(fieldErrors).length === 0) return fail({ error });
  return fail({ fieldErrors });
}

export async function createEvent(
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "events");

  const result = validateEventInput(rawEventInputFromFormData(formData));
  if (!result.ok) return eventFail(result.error);

  await db.insert(events).values({
    siteId: site.id,
    title: result.value.title,
    description: result.value.description,
    date: result.value.date,
    startTime: result.value.startTime,
    imageUrl: result.value.imageUrl,
    isPublished: result.value.isPublished,
  });
  revalidatePath(`/admin/${siteSlug}/events`);
  await notifySiteChange(site, "events");
  return ok("Event vytvořen");
}

export async function updateEvent(
  eventId: string,
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "events");

  const result = validateEventInput(rawEventInputFromFormData(formData));
  if (!result.ok) return eventFail(result.error);

  await db
    .update(events)
    .set({
      title: result.value.title,
      description: result.value.description,
      date: result.value.date,
      startTime: result.value.startTime,
      imageUrl: result.value.imageUrl,
      isPublished: result.value.isPublished,
      updatedAt: new Date(),
    })
    .where(and(eq(events.id, eventId), eq(events.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/events`);
  await notifySiteChange(site, "events");
  return ok("Uloženo");
}

export async function setPublished(
  eventId: string,
  siteSlug: string,
  isPublished: boolean,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "events");

  await db
    .update(events)
    .set({ isPublished, updatedAt: new Date() })
    .where(and(eq(events.id, eventId), eq(events.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/events`);
  await notifySiteChange(site, "events");
  return ok(isPublished ? "Publikováno" : "Skryto");
}

export async function deleteEvent(
  eventId: string,
  siteSlug: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "events");

  await db
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/events`);
  await notifySiteChange(site, "events");
  return ok("Smazáno");
}
