"use client";
import { ErrorNotice } from "@/components/feedback";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl p-8">
      <ErrorNotice
        message="Хуудсыг харуулахад алдаа гарлаа. Дахин оролдоно уу."
        retry={reset}
      />
    </main>
  );
}
