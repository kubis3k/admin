"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import type { ActionResult, ActionState } from "@/lib/action-result";

export function ConfirmDeleteButton({
  action,
  title,
  description,
  label = "Smazat",
  size = "sm",
  variant = "destructive",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionResult>;
  title: string;
  description?: string;
  label?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Toast/zavření dialogu se volají přímo v closure po dokončení akce, ne
  // přes useEffect na state — po smazání se řádek zmizí z DOM a komponenta
  // by se odmontovala dřív, než by useEffect stihl proběhnout.
  const handleConfirm = () => {
    startTransition(async () => {
      const result = await action(null, new FormData());
      if (result.ok) {
        toast.success(result.message ?? "Smazáno");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Smazání se nezdařilo");
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" size={size} variant={variant}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
