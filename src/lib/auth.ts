import { cookies } from "next/headers";

// TODO (fáze 2): nahradit Auth.js v5 + SiteMembership tabulkou (role per site).
// Tohle je záměrně nejjednodušší možná věc, co jde vyměnit beze změny
// volajícího kódu (admin stránky volají jen requireAdmin()).
export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get("admin_session")?.value;

  if (token !== process.env.ADMIN_SESSION_SECRET) {
    throw new Error("Unauthorized — přihlas se do administrace");
  }
}
