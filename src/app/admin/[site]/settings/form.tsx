"use client";

import { useActionState } from "react";
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
  const [siteState, siteAction, sitePending] = useActionState(
    updateSiteSettings,
    {}
  );
  const [urlState, urlAction, urlPending] = useActionState(
    updateWebhookUrl,
    {}
  );
  const [rotateState, rotateAction, rotatePending] = useActionState(
    rotateWebhookSecret,
    {}
  );
  const [testState, testAction, testPending] = useActionState(
    sendTestWebhook,
    {}
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <section>
        <h2>Web</h2>
        <p style={{ color: "#666" }}>
          Moduly zapínejte jen po domluvě s provozovatelem — např. modul menu
          se u webů, které používají ADMI menu přes ChoiceQR, nechává vypnutý.
        </p>
        <form action={siteAction}>
          <input type="hidden" name="siteSlug" value={slug} />
          {siteState.error && <p style={{ color: "red" }}>{siteState.error}</p>}
          {siteState.ok && <p style={{ color: "green" }}>Uloženo.</p>}

          <div>
            <label>
              Název webu
              <br />
              <input name="name" defaultValue={name} required maxLength={100} />
            </label>
          </div>

          <fieldset>
            <legend>Moduly</legend>
            {MODULE_LABELS.map((m) => (
              <label key={m.key} style={{ display: "block" }}>
                <input
                  type="checkbox"
                  name={m.key}
                  defaultChecked={Boolean(modules[m.key])}
                />{" "}
                {m.label}
              </label>
            ))}
          </fieldset>

          <button type="submit" disabled={sitePending}>
            {sitePending ? "Ukládám…" : "Uložit"}
          </button>
        </form>
      </section>

      <section>
        <h2>Webhook</h2>
        <p>
          Secret: {hasSecret ? "nastaven" : "nenastaven"}
        </p>
        <form action={urlAction}>
          <input type="hidden" name="siteSlug" value={slug} />
          {urlState.error && <p style={{ color: "red" }}>{urlState.error}</p>}
          {urlState.ok && !urlState.newSecret && (
            <p style={{ color: "green" }}>Uloženo.</p>
          )}
          {/* Po rotaci je secret z prvního uložení URL neplatný — neukazovat ho. */}
          {urlState.newSecret && !rotateState.newSecret && (
            <p style={{ color: "green" }}>
              Webhook nastaven, secret vygenerován:{" "}
              <code>{urlState.newSecret}</code>
              <br />
              Zkopírujte si ho teď — znovu se nezobrazí.
            </p>
          )}

          <div>
            <label>
              Webhook URL (prázdné = vypnout)
              <br />
              <input
                name="webhookUrl"
                type="url"
                defaultValue={webhookUrl ?? ""}
                placeholder="https://klient.cz/api/revalidate"
                style={{ width: "100%" }}
              />
            </label>
          </div>

          <button type="submit" disabled={urlPending}>
            {urlPending ? "Ukládám…" : "Uložit"}
          </button>
        </form>

        <form
          action={rotateAction}
          onSubmit={(e) => {
            if (
              !confirm(
                "Vygenerovat nový secret? Starý přestane platit okamžitě — klientský web musí dostat nový."
              )
            ) {
              e.preventDefault();
            }
          }}
          style={{ marginTop: 12 }}
        >
          <input type="hidden" name="siteSlug" value={slug} />
          {rotateState.error && (
            <p style={{ color: "red" }}>{rotateState.error}</p>
          )}
          {rotateState.newSecret && (
            <p style={{ color: "green" }}>
              Nový secret: <code>{rotateState.newSecret}</code>
              <br />
              Zkopírujte si ho teď — znovu se nezobrazí.
            </p>
          )}
          <button type="submit" disabled={rotatePending}>
            {rotatePending ? "Generuji…" : "Vygenerovat nový secret"}
          </button>
        </form>
      </section>

      <section>
        <h2>Test</h2>
        <form action={testAction}>
          <input type="hidden" name="siteSlug" value={slug} />
          {testState.error && <p style={{ color: "red" }}>{testState.error}</p>}
          {testState.ok && (
            <p style={{ color: "green" }}>
              OK — odpověď HTTP {testState.status}
            </p>
          )}
          <button type="submit" disabled={testPending}>
            {testPending ? "Odesílám…" : "Odeslat testovací webhook"}
          </button>
        </form>
      </section>
    </div>
  );
}
