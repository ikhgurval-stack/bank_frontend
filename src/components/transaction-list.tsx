"use client";
import { useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { getTransferDetail, errorMessage } from "@/lib/api";
import { dateTime, directionLabels, money, statusLabel } from "@/lib/format";
import type { HistoryItem, Transfer } from "@/lib/types";
import { Dialog } from "./ui/dialog";
import { Empty, ErrorNotice, Loading } from "./feedback";
export function TransferDetails({ transfer }: { transfer: Transfer }) {
  return (
    <dl className="divide-y text-sm">
      {[
        ["Гүйлгээний дугаар", transfer.id],
        ["Илгээх данс", transfer.fromAccountNumber],
        ["Хүлээн авах данс", transfer.toAccountNumber],
        [
          "Оруулсан дүн",
          money(
            transfer.requestedAmount ?? transfer.amount,
            transfer.requestedCurrency ?? "MNT",
          ),
        ],
        ["Оруулсан валют", transfer.requestedCurrency ?? "MNT"],
        [
          "Хэрэглэсэн ханш",
          `1 ${transfer.requestedCurrency ?? "MNT"} = ${money(transfer.exchangeRate ?? "1")}`,
        ],
        ["Бодитоор шилжсэн дүн", money(transfer.amount)],
        ["Шилжсэн валют", transfer.currency],
        ["Гүйлгээний утга", transfer.description],
        ["Огноо", dateTime(transfer.createdAt)],
        ["Төлөв", statusLabel(transfer.status)],
      ].map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 py-3 sm:grid-cols-[145px_1fr] sm:gap-4"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-all font-medium sm:text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function TransactionList({ items }: { items: HistoryItem[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<HistoryItem | null>(null);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  async function inspect(id: string) {
    const version = ++requestId.current;
    setSelected(id);
    setDetail(null);
    setError("");
    try {
      const item = await getTransferDetail(id);
      if (requestId.current === version) setDetail(item);
    } catch (e) {
      if (requestId.current === version) setError(errorMessage(e));
    }
  }
  if (!items.length)
    return (
      <Empty
        title="Гүйлгээ алга байна"
        description="Хийсэн болон хүлээн авсан шилжүүлэг энд харагдана."
      />
    );
  return (
    <>
      <div className="hidden grid-cols-[1fr_1fr_150px_110px] gap-4 border-b px-6 py-3 text-xs text-muted-foreground xl:grid">
        <span>Гүйлгээ / огноо</span>
        <span>Илгээх → хүлээн авах данс</span>
        <span className="text-right">Мөнгөн дүн</span>
        <span className="text-right">Төлөв</span>
      </div>
      <ul className="divide-y">
        {items.map((item) => {
          const Icon =
            item.direction === "INCOMING"
              ? ArrowDownLeft
              : item.direction === "OUTGOING"
                ? ArrowUpRight
                : ArrowLeftRight;
          return (
            <li key={item.id}>
              <button
                onClick={() => void inspect(item.id)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-5 text-left hover:bg-accent/60 sm:px-6 xl:grid-cols-[1fr_1fr_150px_110px] xl:gap-4"
                aria-label={`${item.description}, ${money(item.amount)}, дэлгэрэнгүй харах`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.direction === "INCOMING" ? "bg-success/10 text-success" : "bg-accent text-primary"}`}
                  >
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {item.description}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {dateTime(item.createdAt)}
                    </span>
                  </span>
                </span>
                <span className="hidden font-mono text-[11px] leading-5 text-muted-foreground xl:block">
                  {item.fromAccountNumber}
                  <br />
                  <span aria-hidden="true">→ </span>
                  {item.toAccountNumber}
                </span>
                <span className="min-w-0 text-right">
                  <span
                    className={`block text-sm font-semibold tabular-nums ${item.direction === "INCOMING" ? "text-success" : ""}`}
                  >
                    {item.direction === "INCOMING"
                      ? "+"
                      : item.direction === "OUTGOING"
                        ? "−"
                        : ""}
                    {money(item.amount)}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    Оруулсан:{" "}
                    {money(
                      item.requestedAmount ?? item.amount,
                      item.requestedCurrency ?? "MNT",
                    )}{" "}
                    {item.requestedCurrency ?? "MNT"}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {directionLabels[item.direction]} · {item.currency}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground xl:hidden">
                    {statusLabel(item.status)}
                  </span>
                </span>
                <span className="hidden text-right text-xs text-success xl:block">
                  {statusLabel(item.status)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            requestId.current++;
            setSelected(null);
            setDetail(null);
          }
        }}
        title="Гүйлгээний дэлгэрэнгүй"
        description="Таны данстай холбоотой гүйлгээний мэдээлэл."
      >
        {error ? (
          <ErrorNotice
            message={error}
            retry={() => {
              if (selected) void inspect(selected);
            }}
          />
        ) : detail ? (
          <>
            <p className="mb-3 text-sm font-medium text-primary">
              {directionLabels[detail.direction]}
            </p>
            <TransferDetails transfer={detail} />
          </>
        ) : (
          <Loading />
        )}
      </Dialog>
    </>
  );
}
