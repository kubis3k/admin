import { auth, signIn, signOut } from "@/auth";

// Povolí jen relativní cestu (začíná "/" a ne "//") — jinak vždy /admin,
// aby callbackUrl z query nešel zneužít pro open redirect.
function safeCallbackUrl(callbackUrl: string | undefined): string {
  if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }
  return "/admin";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; type?: string; error?: string }>;
}) {
  const { callbackUrl, type, error } = await searchParams;
  // Auth.js přesměruje po odeslání odkazu na verifyRequest s ?provider=…&type=email
  const sent = type === "email";
  const session = await auth();

  if (session?.user) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: 24 }}>
        <p>Přihlášen jako {session.user.email}</p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
        >
          <button type="submit">Odhlásit se</button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "80px auto", padding: 24 }}>
      <h1>Přihlášení do administrace</h1>

      {sent && <p>Zkontrolujte e-mail, poslali jsme přihlašovací odkaz (pokud účet existuje).</p>}
      {error && <p>Přihlášení se nezdařilo, zkuste to prosím znovu.</p>}

      <form
        action={async (formData: FormData) => {
          "use server";
          await signIn("nodemailer", {
            email: String(formData.get("email")),
            redirectTo: safeCallbackUrl(callbackUrl),
          });
        }}
      >
        <input name="email" type="email" placeholder="E-mail" required />
        <button type="submit">Poslat přihlašovací odkaz</button>
      </form>
    </main>
  );
}
