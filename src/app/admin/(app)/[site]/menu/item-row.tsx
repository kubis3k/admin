import Image from "next/image";
import type { menuItems } from "@/db/schema";
import { isOurBlobUrl } from "@/lib/upload";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { FieldInput } from "@/components/admin/field-input";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  setItemImage,
  removeItemImage,
  updateItem,
  toggleAvailability,
  deleteItem,
} from "./actions";

// Sdílené kousky řádku položky menu — vykreslují se jak v mobilní kartě, tak
// v desktop tabulce (page.tsx), aby se logika/akce nikde neduplikovaly.

type Item = typeof menuItems.$inferSelect;

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("cs-CZ", {
    style: "currency",
    currency: "CZK",
  });
}

// compact = true na desktopu (menší tlačítka v tabulce), false na mobilu
// (tlačítka min. 40 px výšky pro snadné dotykové ovládání).
export function ItemImage({
  item,
  siteSlug,
  compact,
}: {
  item: Item;
  siteSlug: string;
  compact: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {item.imageUrl && isOurBlobUrl(item.imageUrl) && (
        <Image
          src={item.imageUrl}
          alt={item.name}
          width={40}
          height={40}
          className="rounded object-cover"
        />
      )}
      <ActionForm
        action={setItemImage.bind(null, item.id, siteSlug)}
        className="flex flex-wrap items-center gap-2"
      >
        <Input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          required
          className="max-w-40 text-xs"
        />
        <SubmitButton
          size={compact ? "sm" : "lg"}
          variant="outline"
          className={compact ? undefined : "w-full"}
        >
          Nahrát
        </SubmitButton>
      </ActionForm>
      {item.imageUrl && (
        <ConfirmDeleteButton
          action={removeItemImage.bind(null, item.id, siteSlug)}
          title="Odebrat obrázek položky?"
          label="Odebrat obrázek"
          size={compact ? "sm" : "lg"}
        />
      )}
    </div>
  );
}

export function ItemNamePriceForm({
  item,
  siteSlug,
  compact,
}: {
  item: Item;
  siteSlug: string;
  compact: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <ActionForm
        action={updateItem.bind(null, item.id, siteSlug)}
        className={compact ? "flex flex-wrap items-start gap-2" : "flex flex-col gap-2"}
      >
        <div className="flex flex-col gap-1">
          <FieldInput name="name" defaultValue={item.name} required />
        </div>
        <div className="flex flex-col gap-1">
          <FieldInput
            name="price"
            type="number"
            step="0.01"
            defaultValue={(item.priceCents / 100).toFixed(2)}
            required
            className={compact ? "w-28" : undefined}
          />
        </div>
        <SubmitButton size={compact ? "sm" : "lg"} className={compact ? undefined : "w-full"}>
          Uložit
        </SubmitButton>
      </ActionForm>
      <p className="text-xs text-muted-foreground">Aktuálně: {formatPrice(item.priceCents)}</p>
    </div>
  );
}

export function ItemAvailability({
  item,
  siteSlug,
  compact,
}: {
  item: Item;
  siteSlug: string;
  compact: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <Badge variant={item.isAvailable ? "default" : "secondary"}>
        {item.isAvailable ? "Dostupné" : "Nedostupné"}
      </Badge>
      <ActionForm
        action={toggleAvailability.bind(null, item.id, siteSlug, !item.isAvailable)}
        className={compact ? undefined : "w-full"}
      >
        <SubmitButton
          size={compact ? "sm" : "lg"}
          variant="outline"
          className={compact ? undefined : "w-full"}
        >
          {item.isAvailable ? "Vypnout" : "Zapnout"}
        </SubmitButton>
      </ActionForm>
    </div>
  );
}

export function ItemDelete({
  item,
  siteSlug,
  compact,
}: {
  item: Item;
  siteSlug: string;
  compact: boolean;
}) {
  return (
    <ConfirmDeleteButton
      action={deleteItem.bind(null, item.id, siteSlug)}
      title={`Smazat položku „${item.name}"?`}
      label="Smazat"
      size={compact ? "sm" : "lg"}
    />
  );
}
