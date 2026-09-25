"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createSite } from "./actions";

const MODULE_LABELS: { key: string; label: string }[] = [
  { key: "menu", label: "Menu" },
  { key: "hours", label: "Otevírací doba" },
  { key: "events", label: "Eventy" },
  { key: "gallery", label: "Galerie" },
  { key: "content", label: "Obsah stránek" },
];

export function NewSiteForm() {
  const [state, formAction, pending] = useActionState(createSite, {});

  if (state.ok) {
    return (
      <div>
        <p>Web vytvořen.</p>
        <p>
          {state.mailSent
            ? "Přihlašovací e-mail odeslán."
            : "E-mail se nepodařilo odeslat — owner si odkaz vyžádá na /admin/login."}
        </p>
        <p>
          <Link href="/admin">Zpět na rozcestník</Link>
          {state.firstModule && state.slug && (
            <>
              {" · "}
              <Link href={`/admin/${state.slug}/${state.firstModule}`}>
                Otevřít web
              </Link>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      {state.error && <p style={{ color: "red" }}>{state.error}</p>}

      <div>
        <label>
          Název webu
          <br />
          <input name="name" required maxLength={100} />
        </label>
      </div>

      <div>
        <label>
          Slug (adresa /admin/&lt;slug&gt;)
          <br />
          <input
            name="slug"
            required
            pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?"
            title="jen malá písmena, číslice a pomlčka, nesmí začínat/končit pomlčkou, 1–40 znaků"
          />
        </label>
      </div>

      <div>
        <label>
          E-mail ownera
          <br />
          <input name="email" type="email" required />
        </label>
      </div>

      <fieldset>
        <legend>Moduly</legend>
        {MODULE_LABELS.map((m) => (
          <label key={m.key} style={{ display: "block" }}>
            <input type="checkbox" name={m.key} /> {m.label}
          </label>
        ))}
      </fieldset>

      <button type="submit" disabled={pending}>
        {pending ? "Vytvářím…" : "Vytvořit web"}
      </button>
    </form>
  );
}
