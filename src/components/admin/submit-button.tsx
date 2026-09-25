"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePending } from "@/components/admin/action-form";
import type { ComponentProps } from "react";

export function SubmitButton({
  children,
  ...props
}: ComponentProps<typeof Button>) {
  const pending = usePending();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
