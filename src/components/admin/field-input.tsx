"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { FieldError, useFieldError } from "@/components/admin/field-error";

// Input + aria-invalid/aria-describedby + FieldError pod sebou — sjednocuje
// napojení na FieldErrorsContext (viz field-error.tsx) napříč moduly.
export function FieldInput({ name, ...props }: ComponentProps<typeof Input> & { name: string }) {
  const error = useFieldError(name);

  return (
    <>
      <Input
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      <FieldError name={name} />
    </>
  );
}
