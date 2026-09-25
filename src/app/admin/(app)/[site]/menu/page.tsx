import { db } from "@/db";
import { menuCategories } from "@/db/schema";
import { requireSiteAccess, hasRole } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { FieldInput } from "@/components/admin/field-input";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { pluralCs } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createCategory, deleteCategory, createItem } from "./actions";
import { ItemImage, ItemNamePriceForm, ItemAvailability, ItemDelete } from "./item-row";

export default async function MenuAdminPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug, "staff");
  const isOwner = hasRole(role, "owner");

  if (!site.modules.menu) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Menu</CardTitle>
          <CardDescription>
            Menu modul je pro tento web vypnutý (drží si externí systém).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const categories = await db.query.menuCategories.findMany({
    where: eq(menuCategories.siteId, site.id),
    orderBy: asc(menuCategories.sortOrder),
    with: { items: { orderBy: (i, { asc }) => asc(i.sortOrder) } },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Menu — ${site.name}`}
        description="Kategorie a položky menu, dostupnost a obrázky."
      />

      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle>{category.name}</CardTitle>
              <Badge variant="secondary">
                {category.items.length} {pluralCs(category.items.length, "položka", "položky", "položek")}
              </Badge>
            </div>
            {isOwner && (
              <ConfirmDeleteButton
                action={deleteCategory.bind(null, category.id, siteSlug)}
                title={`Smazat kategorii „${category.name}"?`}
                description="Smaže i všechny položky v této kategorii. Akci nelze vrátit zpět."
                label="Smazat kategorii"
              />
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Pod md: svislý seznam karet (jedna karta na položku). */}
            <div className="flex flex-col gap-4 md:hidden">
              {category.items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-md border p-4">
                  {/* Nejčastější akce obsluhy (dostupnost) nahoře, obrázek a mazání dole. */}
                  <ItemAvailability item={item} siteSlug={siteSlug} compact={false} />
                  <ItemNamePriceForm item={item} siteSlug={siteSlug} compact={false} />
                  <ItemImage item={item} siteSlug={siteSlug} compact={false} />
                  <ItemDelete item={item} siteSlug={siteSlug} compact={false} />
                </div>
              ))}
            </div>

            {/* Od md: klasická tabulka. */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Obrázek</TableHead>
                  <TableHead>Název</TableHead>
                  <TableHead>Cena</TableHead>
                  <TableHead>Dostupnost</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {category.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <ItemImage item={item} siteSlug={siteSlug} compact />
                    </TableCell>
                    <TableCell colSpan={2}>
                      <ItemNamePriceForm item={item} siteSlug={siteSlug} compact />
                    </TableCell>
                    <TableCell>
                      <ItemAvailability item={item} siteSlug={siteSlug} compact />
                    </TableCell>
                    <TableCell className="text-right">
                      <ItemDelete item={item} siteSlug={siteSlug} compact />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <ActionForm
              action={createItem.bind(null, category.id, siteSlug)}
              resetOnSuccess
              className="flex flex-wrap items-end gap-2 border-t pt-4"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor={`name-${category.id}`}>Název položky</Label>
                <FieldInput id={`name-${category.id}`} name="name" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`price-${category.id}`}>Cena (Kč)</Label>
                <FieldInput
                  id={`price-${category.id}`}
                  name="price"
                  type="number"
                  step="0.01"
                  required
                  className="w-28"
                />
              </div>
              <SubmitButton>Přidat položku</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      ))}

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Nová kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={createCategory.bind(null, siteSlug)}
              resetOnSuccess
              className="flex flex-wrap items-end gap-2"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="new-category-name">Název kategorie</Label>
                <FieldInput
                  id="new-category-name"
                  name="name"
                  placeholder="např. Předkrmy"
                  required
                />
              </div>
              <SubmitButton>Přidat kategorii</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
