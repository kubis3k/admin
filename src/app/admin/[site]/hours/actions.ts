"use server";

import { db } from "@/db";
import { openingHours, openingHourExceptions } from "@/db/schema";
import { requireSiteAccess, requireModule } from "@/lib/auth";
import { isValidDate, isValidTime } from "@/lib/hours";
import { notifySiteChange } from "@/lib/revalidate";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Týdenní rozvrh je vyhrazený pro "owner" (nastavení webu), výjimky
// (nemoc, akce, svátek) může řešit "staff" (provozní věc).

export async function setWeekday(
  siteSlug: string,
  weekday: number,
  hours: { opensAt: string; closesAt: string } | null
) {
  const { site } = await requireSiteAccess(siteSlug, "owner");
  requireModule(site, "hours");

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new Error("Neplatný den v týdnu");
  }

  if (hours === null) {
    await db
      .delete(openingHours)
      .where(
        and(eq(openingHours.siteId, site.id), eq(openingHours.weekday, weekday))
      );
    revalidatePath(`/admin/${siteSlug}/hours`);
    await notifySiteChange(site, "hours");
    return;
  }

  if (!isValidTime(hours.opensAt) || !isValidTime(hours.closesAt)) {
    throw new Error("Neplatný čas");
  }
  if (hours.opensAt === hours.closesAt) {
    throw new Error("Otevírací a zavírací čas se musí lišit");
  }

  await db
    .insert(openingHours)
    .values({
      siteId: site.id,
      weekday,
      opensAt: hours.opensAt,
      closesAt: hours.closesAt,
    })
    .onConflictDoUpdate({
      target: [openingHours.siteId, openingHours.weekday],
      set: { opensAt: hours.opensAt, closesAt: hours.closesAt },
    });

  revalidatePath(`/admin/${siteSlug}/hours`);
  await notifySiteChange(site, "hours");
}

export async function upsertException(
  siteSlug: string,
  data: {
    date: string;
    isClosed: boolean;
    opensAt?: string;
    closesAt?: string;
    reason?: string;
  }
) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "hours");

  if (!isValidDate(data.date)) {
    throw new Error("Neplatné datum");
  }

  let customOpensAt: string | null = null;
  let customClosesAt: string | null = null;

  if (!data.isClosed) {
    if (
      !data.opensAt ||
      !data.closesAt ||
      !isValidTime(data.opensAt) ||
      !isValidTime(data.closesAt)
    ) {
      throw new Error("Neplatný čas");
    }
    if (data.opensAt === data.closesAt) {
      throw new Error("Otevírací a zavírací čas se musí lišit");
    }
    customOpensAt = data.opensAt;
    customClosesAt = data.closesAt;
  }

  let reason = data.reason?.trim() ?? "";
  if (reason.length > 200) reason = reason.slice(0, 200);
  const reasonValue = reason === "" ? null : reason;

  await db
    .insert(openingHourExceptions)
    .values({
      siteId: site.id,
      date: data.date,
      isClosed: data.isClosed,
      customOpensAt,
      customClosesAt,
      reason: reasonValue,
    })
    .onConflictDoUpdate({
      target: [openingHourExceptions.siteId, openingHourExceptions.date],
      set: {
        isClosed: data.isClosed,
        customOpensAt,
        customClosesAt,
        reason: reasonValue,
      },
    });

  revalidatePath(`/admin/${siteSlug}/hours`);
  await notifySiteChange(site, "hours");
}

export async function deleteException(exceptionId: string, siteSlug: string) {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "hours");

  await db
    .delete(openingHourExceptions)
    .where(
      and(
        eq(openingHourExceptions.id, exceptionId),
        eq(openingHourExceptions.siteId, site.id)
      )
    );
  revalidatePath(`/admin/${siteSlug}/hours`);
  await notifySiteChange(site, "hours");
}
