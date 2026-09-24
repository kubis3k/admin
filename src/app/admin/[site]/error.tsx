"use client";

// Server actions při neplatném vstupu hází Error — v produkci Next zprávu
// skryje (jen digest), proto obecná hláška. TODO: vracet chyby do formuláře
// přes useActionState (viz notes/Rozhodnutí.md).
export default function AdminSiteError({ reset }: { reset: () => void }) {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Uložení se nezdařilo</h1>
      <p>
        Zkontrolujte zadané hodnoty (např. datum, čas, cenu nebo URL obrázku) a
        zkuste to znovu.
      </p>
      <button type="button" onClick={() => reset()}>
        Zpět na formulář
      </button>
    </main>
  );
}
