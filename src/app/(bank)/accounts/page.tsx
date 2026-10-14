"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getAccounts, errorMessage } from "@/lib/api";
import type { Account } from "@/lib/types";
import { AccountCard } from "@/components/account-card";
import { BalanceCurrencySelector } from "@/components/balance-display";
import { CreateAccount } from "@/components/create-account";
import { Empty, ErrorNotice, Loading } from "@/components/feedback";
import { Button } from "@/components/ui/button";
export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      setAccounts(await getAccounts());
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
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
          <h1 className="page-title">Миний данс</h1>
          <p className="page-description">Таны данс, үлдэгдэл — нэг дор.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BalanceCurrencySelector />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Дансны жагсаалт шинэчлэх"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw />
          </Button>
          <CreateAccount
            onCreated={(account) => {
              setNotice(`${account.accountNumber} данс амжилттай нээгдлээ.`);
              void load();
            }}
          />
        </div>
      </div>
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-success/10 p-4 text-sm text-success"
        >
          {notice}
        </p>
      )}
      {error ? (
        <ErrorNotice message={error} retry={() => void load()} />
      ) : loading ? (
        <Loading />
      ) : accounts.length ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.accountNumber} account={account} />
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            title="Данс байхгүй байна"
            description="Данс нээх товчийг дарж шинэ данс нээнэ үү."
          />
        </div>
      )}
    </div>
  );
}
