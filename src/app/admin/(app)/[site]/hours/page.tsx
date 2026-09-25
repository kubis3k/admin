import { db } from "@/db";
import { openingHours, openingHourExceptions } from "@/db/schema";
import { requireSiteAccess, hasRole } from "@/lib/auth";
import {
  WEEKDAY_NAMES,
  normalizeTime,
  todayInPrague,
} from "@/lib/hours";
import { eq, asc, gte } from "drizzle-orm";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { FieldInput } from "@/components/admin/field-input";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { formatDateCs } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setWeekday, upsertException, deleteException } from "./actions";

// Badge se stavem dne — hlavní zobrazení pro staff, doplněk k editaci pro ownera.
function ScheduleBadge({ row }: { row: { opensAt: string; closesAt: string } | undefined }) {
  if (!row) return <Badge variant="secondary">Zavřeno</Badge>;
  const opens = normalizeTime(row.opensAt);
  const closes = normalizeTime(row.closesAt);
  const overnight = closes < opens;
  return (
    <Badge className="h-auto whitespace-normal text-left">
      Otevřeno {opens}–{closes}
      {overnight && " (přes půlnoc)"}
    </Badge>
  );
}

export default async function HoursAdminPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug, "staff");
  const isOwner = hasRole(role, "owner");

  if (!site.modules.hours) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Otevírací doba</CardTitle>
          <CardDescription>
            Otevírací doba je pro tento web vypnutá.
          </CardDescription>
        </CardHeader>
      </Card>
    );
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Otevírací doba — ${site.name}`}
        description="Týdenní rozvrh a výjimky (svátky, akce, dočasné zavření)."
      />

      <Card>
        <CardHeader>
          <CardTitle>Týdenní rozvrh</CardTitle>
          {!isOwner && (
            <CardDescription>
              Úpravu týdenního rozvrhu může provést jen owner.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Den</TableHead>
                <TableHead>Otevřeno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {WEEKDAY_NAMES.map((name, weekday) => {
                const row = weeklyByDay.get(weekday);
                return (
                  <TableRow key={weekday}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-2">
                        <ScheduleBadge row={row} />
                        {isOwner && (
                          <ActionForm
                            action={setWeekday.bind(null, siteSlug, weekday)}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <FieldInput
                              type="time"
                              name="opensAt"
                              defaultValue={row ? normalizeTime(row.opensAt) : ""}
                              required
                              className="w-24 sm:w-32"
                            />
                            <span>–</span>
                            <FieldInput
                              type="time"
                              name="closesAt"
                              defaultValue={row ? normalizeTime(row.closesAt) : ""}
                              required
                              className="w-24 sm:w-32"
                            />
                            <SubmitButton size="sm">Uložit</SubmitButton>
                          </ActionForm>
                        )}
                        {/* Ve stejné buňce (ne vlastní sloupec) — na mobilu se jinak tabulka posouvá do strany. */}
                        {isOwner && row && (
                          <ActionForm action={setWeekday.bind(null, siteSlug, weekday)}>
                            <input type="hidden" name="closed" value="1" />
                            <SubmitButton size="sm" variant="outline">
                              Nastavit zavřeno
                            </SubmitButton>
                          </ActionForm>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Výjimky</CardTitle>
          <CardDescription>Nadcházející svátky, akce a dočasné změny.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Otevřeno</TableHead>
                <TableHead className="hidden sm:table-cell">Důvod</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptions.map((exception) => (
                <TableRow key={exception.id}>
                  <TableCell className="font-medium">
                    {formatDateCs(exception.date)}
                    {exception.reason && (
                      <div className="text-xs font-normal text-muted-foreground sm:hidden">
                        {exception.reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {exception.isClosed ? (
                      <Badge variant="secondary">Zavřeno</Badge>
                    ) : (
                      <ScheduleBadge
                        row={{
                          opensAt: exception.customOpensAt!,
                          closesAt: exception.customClosesAt!,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{exception.reason ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmDeleteButton
                      action={deleteException.bind(null, exception.id, siteSlug)}
                      title={`Smazat výjimku (${formatDateCs(exception.date)})?`}
                      label="Smazat"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <ActionForm
            action={upsertException.bind(null, siteSlug)}
            resetOnSuccess
            className="flex flex-wrap items-end gap-2 border-t pt-4"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="exception-date">Datum</Label>
              <FieldInput id="exception-date" type="date" name="date" required />
            </div>
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox name="isClosed" />
              Zavřeno
            </Label>
            <div className="flex flex-col gap-1">
              <Label htmlFor="exception-opens">Otevřeno</Label>
              <FieldInput id="exception-opens" type="time" name="opensAt" className="w-24 sm:w-32" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="exception-closes">Zavřeno</Label>
              <FieldInput id="exception-closes" type="time" name="closesAt" className="w-24 sm:w-32" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="exception-reason">Důvod</Label>
              <FieldInput
                id="exception-reason"
                name="reason"
                placeholder="nepovinné"
                maxLength={200}
                className="w-48"
              />
            </div>
            <SubmitButton>Přidat výjimku</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
