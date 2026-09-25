import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Forbidden() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>403 — nemáte přístup k tomuto webu</CardTitle>
          <CardDescription>
            Zkuste se přihlásit jiným účtem nebo se vraťte na přehled.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">Přehled</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/login">Přihlášení</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
