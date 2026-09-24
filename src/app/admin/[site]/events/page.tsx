import { db } from "@/db";
import { events } from "@/db/schema";
import { requireSiteAccess } from "@/lib/auth";
import { normalizeTime, todayInPrague } from "@/lib/hours";
import { eq, and, asc, desc, gte, lt } from "drizzle-orm";
import {
  createEvent,
  updateEvent,
  setPublished,
  deleteEvent,
} from "./actions";

function EventItem({
  event,
  siteSlug,
}: {
  event: typeof events.$inferSelect;
  siteSlug: string;
}) {
  return (
    <li style={{ marginBottom: 16, borderBottom: "1px solid #ccc", paddingBottom: 12 }}>
      <div>
        <strong>{event.date}</strong>
        {event.startTime && ` ${normalizeTime(event.startTime)}`} —{" "}
        <strong>{event.title}</strong>{" "}
        <em>({event.isPublished ? "publikováno" : "koncept"})</em>
      </div>
      {event.description && <p>{event.description}</p>}
      {event.imageUrl && <p>Obrázek: {event.imageUrl}</p>}

      <form
        action={setPublished.bind(null, event.id, siteSlug, !event.isPublished)}
        style={{ display: "inline", marginRight: 8 }}
      >
        <button type="submit">{event.isPublished ? "Skrýt" : "Publikovat"}</button>
      </form>
      <form
        action={deleteEvent.bind(null, event.id, siteSlug)}
        style={{ display: "inline" }}
      >
        <button type="submit">Smazat</button>
      </form>

      <details style={{ marginTop: 8 }}>
        <summary>Upravit</summary>
        <form
          action={async (formData: FormData) => {
            "use server";
            const isPublished = formData.get("isPublished") === "on";
            await updateEvent(event.id, siteSlug, {
              title: String(formData.get("title") || ""),
              date: String(formData.get("date") || ""),
              startTime: String(formData.get("startTime") || ""),
              imageUrl: String(formData.get("imageUrl") || ""),
              description: String(formData.get("description") || ""),
              isPublished,
            });
          }}
        >
          <div>
            <input name="title" defaultValue={event.title} required maxLength={200} />
          </div>
          <div>
            <input type="date" name="date" defaultValue={event.date} required />
            <input
              type="time"
              name="startTime"
              defaultValue={event.startTime ? normalizeTime(event.startTime) : ""}
            />
          </div>
          <div>
            <input
              name="imageUrl"
              defaultValue={event.imageUrl ?? ""}
              placeholder="URL obrázku (https://…)"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <textarea
              name="description"
              defaultValue={event.description ?? ""}
              placeholder="Popis"
              maxLength={5000}
              style={{ width: "100%" }}
            />
          </div>
          <label>
            <input type="checkbox" name="isPublished" defaultChecked={event.isPublished} />{" "}
            Publikováno
          </label>
          <div>
            <button type="submit">Uložit</button>
          </div>
        </form>
      </details>
    </li>
  );
}

export default async function EventsAdminPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug, "staff");

  if (!site.modules.events) {
    return <p>Eventy jsou pro tento web vypnuté.</p>;
  }

  const today = todayInPrague();

  const upcoming = await db.query.events.findMany({
    where: and(eq(events.siteId, site.id), gte(events.date, today)),
    orderBy: [asc(events.date), asc(events.startTime)],
  });

  const past = await db.query.events.findMany({
    where: and(eq(events.siteId, site.id), lt(events.date, today)),
    orderBy: [desc(events.date), desc(events.startTime)],
    limit: 20,
  });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Eventy — {site.name}</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>Nový event</h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            const isPublished = formData.get("isPublished") === "on";
            await createEvent(siteSlug, {
              title: String(formData.get("title") || ""),
              date: String(formData.get("date") || ""),
              startTime: String(formData.get("startTime") || ""),
              imageUrl: String(formData.get("imageUrl") || ""),
              description: String(formData.get("description") || ""),
              isPublished,
            });
          }}
        >
          <div>
            <input name="title" placeholder="Název" required maxLength={200} />
          </div>
          <div>
            <input type="date" name="date" required />
            <input type="time" name="startTime" />
          </div>
          <div>
            <input
              name="imageUrl"
              placeholder="URL obrázku (https://…)"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <textarea
              name="description"
              placeholder="Popis"
              maxLength={5000}
              style={{ width: "100%" }}
            />
          </div>
          <label>
            <input type="checkbox" name="isPublished" /> Publikováno
          </label>
          <div>
            <button type="submit">Přidat event</button>
          </div>
        </form>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Nadcházející</h2>
        {upcoming.length === 0 ? (
          <p>Žádné nadcházející eventy.</p>
        ) : (
          <ul>
            {upcoming.map((event) => (
              <EventItem key={event.id} event={event} siteSlug={siteSlug} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Proběhlé</h2>
        {past.length === 0 ? (
          <p>Žádné proběhlé eventy.</p>
        ) : (
          <ul>
            {past.map((event) => (
              <EventItem key={event.id} event={event} siteSlug={siteSlug} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
