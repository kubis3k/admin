"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { FieldInput } from "@/components/admin/field-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createSite, type CreateSiteData } from "./actions";
import type { ActionResult } from "@/lib/action-result";

const MODULE_LABELS: { key: string; label: string }[] = [
  { key: "menu", label: "Menu" },
  { key: "hours", label: "Otevírací doba" },
  { key: "events", label: "Eventy" },
  { key: "gallery", label: "Galerie" },
  { key: "content", label: "Obsah stránek" },
];

export function NewSiteForm() {
  const [result, setResult] = useState<Extract<
    ActionResult<CreateSiteData>,
    { ok: true }
  > | null>(null);

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Web vytvořen</CardTitle>
          <CardDescription>
            {result.data.mailSent
              ? "Přihlašovací e-mail odeslán."
              : "E-mail se nepodařilo odeslat — owner si odkaz vyžádá na /admin/login."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">Zpět na přehled</Link>
          </Button>
          {result.data.firstModule && (
            <Button asChild>
              <Link href={`/admin/${result.data.slug}/${result.data.firstModule}`}>
                Otevřít web
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <ActionForm
          action={createSite}
          className="flex flex-col gap-4"
          onSuccess={(r) => setResult(r)}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Název webu</Label>
            <FieldInput id="name" name="name" required maxLength={100} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Slug (adresa /admin/&lt;slug&gt;)</Label>
            <FieldInput
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?"
              title="jen malá písmena, číslice a pomlčka, nesmí začínat/končit pomlčkou, 1–40 znaků"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail ownera</Label>
            <FieldInput id="email" name="email" type="email" required />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Moduly</legend>
            {MODULE_LABELS.map((m) => (
              <Label key={m.key} className="flex items-center gap-2 font-normal">
                <Checkbox name={m.key} />
                {m.label}
              </Label>
            ))}
          </fieldset>

          <SubmitButton>Vytvořit web</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
