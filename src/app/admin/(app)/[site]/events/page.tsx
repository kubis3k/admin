import { db } from "@/db";
import { events } from "@/db/schema";
import { requireSiteAccess } from "@/lib/auth";
import { normalizeTime, todayInPrague } from "@/lib/hours";
import { eq, and, asc, desc, gte, lt } from "drizzle-orm";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { FieldError } from "@/components/admin/field-error";
import { FieldInput } from "@/components/admin/field-input";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { formatDateCs } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createEvent,
  updateEvent,
  setPublished,
  deleteEvent,
} from "./actions";

function EventCard({
  event,
  siteSlug,
}: {
  event: typeof events.$inferSelect;
  siteSlug: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{event.title}</CardTitle>
            <CardDescription>
              {formatDateCs(
                event.date,
                event.startTime ? normalizeTime(event.startTime) : null
              )}
            </CardDescription>
          </div>
          <Badge variant={event.isPublished ? "default" : "secondary"}>
            {event.isPublished ? "Publikováno" : "Koncept"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {event.description && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {event.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <ActionForm action={setPublished.bind(null, event.id, siteSlug, !event.isPublished)}>
            <SubmitButton variant="outline" size="sm">
              {event.isPublished ? "Skrýt" : "Publikovat"}
            </SubmitButton>
          </ActionForm>
          <ConfirmDeleteButton
            action={deleteEvent.bind(null, event.id, siteSlug)}
            title="Smazat event?"
            description={`Opravdu smazat „${event.title}“? Tuto akci nelze vrátit zpět.`}
          />
        </div>

        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">Upravit</summary>
          <ActionForm
            action={updateEvent.bind(null, event.id, siteSlug)}
            className="mt-3 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor={`title-${event.id}`}>Název</Label>
              <FieldInput
                id={`title-${event.id}`}
                name="title"
                defaultValue={event.title}
                required
                maxLength={200}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`date-${event.id}`}>Datum</Label>
                <FieldInput
                  id={`date-${event.id}`}
                  type="date"
                  name="date"
                  defaultValue={event.date}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`startTime-${event.id}`}>Čas</Label>
                <FieldInput
                  id={`startTime-${event.id}`}
                  type="time"
                  name="startTime"
                  defaultValue={event.startTime ? normalizeTime(event.startTime) : ""}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`imageUrl-${event.id}`}>URL obrázku</Label>
              <FieldInput
                id={`imageUrl-${event.id}`}
                name="imageUrl"
                defaultValue={event.imageUrl ?? ""}
                placeholder="https://…"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`description-${event.id}`}>Popis</Label>
              <Textarea
                id={`description-${event.id}`}
                name="description"
                defaultValue={event.description ?? ""}
                maxLength={5000}
              />
              <FieldError name="description" />
            </div>

            <Label className="flex items-center gap-2 font-normal">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={event.isPublished}
                className="h-4 w-4"
              />
              Publikováno
            </Label>

            <SubmitButton>Uložit</SubmitButton>
          </ActionForm>
        </details>
      </CardContent>
    </Card>
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
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eventy jsou pro tento web vypnuté.</CardTitle>
        </CardHeader>
      </Card>
    );
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
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Eventy — ${site.name}`}
        description="Nadcházející i proběhlé akce a jejich publikace."
      />

      <Card>
        <CardHeader>
          <CardTitle>Nový event</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={createEvent.bind(null, siteSlug)}
            className="flex flex-col gap-4"
            resetOnSuccess
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Název</Label>
              <FieldInput id="title" name="title" required maxLength={200} />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="date">Datum</Label>
                <FieldInput id="date" type="date" name="date" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="startTime">Čas</Label>
                <FieldInput id="startTime" type="time" name="startTime" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="imageUrl">URL obrázku</Label>
              <FieldInput id="imageUrl" name="imageUrl" placeholder="https://…" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Popis</Label>
              <Textarea id="description" name="description" maxLength={5000} />
              <FieldError name="description" />
            </div>

            <Label className="flex items-center gap-2 font-normal">
              <input type="checkbox" name="isPublished" className="h-4 w-4" />
              Publikovat
            </Label>

            <SubmitButton>Přidat event</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Nadcházející</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádné nadcházející eventy.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} siteSlug={siteSlug} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Proběhlé</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádné proběhlé eventy.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {past.map((event) => (
              <EventCard key={event.id} event={event} siteSlug={siteSlug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
