"use client";
import { useSyncExternalStore } from "react";
import { DEMO_RATE_LABEL, money, usdEquivalent } from "@/lib/format";
import type { Currency } from "@/lib/types";

const preferenceKey = "mnt-flow:display-currency";
let memoryPreference: Currency = "MNT";
let memoryOnly = false;
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("balance-currency-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("balance-currency-change", onChange);
  };
}
function snapshot(): Currency {
  if (memoryOnly) return memoryPreference;
  try {
    return localStorage.getItem(preferenceKey) === "USD" ? "USD" : "MNT";
  } catch {
    return memoryPreference;
  }
}
function useDisplayCurrency() {
  return useSyncExternalStore(subscribe, snapshot, (): Currency => "MNT");
}
function selectCurrency(currency: Currency) {
  memoryPreference = currency;
  try {
    localStorage.setItem(preferenceKey, currency);
    memoryOnly = false;
  } catch {
    memoryOnly = true;
  }
  window.dispatchEvent(new Event("balance-currency-change"));
}
export function BalanceCurrencySelector() {
  const currency = useDisplayCurrency();
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Үлдэгдэл харах валют
      <select
        aria-label="Үлдэгдэл харах валют"
        className="rounded-xl border bg-card px-3 py-3 text-sm text-foreground"
        value={currency}
        onChange={(e) => selectCurrency(e.target.value as Currency)}
      >
        <option value="MNT">MNT</option>
        <option value="USD">USD</option>
      </select>
    </label>
  );
}
export function BalanceDisplay({
  amount,
  className = "",
  secondaryClassName = "text-muted-foreground",
}: {
  amount: string;
  className?: string;
  secondaryClassName?: string;
}) {
  const currency = useDisplayCurrency();
  return (
    <div>
      <p className={className}>
        {currency === "USD"
          ? `≈ ${money(usdEquivalent(amount), "USD")}`
          : money(amount)}
      </p>
      {currency === "USD" && (
        <div className={`mt-2 text-xs leading-5 ${secondaryClassName}`}>
          <p>Бодит үлдэгдэл: {money(amount)}</p>
          <p>Ойролцоо дүн · Демо хөрвүүлэлт</p>
          <p>{DEMO_RATE_LABEL}</p>
        </div>
      )}
    </div>
  );
}
