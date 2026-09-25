"use client";

import { createContext, useContext } from "react";

// Sdílí fieldErrors z posledního ActionResult mezi ActionForm a poli uvnitř.
export const FieldErrorsContext = createContext<Record<string, string> | undefined>(
  undefined
);

export function useFieldError(name: string): string | undefined {
  const fieldErrors = useContext(FieldErrorsContext);
  return fieldErrors?.[name];
}

export function FieldError({ name }: { name: string }) {
  const error = useFieldError(name);
  if (!error) return null;

  return (
    <p id={`${name}-error`} className="text-sm text-destructive">
      {error}
    </p>
  );
}
