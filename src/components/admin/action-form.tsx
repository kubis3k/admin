"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import type { ActionResult, ActionState } from "@/lib/action-result";
import { FieldErrorsContext } from "@/components/admin/field-error";

const PendingContext = createContext(false);

// SubmitButton čte pending odsud — useFormStatus nefunguje, protože formulář
// se odesílá přes onSubmit + startTransition, ne přímo přes action prop
// (React 19 by jinak po chybě sám vyresetoval vstup, viz flow-state).
export function usePending() {
  return useContext(PendingContext);
}

export function ActionForm<D>({
  action,
  resetOnSuccess,
  successMessage,
  onSuccess,
  className,
  children,
}: {
  action: (prev: ActionState<D>, formData: FormData) => Promise<ActionResult<D>>;
  resetOnSuccess?: boolean;
  successMessage?: string;
  onSuccess?: (result: Extract<ActionResult<D>, { ok: true }>) => void;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction, isPending] = useActionState<ActionState<D>, FormData>(
    action,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;

    if (state.ok) {
      toast.success(state.message ?? successMessage ?? "Uloženo");
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
    } else {
      toast.error(state.error ?? "Zkontrolujte zvýrazněná pole");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <FieldErrorsContext.Provider value={state && !state.ok ? state.fieldErrors : undefined}>
      <PendingContext.Provider value={isPending}>
        <form
          ref={formRef}
          className={className}
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(() => {
              formAction(formData);
            });
          }}
        >
          {state && !state.ok && state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {children}
        </form>
      </PendingContext.Provider>
    </FieldErrorsContext.Provider>
  );
}
