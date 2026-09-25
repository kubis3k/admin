import { db } from "@/db";
import { pageContent } from "@/db/schema";
import { requireSiteAccess, hasRole } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { FieldError } from "@/components/admin/field-error";
import { FieldInput } from "@/components/admin/field-input";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { formatDateTimeCs } from "@/lib/format";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPage, deletePage, savePageContent } from "./actions";

function PageCard({
  page,
  siteSlug,
  isOwner,
}: {
  page: typeof pageContent.$inferSelect;
  siteSlug: string;
  isOwner: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono">{page.pageKey}</CardTitle>
        <CardDescription>
          upraveno {formatDateTimeCs(page.updatedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm
          action={savePageContent.bind(null, page.id, siteSlug)}
          className="flex flex-col gap-2"
        >
          <Textarea
            name="content"
            defaultValue={page.content}
            rows={12}
            className="font-mono"
          />
          <FieldError name="content" />
          <SubmitButton>Uložit</SubmitButton>
        </ActionForm>
      </CardContent>
      {isOwner && (
        <CardFooter>
          <ConfirmDeleteButton
            action={deletePage.bind(null, page.id, siteSlug)}
            title="Smazat stránku?"
            description={`Opravdu smazat stránku „${page.pageKey}“? Tuto akci nelze vrátit zpět.`}
            label="Smazat stránku"
          />
        </CardFooter>
      )}
    </Card>
  );
}

export default async function ContentAdminPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug, "staff");
  const isOwner = hasRole(role, "owner");

  if (!site.modules.content) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Textový obsah je pro tento web vypnutý.</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const pages = await db.query.pageContent.findMany({
    where: eq(pageContent.siteId, site.id),
    orderBy: [asc(pageContent.pageKey)],
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Obsah stránek — ${site.name}`}
        description="Textový obsah stránek webu v Markdownu."
      />

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Nová stránka</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={createPage.bind(null, siteSlug)}
              className="flex flex-col gap-2"
              resetOnSuccess
            >
              <Label htmlFor="pageKey">Klíč stránky</Label>
              <FieldInput
                id="pageKey"
                name="pageKey"
                placeholder="např. o-nas"
                pattern="[a-z0-9-]{1,50}"
                title="jen malá písmena, číslice a pomlčka, 1–50 znaků"
                required
              />
              <div>
                <SubmitButton>Založit</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatím žádné stránky.</p>
        ) : (
          pages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              siteSlug={siteSlug}
              isOwner={isOwner}
            />
          ))
        )}
      </div>
    </div>
  );
}
