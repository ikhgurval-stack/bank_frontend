"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Copy, Wallet } from "lucide-react";
import type { Account } from "@/lib/types";
import { statusLabel } from "@/lib/format";
import { BalanceDisplay } from "./balance-display";
import { Button } from "./ui/button";
export function AccountCard({ account }: { account: Account }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setMessage("Дансны дугаар хуулагдлаа.");
    } catch {
      setMessage("Хуулж чадсангүй. Дугаарыг сонгож хуулна уу.");
    }
  }
  return (
    <article className="panel overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="mb-7 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Wallet size={18} className="text-primary" />
            Төгрөгийн данс
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${account.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-accent text-muted-foreground"}`}
          >
            {statusLabel(account.status)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Боломжит үлдэгдэл</p>
        <BalanceDisplay
          amount={account.balance}
          className="mt-2 break-words text-2xl font-semibold tracking-tight tabular-nums"
        />
        <div className="mt-6 flex items-center justify-between gap-2">
          <span className="select-all font-mono text-sm tracking-wide">
            {account.accountNumber}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={copy}
            aria-label={`${account.accountNumber} дансны дугаар хуулах`}
          >
            {message.startsWith("Дансны") ? <Check /> : <Copy />}
          </Button>
        </div>
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      </div>
      <div className="flex items-center justify-between border-t bg-background/50 px-5 py-3">
        <span className="text-xs font-medium text-muted-foreground">
          {account.currency}
        </span>
        {account.status === "ACTIVE" && (
          <Button variant="ghost" size="sm" asChild className="text-primary">
            <Link href={`/transfer?from=${account.accountNumber}`}>
              Шилжүүлэх
              <ArrowUpRight />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
