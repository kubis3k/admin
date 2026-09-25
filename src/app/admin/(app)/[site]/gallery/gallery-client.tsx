"use client";

import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { FieldInput } from "@/components/admin/field-input";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  uploadGalleryImage,
  updateAlt,
  moveImage,
  deleteGalleryImage,
} from "./actions";

type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

export function UploadImageCard({ siteSlug }: { siteSlug: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nahrát obrázek</CardTitle>
      </CardHeader>
      <CardContent>
        <ActionForm
          action={uploadGalleryImage.bind(null, siteSlug)}
          className="flex flex-col gap-4"
          resetOnSuccess
          successMessage="Obrázek nahrán"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="file">Soubor</Label>
            <FieldInput
              id="file"
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              required
            />
            <p className="text-sm text-muted-foreground">
              Max 4 MB, formáty JPEG/PNG/WebP/AVIF/GIF.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="alt">Popisek (alt text)</Label>
            <FieldInput id="alt" name="alt" maxLength={300} />
          </div>

          <SubmitButton>Nahrát</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

export function GalleryImageCard({
  image,
  siteSlug,
  index,
  total,
}: {
  image: GalleryImage;
  siteSlug: string;
  index: number;
  total: number;
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <Card className="overflow-hidden py-0">
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={image.url}
          alt={image.alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>
      <CardContent className="pt-4">
        <ActionForm
          action={updateAlt.bind(null, image.id, siteSlug)}
          className="flex flex-col gap-2"
          successMessage="Popisek uložen"
        >
          <Label htmlFor={`alt-${image.id}`} className="sr-only">
            Popisek
          </Label>
          <FieldInput
            id={`alt-${image.id}`}
            name="alt"
            defaultValue={image.alt}
            maxLength={300}
          />
          <SubmitButton size="sm" variant="outline">
            Uložit popisek
          </SubmitButton>
        </ActionForm>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 pb-4">
        <div className="flex gap-1">
          {isFirst ? (
            <Button variant="ghost" size="icon" disabled aria-label="Posunout nahoru">
              <ChevronUp />
            </Button>
          ) : (
            <ActionForm action={moveImage.bind(null, image.id, siteSlug, "up")}>
              <SubmitButton
                variant="ghost"
                size="icon"
                type="submit"
                aria-label="Posunout nahoru"
              >
                <ChevronUp />
              </SubmitButton>
            </ActionForm>
          )}
          {isLast ? (
            <Button variant="ghost" size="icon" disabled aria-label="Posunout dolů">
              <ChevronDown />
            </Button>
          ) : (
            <ActionForm action={moveImage.bind(null, image.id, siteSlug, "down")}>
              <SubmitButton
                variant="ghost"
                size="icon"
                type="submit"
                aria-label="Posunout dolů"
              >
                <ChevronDown />
              </SubmitButton>
            </ActionForm>
          )}
        </div>
        <ConfirmDeleteButton
          action={deleteGalleryImage.bind(null, image.id, siteSlug)}
          title="Smazat obrázek?"
          description="Tuto akci nelze vrátit zpět."
        />
      </CardFooter>
    </Card>
  );
}
