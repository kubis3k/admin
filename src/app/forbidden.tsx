import Link from "next/link";

export default function Forbidden() {
  return (
    <main style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <h1>403 — nemáte přístup k tomuto webu</h1>
      <p>
        <Link href="/admin/login">Přejít na přihlášení</Link>
      </p>
    </main>
  );
}
