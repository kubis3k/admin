"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { requireSiteAccess, requireModule } from "@/lib/auth";
import { validateEventInput, type RawEventInput } from "@/lib/events";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Staff má plný CRUD eventů vč. publikace (jako položky menu).

export async function createEvent(siteSlug: string, raw: RawEventInput) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "events");

  const result = validateEventInput(raw);
  if (!result.ok) throw new Error(result.error);

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
}

export async function updateEvent(
  eventId: string,
  siteSlug: string,
  raw: RawEventInput
) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "events");

  const result = validateEventInput(raw);
  if (!result.ok) throw new Error(result.error);

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
}

export async function setPublished(
  eventId: string,
  siteSlug: string,
  isPublished: boolean
) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "events");

  await db
    .update(events)
    .set({ isPublished, updatedAt: new Date() })
    .where(and(eq(events.id, eventId), eq(events.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/events`);
}

export async function deleteEvent(eventId: string, siteSlug: string) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "events");

  await db
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.siteId, site.id)));
  revalidatePath(`/admin/${siteSlug}/events`);
}
