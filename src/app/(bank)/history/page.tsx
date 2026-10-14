"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { getTransfers, errorMessage } from "@/lib/api";
import type { HistoryFilters, HistoryPage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice, Loading } from "@/components/feedback";
import { TransactionList } from "@/components/transaction-list";
const defaults = {
  keyword: "",
  accountNumber: "",
  currency: "",
  fromDate: "",
  toDate: "",
};
export default function HistoryPageView() {
  const [draft, setDraft] = useState(defaults);
  const [filters, setFilters] = useState<HistoryFilters>({ page: 0, size: 10 });
  const [result, setResult] = useState<HistoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const page = await getTransfers(filters);
        if (current) setResult(page);
      } catch (e) {
        if (current) setError(errorMessage(e));
      } finally {
        if (current) setLoading(false);
      }
    }
    void load();
    return () => {
      current = false;
    };
  }, [filters, revision]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setValidation("Эхлэх огноо дуусах огнооноос хойш байж болохгүй.");
      return;
    }
    setValidation("");
    setFilters({
      ...draft,
      keyword: draft.keyword.trim(),
      accountNumber: draft.accountNumber.trim(),
      page: 0,
      size: filters.size,
    });
  }
  return (
    <div>
      <h1 className="page-title">Гүйлгээний түүх</h1>
      <form onSubmit={submit} className="panel my-7 space-y-5 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal size={16} className="text-primary" />
          Хайлт ба шүүлтүүр
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label htmlFor="keyword" className="field-label">
              Хайх үг
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-4 size-4 text-muted-foreground" />
              <Input
                id="keyword"
                className="pl-10"
                value={draft.keyword}
                onChange={(e) =>
                  setDraft({ ...draft, keyword: e.target.value })
                }
                maxLength={100}
                placeholder="Гүйлгээний утгаар хайх"
              />
            </div>
          </div>
          <div>
            <label htmlFor="account-filter" className="field-label">
              Дансны дугаар
            </label>
            <Input
              id="account-filter"
              value={draft.accountNumber}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  accountNumber: e.target.value.toUpperCase(),
                })
              }
              maxLength={15}
              placeholder="Бүх данс"
            />
          </div>
          <div>
            <label htmlFor="currency-filter" className="field-label">
              Оруулсан валют
            </label>
            <select
              id="currency-filter"
              className="field"
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            >
              <option value="">Бүх валют</option>
              <option value="MNT">MNT · Төгрөг</option>
              <option value="USD">USD · Ам.доллар</option>
            </select>
          </div>
          <div>
            <label htmlFor="from-date" className="field-label">
              Эхлэх огноо
            </label>
            <Input
              id="from-date"
              type="date"
              value={draft.fromDate}
              onChange={(e) => setDraft({ ...draft, fromDate: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="to-date" className="field-label">
              Дуусах огноо
            </label>
            <Input
              id="to-date"
              type="date"
              value={draft.toDate}
              min={draft.fromDate || undefined}
              onChange={(e) => setDraft({ ...draft, toDate: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={loading}>
              <Search />
              Хайх
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={loading}
              onClick={() => {
                setDraft(defaults);
                setValidation("");
                setFilters({ page: 0, size: filters.size });
              }}
            >
              Цэвэрлэх
            </Button>
          </div>
        </div>
        {validation && <ErrorNotice message={validation} />}
      </form>
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-5 sm:px-6">
          <h2 className="font-semibold">
            Гүйлгээнүүд{" "}
            {!loading && !error && result && (
              <span className="ml-2 rounded-md bg-accent px-2 py-1 text-xs text-muted-foreground">
                {result.totalElements}
              </span>
            )}
          </h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Нэг хуудсанд
            <select
              className="rounded-lg border bg-card p-2 text-foreground"
              aria-label="Нэг хуудсанд харуулах тоо"
              value={filters.size}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  size: Number(e.target.value),
                  page: 0,
                })
              }
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="p-5">
            <ErrorNotice
              message={error}
              retry={() => setRevision((value) => value + 1)}
            />
          </div>
        ) : (
          result && (
            <>
              <TransactionList items={result.items} />
              <div className="flex items-center justify-between gap-2 border-t px-4 py-4 sm:px-6">
                <p className="text-xs text-muted-foreground">
                  {result.totalPages
                    ? `${result.page + 1} / ${result.totalPages} хуудас`
                    : "0 гүйлгээ"}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page === 0}
                    aria-label="Өмнөх хуудас"
                    onClick={() =>
                      setFilters({ ...filters, page: result.page - 1 })
                    }
                  >
                    <ChevronLeft />
                    <span className="hidden sm:inline">Өмнөх</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page + 1 >= result.totalPages}
                    aria-label="Дараах хуудас"
                    onClick={() =>
                      setFilters({ ...filters, page: result.page + 1 })
                    }
                  >
                    <span className="hidden sm:inline">Дараах</span>
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </>
          )
        )}
      </section>
    </div>
  );
}
