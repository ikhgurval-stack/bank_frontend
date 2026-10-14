"use client";
import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createAccount, errorMessage } from "@/lib/api";
import type { Account } from "@/lib/types";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { ErrorNotice } from "./feedback";
export function CreateAccount({
  onCreated,
}: {
  onCreated: (account: Account) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  async function create() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const account = await createAccount();
      onCreated(account);
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
      setUncertain(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setError("");
          setUncertain(false);
          setOpen(true);
        }}
      >
        <Plus />
        Данс нээх
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
        title="Шинэ данс нээх"
        description="Нэмэлт төгрөгийн данс 0.00 ₮ үлдэгдэлтэй нээгдэнэ."
      >
        <p className="mb-6 text-sm leading-6 text-muted-foreground">
          Та өөрийн бусад данснаас эсвэл өөр хэрэглэгчээс шилжүүлэг хүлээн авч
          болно.
        </p>
        {error && <ErrorNotice message={error} />}
        {uncertain && (
          <p className="mt-4 text-sm text-muted-foreground">
            Дахин данс нээхээс өмнө цонхыг хааж, дансны жагсаалтаа шинэчилж
            шалгана уу.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Хаах
          </Button>
          <Button disabled={busy || uncertain} onClick={create}>
            {busy ? "Нээж байна…" : "Данс нээх"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
