import { auth, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-lg">gastro-admin</CardTitle>
            <CardDescription>Přihlášen jako {session.user.email}</CardDescription>
          </CardHeader>
          <CardFooter>
            <form
              className="w-full"
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <Button type="submit" variant="outline" className="w-full">
                Odhlásit se
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">gastro-admin</CardTitle>
          <CardDescription>Přihlášení do administrace</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sent && (
            <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Zkontrolujte e-mail, poslali jsme přihlašovací odkaz (pokud účet
              existuje).
            </p>
          )}
          {error && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Přihlášení se nezdařilo, zkuste to prosím znovu.
            </p>
          )}

          <form
            className="flex flex-col gap-4"
            action={async (formData: FormData) => {
              "use server";
              await signIn("nodemailer", {
                email: String(formData.get("email")),
                redirectTo: safeCallbackUrl(callbackUrl),
              });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full">
              Poslat přihlašovací odkaz
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
