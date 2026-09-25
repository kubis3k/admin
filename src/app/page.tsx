import { redirect } from "next/navigation";

// Aplikace je jen admin + veřejné API — kořen vede rovnou do adminu.
export default function RootPage() {
  redirect("/admin");
}
