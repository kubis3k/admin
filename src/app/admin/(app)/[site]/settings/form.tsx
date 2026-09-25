"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { FieldInput } from "@/components/admin/field-input";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionResult, ActionState } from "@/lib/action-result";
import {
  updateSiteSettings,
  updateWebhookUrl,
  rotateWebhookSecret,
  sendTestWebhook,
} from "./actions";

const MODULE_LABELS: { key: string; label: string }[] = [
  { key: "menu", label: "Menu" },
  { key: "hours", label: "Otevírací doba" },
  { key: "events", label: "Eventy" },
  { key: "gallery", label: "Galerie" },
  { key: "content", label: "Obsah stránek" },
];

type Modules = Record<string, boolean>;

function RevealedSecretCard({ secret }: { secret: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">Nový secret</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 text-xs">
          {secret}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(secret);
            toast.success("Zkopírováno");
          }}
        >
          <Copy /> Zkopírovat
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Zkopírujte si ho teď — znovu se nezobrazí.
      </p>
    </div>
  );
}

function RotateSecretButton({
  siteSlug,
  onRotated,
}: {
  siteSlug: string;
  onRotated: (secret: string) => void;
}) {
  const [state, formAction, isPending] = useActionState<
    ActionState<{ secret: string }>,
    FormData
  >(rotateWebhookSecret, null);
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    const formData = new FormData();
    formData.set("siteSlug", siteSlug);
    startTransition(() => {
      formAction(formData);
    });
  };

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      onRotated(state.data.secret);
      toast.success("Nový secret vygenerován");
      setOpen(false);
    } else {
      toast.error(state.error ?? "Rotace se nezdařila");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Vygenerovat nový secret
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vygenerovat nový secret?</AlertDialogTitle>
          <AlertDialogDescription>
            Starý secret přestane platit okamžitě — klientský web musí dostat
            nový, jinak přestanou webhooky procházet ověřením podpisu.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Vygenerovat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SettingsForm({
  slug,
  name,
  modules,
  webhookUrl,
  hasSecret,
}: {
  slug: string;
  name: string;
  modules: Modules;
  webhookUrl: string | null;
  hasSecret: boolean;
}) {
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    Extract<ActionResult<{ status: number }>, { ok: true }> | null
  >(null);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Web</CardTitle>
          <CardDescription>
            Moduly zapínejte jen po domluvě s provozovatelem — např. modul
            menu se u webů, které používají ADMI menu přes ChoiceQR, nechává
            vypnutý.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={updateSiteSettings}
            className="flex flex-col gap-4"
            successMessage="Uloženo"
          >
            <input type="hidden" name="siteSlug" value={slug} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Název webu</Label>
              <FieldInput id="name" name="name" defaultValue={name} required maxLength={100} />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Moduly</legend>
              {MODULE_LABELS.map((m) => (
                <Label key={m.key} className="flex items-center gap-2 font-normal">
                  <Checkbox name={m.key} defaultChecked={Boolean(modules[m.key])} />
                  {m.label}
                </Label>
              ))}
            </fieldset>

            <SubmitButton className="self-start">Uložit</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Webhook
            <Badge variant={hasSecret ? "default" : "secondary"}>
              {hasSecret ? "secret nastaven" : "secret nenastaven"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Po uložení URL se secret vygeneruje jen jednou automaticky — další
            vygenerujete tlačítkem níže.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionForm
            action={updateWebhookUrl}
            className="flex flex-col gap-4"
            successMessage="Uloženo"
            onSuccess={(r) => {
              if (r.data.secret) setRevealedSecret(r.data.secret);
            }}
          >
            <input type="hidden" name="siteSlug" value={slug} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="webhookUrl">Webhook URL (prázdné = vypnout)</Label>
              <FieldInput
                id="webhookUrl"
                name="webhookUrl"
                type="url"
                defaultValue={webhookUrl ?? ""}
                placeholder="https://klient.cz/api/revalidate"
              />
            </div>
            <SubmitButton className="self-start">Uložit</SubmitButton>
          </ActionForm>

          <RotateSecretButton siteSlug={slug} onRotated={setRevealedSecret} />

          {revealedSecret && <RevealedSecretCard secret={revealedSecret} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test</CardTitle>
          <CardDescription>Odešle testovací payload na webhook URL.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={sendTestWebhook}
            className="flex flex-col gap-3"
            successMessage="Odesláno"
            onSuccess={(r) => setTestResult(r)}
          >
            <input type="hidden" name="siteSlug" value={slug} />
            <SubmitButton className="self-start">Odeslat testovací webhook</SubmitButton>
          </ActionForm>
        </CardContent>
        {testResult && (
          <CardFooter>
            <Badge variant="default">OK — odpověď HTTP {testResult.data.status}</Badge>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
