"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Wallet } from "lucide-react";
import { getAccounts, getTransfers, errorMessage } from "@/lib/api";
import { totalBalance } from "@/lib/format";
import {
  BalanceCurrencySelector,
  BalanceDisplay,
} from "@/components/balance-display";
import type { Account, HistoryPage } from "@/lib/types";
import { useAuth } from "@/components/providers";
import { AccountCard } from "@/components/account-card";
import { CreateAccount } from "@/components/create-account";
import { TransactionList } from "@/components/transaction-list";
import { Empty, ErrorNotice, Loading } from "@/components/feedback";
import { Button } from "@/components/ui/button";
export default function DashboardPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [history, setHistory] = useState<HistoryPage | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [a, h] = await Promise.all([
        getAccounts(),
        getTransfers({ size: 5, page: 0 }),
      ]);
      setAccounts(a);
      setHistory(h);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    // This async request updates state only after the network response settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            ТАВТАЙ МОРИЛ
          </p>
          <h1 className="page-title break-all">
            Сайн байна уу, {user?.username}.
          </h1>
          <p className="page-description">Өнөөдрийн санхүүгийн тойм.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BalanceCurrencySelector />
          <CreateAccount onCreated={() => void load()} />
        </div>
      </div>
      {error ? (
        <ErrorNotice message={error} retry={() => void load()} />
      ) : !accounts || !history ? (
        <Loading />
      ) : (
        <>
          <section className="mb-8 grid gap-5 md:grid-cols-[1.8fr_1fr]">
            <div className="relative overflow-hidden rounded-2xl bg-[#153361] p-6 text-white sm:p-8">
              <div className="flex items-center gap-2 text-sm text-blue-100">
                <Wallet size={18} />
                Нийт үлдэгдэл
                <span className="ml-auto rounded-md border border-white/20 px-2 py-1 text-[10px] tracking-widest">
                  MNT
                </span>
              </div>
              <BalanceDisplay
                className="mt-5 break-words text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl"
                secondaryClassName="text-blue-100"
                amount={totalBalance(
                  accounts
                    .filter((a) => a.currency === "MNT")
                    .map((a) => a.balance),
                )}
              />
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs text-blue-100">
                  Бүх төгрөгийн дансны нийлбэр
                </span>
                <Button
                  asChild
                  className="bg-white text-[#153361] hover:bg-blue-50"
                >
                  <Link href="/transfer">
                    Шилжүүлэх
                    <ArrowUpRight />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="panel flex flex-col justify-between p-6 sm:p-8">
              <div>
                <p className="text-sm text-muted-foreground">Идэвхтэй данс</p>
                <p className="mt-4 text-4xl font-semibold">
                  {accounts
                    .filter((a) => a.status === "ACTIVE")
                    .length.toString()
                    .padStart(2, "0")}
                </p>
              </div>
              <Link
                href="/accounts"
                className="mt-5 flex items-center justify-between border-t pt-4 text-sm font-medium"
              >
                Данснуудаа харах
                <ArrowRight size={17} className="text-primary" />
              </Link>
            </div>
          </section>
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Миний данс</h2>
              <Link
                href="/accounts"
                className="text-sm font-medium text-primary"
              >
                Бүгдийг харах →
              </Link>
            </div>
            {accounts.length ? (
              <div className="grid gap-5 md:grid-cols-2">
                {accounts.slice(0, 2).map((account) => (
                  <AccountCard key={account.accountNumber} account={account} />
                ))}
              </div>
            ) : (
              <div className="panel">
                <Empty
                  title="Данс байхгүй байна"
                  description="Данс нээж эхлээрэй."
                />
              </div>
            )}
          </section>
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b px-5 py-5 sm:px-6">
              <h2 className="font-semibold">Сүүлийн гүйлгээнүүд</h2>
              <Link
                href="/history"
                className="shrink-0 text-xs font-medium text-primary sm:text-sm"
              >
                Бүгдийг харах →
              </Link>
            </div>
            <TransactionList items={history.items} />
          </section>
        </>
      )}
    </div>
  );
}
