import { db } from "@/db";
import { openingHours, openingHourExceptions } from "@/db/schema";
import { requireSiteAccess, hasRole } from "@/lib/auth";
import {
  WEEKDAY_NAMES,
  normalizeTime,
  todayInPrague,
} from "@/lib/hours";
import { eq, asc, gte } from "drizzle-orm";
import { setWeekday, upsertException, deleteException } from "./actions";

export default async function HoursAdminPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug, "staff");
  const isOwner = hasRole(role, "owner");

  if (!site.modules.hours) {
    return <p>Otevírací doba je pro tento web vypnutá.</p>;
  }

  const weekly = await db.query.openingHours.findMany({
    where: eq(openingHours.siteId, site.id),
    orderBy: asc(openingHours.weekday),
  });
  const weeklyByDay = new Map(weekly.map((w) => [w.weekday, w]));

  const today = todayInPrague();
  const exceptions = await db.query.openingHourExceptions.findMany({
    where: (e, { and }) => and(eq(e.siteId, site.id), gte(e.date, today)),
    orderBy: asc(openingHourExceptions.date),
  });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Otevírací doba — {site.name}</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>Týdenní rozvrh</h2>
        <ul>
          {WEEKDAY_NAMES.map((name, weekday) => {
            const row = weeklyByDay.get(weekday);
            return (
              <li key={weekday} style={{ marginBottom: 8 }}>
                <strong>{name}</strong>{" "}
                {isOwner ? (
                  <>
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        await setWeekday(siteSlug, weekday, {
                          opensAt: String(formData.get("opensAt")),
                          closesAt: String(formData.get("closesAt")),
                        });
                      }}
                      style={{ display: "inline" }}
                    >
                      <input
                        type="time"
                        name="opensAt"
                        defaultValue={row ? normalizeTime(row.opensAt) : ""}
                        required
                      />
                      {" – "}
                      <input
                        type="time"
                        name="closesAt"
                        defaultValue={row ? normalizeTime(row.closesAt) : ""}
                        required
                      />
                      <button type="submit">Uložit</button>
                    </form>
                    <form
                      action={setWeekday.bind(null, siteSlug, weekday, null)}
                      style={{ display: "inline", marginLeft: 4 }}
                    >
                      <button type="submit">Zavřeno</button>
                    </form>
                  </>
                ) : row ? (
                  `${normalizeTime(row.opensAt)}–${normalizeTime(row.closesAt)}`
                ) : (
                  "zavřeno"
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2>Výjimky</h2>
        <ul>
          {exceptions.map((exception) => (
            <li key={exception.id} style={{ marginBottom: 8 }}>
              <strong>{exception.date}</strong>{" "}
              {exception.isClosed
                ? "zavřeno"
                : `${normalizeTime(exception.customOpensAt!)}–${normalizeTime(exception.customClosesAt!)}`}
              {exception.reason && ` (${exception.reason})`}
              <form
                action={deleteException.bind(null, exception.id, siteSlug)}
                style={{ display: "inline", marginLeft: 8 }}
              >
                <button type="submit">Smazat</button>
              </form>
            </li>
          ))}
        </ul>

        <form
          action={async (formData: FormData) => {
            "use server";
            const isClosed = formData.get("isClosed") === "on";
            await upsertException(siteSlug, {
              date: String(formData.get("date")),
              isClosed,
              opensAt: String(formData.get("opensAt") || ""),
              closesAt: String(formData.get("closesAt") || ""),
              reason: String(formData.get("reason") || ""),
            });
          }}
        >
          <input type="date" name="date" required />
          <label>
            <input type="checkbox" name="isClosed" /> Zavřeno
          </label>
          <input type="time" name="opensAt" />
          {" – "}
          <input type="time" name="closesAt" />
          <input name="reason" placeholder="Důvod (nepovinné)" maxLength={200} />
          <button type="submit">Přidat výjimku</button>
        </form>
      </section>
    </main>
  );
}
