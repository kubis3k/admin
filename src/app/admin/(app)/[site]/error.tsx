"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Server actions při neplatném vstupu hází Error — v produkci Next zprávu
// skryje (jen digest), proto obecná hláška. TODO: vracet chyby do formuláře
// přes useActionState (viz notes/Rozhodnutí.md).
export default function AdminSiteError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Uložení se nezdařilo</CardTitle>
          <CardDescription>
            Zkontrolujte zadané hodnoty (např. datum, čas, cenu nebo URL
            obrázku) a zkuste to znovu.
          </CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">Zpět na přehled</Link>
          </Button>
          <Button onClick={() => reset()}>Zkusit znovu</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
