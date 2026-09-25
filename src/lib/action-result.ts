// Jednotný tvar návratové hodnoty server akcí pro useActionState.
// Validace/očekávatelná chyba = return fail(...); neočekávaná chyba (DB, …) = throw.
export type ActionResult<D = void> =
  | { ok: true; message?: string; data: D }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

export type ActionState<D = void> = ActionResult<D> | null;

export function ok<D = void>(message?: string, data?: D): ActionResult<D> {
  return { ok: true, message, data: data as D };
}

export function fail(error: {
  error?: string;
  fieldErrors?: Record<string, string>;
}): ActionResult<never> {
  return { ok: false, error: error.error, fieldErrors: error.fieldErrors };
}
