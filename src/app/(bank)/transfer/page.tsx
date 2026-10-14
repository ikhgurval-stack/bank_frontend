"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  ApiError,
  errorMessage,
  getAccounts,
  getRecipient,
  getTransfers,
  sendTransfer,
} from "@/lib/api";
import { DEMO_RATE_LABEL, money, settlementAmount } from "@/lib/format";
import { transferIntent, validateTransfer } from "@/lib/transfer";
import type {
  Account,
  Currency,
  Recipient,
  Transfer,
  TransferRequest,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty, ErrorNotice, Loading } from "@/components/feedback";
import { TransferDetails } from "@/components/transaction-list";

const initial: TransferRequest = {
  fromAccountNumber: "",
  toAccountNumber: "",
  amount: "",
  currency: "MNT",
  description: "",
};
export default function TransferPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [result, setResult] = useState<Transfer | null>(null);
  const [refreshError, setRefreshError] = useState("");
  const [recipientResult, setRecipientResult] = useState<{
    accountNumber: string;
    recipient?: Recipient;
    error?: string;
  } | null>(null);
  const [lookupRevision, setLookupRevision] = useState(0);
  const recipientNumber = form.toAccountNumber.trim().toUpperCase();
  const validRecipientNumber = /^DMB\d{12}$/.test(recipientNumber);
  const currentLookup =
    recipientResult?.accountNumber === recipientNumber ? recipientResult : null;
  const recipient = currentLookup?.recipient;
  const recipientLoading = validRecipientNumber && !currentLookup;
  useEffect(() => {
    if (!/^DMB\d{12}$/.test(recipientNumber)) return;
    let current = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const found = await getRecipient(recipientNumber, controller.signal);
        if (current)
          setRecipientResult({
            accountNumber: recipientNumber,
            recipient: found,
          });
      } catch (e) {
        if (current)
          setRecipientResult({
            accountNumber: recipientNumber,
            error: errorMessage(e),
          });
      }
    }, 400);
    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [recipientNumber, lookupRevision]);
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  const lock = useRef(false);
  function updateForm(changes: Partial<TransferRequest>) {
    // Any edit starts a new intent, even if the user later restores the old values.
    intent.current = null;
    setForm((current) => ({ ...current, ...changes }));
  }
  const load = useCallback(async () => {
    try {
      const list = await getAccounts();
      setAccounts(list);
      setLoadError("");
      const preferred = new URLSearchParams(window.location.search).get("from");
      setForm((current) => ({
        ...current,
        fromAccountNumber:
          current.fromAccountNumber ||
          list.find(
            (a) => a.accountNumber === preferred && a.status === "ACTIVE",
          )?.accountNumber ||
          list.find((a) => a.status === "ACTIVE")?.accountNumber ||
          "",
      }));
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    // This async request updates state only after the network response settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => {
    if (!busy && !uncertain) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, uncertain]);
  function confirm(event: FormEvent) {
    event.preventDefault();
    const request = {
      ...form,
      toAccountNumber: form.toAccountNumber.trim().toUpperCase(),
      description: form.description.trim(),
    };
    const validation = validateTransfer(request, accounts || []);
    if (validation) {
      setError(validation);
      return;
    }
    if (!recipient || recipient.accountNumber !== request.toAccountNumber) {
      setError("Хүлээн авагчийн мэдээллийг шалгасны дараа үргэлжлүүлнэ үү.");
      return;
    }
    setForm(request);
    intent.current = transferIntent(request, intent.current);
    setError("");
    setStep(2);
  }
  async function refresh() {
    setRefreshError("");
    try {
      const [list] = await Promise.all([
        getAccounts(),
        getTransfers({ page: 0, size: 5 }),
      ]);
      setAccounts(list);
    } catch {
      setRefreshError(
        "Шилжүүлэг амжилттай. Харин үлдэгдэл, түүхийг шинэчилж чадсангүй.",
      );
    }
  }
  async function send() {
    if (lock.current || !intent.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const transfer = await sendTransfer(form, intent.current.key);
      if (transfer.status !== "COMPLETED") {
        setError(
          "Гүйлгээний эцсийн төлөв баталгаажаагүй байна. Түүхээ шалгана уу.",
        );
        setUncertain(true);
        return;
      }
      setResult(transfer);
      setStep(3);
      setUncertain(false);
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
      if (!(e instanceof ApiError) || e.status === 0 || e.status >= 500)
        setUncertain(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const selected = accounts?.find(
    (a) => a.accountNumber === form.fromAccountNumber,
  );
  const previewAmount = /^\d{1,17}(\.\d{1,2})?$/.test(form.amount)
    ? settlementAmount(form.amount, form.currency)
    : null;
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title">Шилжүүлэг</h1>
      <p className="page-description">
        Өөрийн болон бусдын төгрөгийн данс руу шилжүүлэх.
      </p>
      <ol
        aria-label="Шилжүүлгийн алхам"
        className="my-8 grid grid-cols-3 gap-2"
      >
        {["Мэдээлэл оруулах", "Баталгаажуулах", "Үр дүн"].map(
          (label, index) => (
            <li
              key={label}
              aria-current={step === index + 1 ? "step" : undefined}
              className={`flex flex-col gap-2 border-t-2 pt-4 text-xs sm:flex-row sm:items-center sm:gap-3 sm:text-sm ${step >= index + 1 ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${step >= index + 1 ? "bg-primary/10" : "bg-accent"}`}
              >
                {step > index + 1 ? <Check size={14} /> : `0${index + 1}`}
              </span>
              {label}
            </li>
          ),
        )}
      </ol>
      {loadError ? (
        <ErrorNotice message={loadError} retry={() => void load()} />
      ) : !accounts ? (
        <Loading />
      ) : !accounts.some((a) => a.status === "ACTIVE") ? (
        <div className="panel p-6">
          <Empty
            title="Идэвхтэй данс байхгүй байна"
            description="Шилжүүлэг хийхийн тулд данс нээнэ үү."
          />
          <Button asChild>
            <Link href="/accounts">Миний данс</Link>
          </Button>
        </div>
      ) : (
        <div className="panel p-5 sm:p-8">
          {step === 1 && (
            <form onSubmit={confirm} noValidate className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Шилжүүлгийн мэдээлэл</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Хүлээн авах дансны дугаарыг нягтлан шалгана уу.
                </p>
              </div>
              {error && <ErrorNotice message={error} />}
              <div>
                <label htmlFor="from" className="field-label">
                  Илгээх данс
                </label>
                <select
                  id="from"
                  className="field"
                  value={form.fromAccountNumber}
                  onChange={(e) =>
                    updateForm({ fromAccountNumber: e.target.value })
                  }
                >
                  {accounts
                    .filter((a) => a.status === "ACTIVE")
                    .map((a) => (
                      <option key={a.accountNumber} value={a.accountNumber}>
                        {a.accountNumber} · {money(a.balance)}
                      </option>
                    ))}
                </select>
                {selected && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Боломжит үлдэгдэл:{" "}
                    <span className="font-medium text-foreground">
                      {money(selected.balance)}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="to" className="field-label">
                  Хүлээн авах дансны дугаар
                </label>
                <Input
                  id="to"
                  value={form.toAccountNumber}
                  onChange={(e) => {
                    setRecipientResult(null);
                    updateForm({
                      toAccountNumber: e.target.value.toUpperCase(),
                    });
                  }}
                  maxLength={15}
                  placeholder="DMB000000000000"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  aria-describedby="recipient-hint"
                />
                <p
                  id="recipient-hint"
                  className="mt-2 text-xs text-muted-foreground"
                >
                  DMB болон 12 оронтой дансны дугаар оруулна уу.
                </p>
                <div aria-live="polite" className="mt-3 text-sm">
                  {recipientLoading && (
                    <p className="text-muted-foreground">
                      Хүлээн авагчийг шалгаж байна…
                    </p>
                  )}
                  {currentLookup?.error && (
                    <ErrorNotice
                      message={currentLookup.error}
                      retry={() => {
                        setRecipientResult(null);
                        setLookupRevision((value) => value + 1);
                      }}
                    />
                  )}
                  {recipient && (
                    <div className="rounded-xl border bg-accent/50 p-4">
                      <p className="text-xs text-muted-foreground">
                        Хүлээн авагчийн нэр
                      </p>
                      <p className="mt-1 break-words font-semibold">
                        {recipient.displayName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_100px] gap-3">
                <div>
                  <label htmlFor="amount" className="field-label">
                    Мөнгөн дүн
                  </label>
                  <Input
                    id="amount"
                    inputMode={form.currency === "USD" ? "decimal" : "numeric"}
                    value={form.amount}
                    onChange={(e) => updateForm({ amount: e.target.value })}
                    maxLength={20}
                    placeholder="0"
                    required
                    aria-describedby="amount-hint"
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="field-label">
                    Валют
                  </label>
                  <select
                    id="currency"
                    className="field"
                    value={form.currency}
                    onChange={(e) =>
                      updateForm({ currency: e.target.value as Currency })
                    }
                  >
                    <option value="MNT">MNT</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <p
                id="amount-hint"
                className="-mt-4 text-xs text-muted-foreground"
              >
                {form.currency === "USD"
                  ? "Хамгийн багадаа 0.01 USD. Таслалаас хойш хоёр хүртэл оронтой."
                  : "Хамгийн багадаа 1 ₮. Зөвхөн бүхэл төгрөгөөр."}
              </p>
              {form.currency === "USD" && (
                <div className="rounded-xl border bg-accent/50 p-4 text-sm leading-6">
                  <p>{DEMO_RATE_LABEL}</p>
                  {previewAmount && (
                    <p className="font-semibold">
                      Шилжих дүн: {money(previewAmount)}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label htmlFor="description" className="field-label">
                  Гүйлгээний утга
                </label>
                <textarea
                  id="description"
                  className="field min-h-24 resize-y"
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  maxLength={255}
                  placeholder="Гүйлгээний утгаа оруулна уу"
                  required
                />
                <p className="mt-2 text-right text-xs text-muted-foreground">
                  {form.description.length}/255
                </p>
              </div>
              <div className="flex justify-end border-t pt-6">
                <Button type="submit" disabled={!recipient || recipientLoading}>
                  Үргэлжлүүлэх
                  <ArrowRight />
                </Button>
              </div>
            </form>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold">Мэдээллээ нягтлаарай</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Баталгаажуулсны дараа шилжүүлэг хийгдэнэ.
              </p>
              <p className="my-8 break-words text-center text-3xl font-semibold text-primary tabular-nums">
                {money(form.amount, form.currency)}
              </p>
              <dl className="mb-6 divide-y text-sm">
                {[
                  ["Илгээх данс", form.fromAccountNumber],
                  ["Хүлээн авах данс", form.toAccountNumber],
                  ["Бүртгэлтэй нэр", recipient?.displayName ?? ""],
                  ["Оруулсан дүн", money(form.amount, form.currency)],
                  ["Оруулсан валют", form.currency],
                  [
                    "Бодитоор шилжих дүн",
                    money(settlementAmount(form.amount, form.currency)),
                  ],
                  ["Гүйлгээний утга", form.description],
                ].map(([key, value]) => (
                  <div key={key} className="grid gap-2 py-4 sm:grid-cols-2">
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="break-all font-medium sm:text-right">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {form.currency === "USD" && (
                <div className="mb-5 text-sm leading-6 text-muted-foreground">
                  <p>{DEMO_RATE_LABEL}</p>
                  
                </div>
              )}
              {error && <ErrorNotice message={error} />}
              {uncertain && (
                <p
                  role="status"
                  className="mt-4 text-sm leading-6 text-muted-foreground"
                >
                  Үр дүн тодорхойгүй байна. Дахин баталгаажуулахад ижил
                  хүсэлтийн дугаар ашиглах тул давхар шилжүүлэхгүй. Энэ хуудсыг
                  хаахаас өмнө{" "}
                  <Link
                    href="/history"
                    target="_blank"
                    className="text-primary underline"
                  >
                    гүйлгээний түүхээ шинэ цонхонд шалгана уу
                  </Link>
                  .
                </p>
              )}
              <div className="mt-6 flex flex-wrap justify-between gap-3 border-t pt-6">
                <Button
                  variant="outline"
                  disabled={busy || uncertain}
                  onClick={() => {
                    setError("");
                    setStep(1);
                  }}
                >
                  <ArrowLeft />
                  Засах
                </Button>
                <Button onClick={send} disabled={busy}>
                  {busy
                    ? "Боловсруулж байна…"
                    : uncertain
                      ? "Ижил хүсэлтийг дахин шалгах"
                      : "Шилжүүлэг баталгаажуулах"}
                  <ArrowRight />
                </Button>
              </div>
            </div>
          )}
          {step === 3 && result && (
            <div>
              <div className="mb-7 text-center">
                <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
                  <Check size={30} />
                </span>
                <h2 className="text-2xl font-semibold">Шилжүүлэг амжилттай</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Таны шилжүүлэг баталгаажлаа.
                </p>
              </div>
              <TransferDetails transfer={result} />
              {refreshError && (
                <div className="mt-5">
                  <ErrorNotice
                    message={refreshError}
                    retry={() => void refresh()}
                  />
                </div>
              )}
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Тойм руу буцах</Link>
                </Button>
                <Button asChild>
                  <Link href="/history">
                    Гүйлгээний түүх
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
