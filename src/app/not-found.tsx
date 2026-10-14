import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="text-sm text-primary">404</p>
      <h1 className="page-title mt-4">Хуудас олдсонгүй</h1>
      <p className="page-description mb-6">Хуудасны хаягаа шалгана уу.</p>
      <Button asChild>
        <Link href="/dashboard">Нүүр рүү буцах</Link>
      </Button>
    </main>
  );
}
