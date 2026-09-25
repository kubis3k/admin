"use server";

import { db } from "@/db";
import { openingHours, openingHourExceptions } from "@/db/schema";
import { requireSiteAccess, requireModule } from "@/lib/auth";
import { isValidDate, isValidTime } from "@/lib/hours";
import { notifySiteChange } from "@/lib/revalidate";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult, type ActionState } from "@/lib/action-result";

// Týdenní rozvrh je vyhrazený pro "owner" (nastavení webu), výjimky
// (nemoc, akce, svátek) může řešit "staff" (provozní věc).

// Jeden formulář = časy, druhý (skrytý input closed=1) = tlačítko "Zavřeno" —
// obojí vede do stejné akce, aby zůstal zachovaný požadovaný počet
// requireSiteAccess/requireModule/notifySiteChange volání (viz flow-state).
export async function setWeekday(
  siteSlug: string,
  weekday: number,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "owner");
  requireModule(site, "hours");

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return fail({ error: "Neplatný den v týdnu" });
  }

  const closed = formData.get("closed") === "1";

  if (closed) {
    await db
      .delete(openingHours)
      .where(
        and(eq(openingHours.siteId, site.id), eq(openingHours.weekday, weekday))
      );
    revalidatePath(`/admin/${siteSlug}/hours`);
    await notifySiteChange(site, "hours");
    return ok("Den nastaven jako zavřený");
  }

  const opensAt = String(formData.get("opensAt") ?? "");
  const closesAt = String(formData.get("closesAt") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!isValidTime(opensAt)) fieldErrors.opensAt = "Neplatný čas";
  if (!isValidTime(closesAt)) fieldErrors.closesAt = "Neplatný čas";
  if (
    !fieldErrors.opensAt &&
    !fieldErrors.closesAt &&
    opensAt === closesAt
  ) {
    fieldErrors.opensAt = "Otevírací a zavírací čas se musí lišit";
    fieldErrors.closesAt = "Otevírací a zavírací čas se musí lišit";
  }
  if (Object.keys(fieldErrors).length > 0) return fail({ fieldErrors });

  await db
    .insert(openingHours)
    .values({
      siteId: site.id,
      weekday,
      opensAt,
      closesAt,
    })
    .onConflictDoUpdate({
      target: [openingHours.siteId, openingHours.weekday],
      set: { opensAt, closesAt },
    });

  revalidatePath(`/admin/${siteSlug}/hours`);
  await notifySiteChange(site, "hours");
  return ok("Uloženo");
}

export async function upsertException(
  siteSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionResult> {
  const { site } = await requireSiteAccess(siteSlug, "staff");
  requireModule(site, "hours");

  const date = String(formData.get("date") ?? "");
  const isClosed = formData.get("isClosed") === "on";
  const rawOpensAt = String(formData.get("opensAt") ?? "");
  const rawClosesAt = String(formData.get("closesAt") ?? "");
  let reason = String(formData.get("reason") ?? "").trim();
  if (reason.length > 200) reason = reason.slice(0, 200);

  const fieldErrors: Record<string, string> = {};
  if (!isValidDate(date)) fieldErrors.date = "Neplatné datum";

  let customOpensAt: string | null = null;
  let customClosesAt: string | null = null;

  if (!isClosed) {
    if (!rawOpensAt || !isValidTime(rawOpensAt)) {
      fieldErrors.opensAt = "Neplatný čas";
    }
    if (!rawClosesAt || !isValidTime(rawClosesAt)) {
      fieldErrors.closesAt = "Neplatný čas";
    }
    if (!fieldErrors.opensAt && !fieldErrors.closesAt && rawOpensAt === rawClosesAt) {
      fieldErrors.opensAt = "Otevírací a zavírací čas se musí lišit";
      fieldErrors.closesAt = "Otevírací a zavírací čas se musí lišit";
    }
    customOpensAt = rawOpensAt;
    customClosesAt = rawClosesAt;
  }

  if (Object.keys(fieldErrors).length > 0) return fail({ fieldErrors });

  const reasonValue = reason === "" ? null : reason;

  await db
    .insert(openingHourExceptions)
    .values({
      siteId: site.id,
      date,
      isClosed,
      customOpensAt,
      customClosesAt,
      reason: reasonValue,
    })
    .onConflictDoUpdate({
      target: [openingHourExceptions.siteId, openingHourExceptions.date],
      set: {
        isClosed,
        customOpensAt,
        customClosesAt,
        reason: reasonValue,
      },
    });

  revalidatePath(`/admin/${siteSlug}/hours`);
  await notifySiteChange(site, "hours");
  return ok("Výjimka uložena");
}

export async function deleteException(
  exceptionId: string,
  siteSlug: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionResult> {
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
  return ok("Výjimka smazána");
}
