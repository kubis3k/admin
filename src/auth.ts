import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { createTransport } from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

// ---------------------------------------------------------------------------
// Auth.js v5 — magic link přes e-mail (Nodemailer), database sessions.
// Žádná self-registrace: odkaz se pošle jen na e-mail, který už existuje
// v `users` (viz sendVerificationRequest) — účty vznikají ručním insertem.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === "production" && !process.env.EMAIL_SERVER) {
  throw new Error("EMAIL_SERVER není nastavený — magic link nejde odeslat");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  providers: [
    Nodemailer({
      // Nodemailer provider bez `server` hodí chybu už při importu — v devu
      // bez SMTP proto placeholder, odkaz se jen vypíše (viz níže).
      server: process.env.EMAIL_SERVER ?? "smtp://localhost:25",
      from: process.env.EMAIL_FROM ?? "admin@localhost",
      async sendVerificationRequest({ identifier: email, url }) {
        const normalizedEmail = email.toLowerCase();

        // Tichý skip, pokud účet neexistuje — žádná chyba = žádná enumerace účtů.
        const existing = await db.query.users.findFirst({
          where: eq(users.email, normalizedEmail),
        });
        if (!existing) return;

        // Dev fallback: bez nastaveného SMTP mimo produkci jen vypiš odkaz do konzole.
        if (process.env.NODE_ENV !== "production" && !process.env.EMAIL_SERVER) {
          console.log(`[dev] přihlašovací odkaz pro ${normalizedEmail}: ${url}`);
          return;
        }

        const transport = createTransport(process.env.EMAIL_SERVER!);
        await transport.sendMail({
          to: email,
          from: process.env.EMAIL_FROM,
          subject: "Přihlášení do administrace",
          text: `Přihlaste se kliknutím na odkaz: ${url}`,
          html: `<p>Přihlaste se kliknutím na odkaz níže:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    }),
  ],
  callbacks: {
    async signIn({ user, email }) {
      // Krok 1 (odeslání odkazu) rozhodne sendVerificationRequest výše.
      if (email?.verificationRequest) return true;

      // Krok 2 (klik na odkaz) — defense in depth: povol jen existující účet.
      if (!user.email) return false;
      const existing = await db.query.users.findFirst({
        where: eq(users.email, user.email.toLowerCase()),
      });
      return Boolean(existing);
    },
  },
  pages: {
    signIn: "/admin/login",
    verifyRequest: "/admin/login",
    error: "/admin/login",
  },
});
