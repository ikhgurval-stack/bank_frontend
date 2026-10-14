import type { Currency } from "./types";

// Display/preview only. Spring Boot independently applies its own demo rate.
export const DEMO_USD_RATE = 3600n;
export const DEMO_RATE_LABEL = "Туршилтын ханш: 1 USD = 3,600 MNT";

export function minorUnits(value: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Invalid monetary value");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export function decimalFromMinor(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}
export function money(value: string, currency: Currency = "MNT"): string {
  const cents = minorUnits(value);
  const whole = new Intl.NumberFormat("mn-MN").format(cents / 100n);
  const amount = `${whole}.${(cents % 100n).toString().padStart(2, "0")}`;
  return currency === "USD" ? `$${amount}` : `${amount} ₮`;
}
export function usdEquivalent(mnt: string): string {
  // Round to the nearest USD cent (half up) without Number conversion.
  return decimalFromMinor(
    (minorUnits(mnt) + DEMO_USD_RATE / 2n) / DEMO_USD_RATE,
  );
}
export function settlementAmount(amount: string, currency: Currency): string {
  return decimalFromMinor(
    minorUnits(amount) * (currency === "USD" ? DEMO_USD_RATE : 1n),
  );
}
export function totalBalance(values: string[]): string {
  const cents = values.reduce((sum, value) => sum + minorUnits(value), 0n);
  return decimalFromMinor(cents);
}
export function dateTime(value: string): string {
  // Some browsers lack Mongolian date data and fall back to English month names.
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Ulaanbaatar",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}.${part("month")}.${part("day")} ${part("hour")}:${part("minute")}`;
}
export const directionLabels = {
  INCOMING: "Орлого",
  OUTGOING: "Зарлага",
  INTERNAL: "Өөрийн данс хооронд",
};
export function statusLabel(status: string) {
  return (
    (
      {
        ACTIVE: "Идэвхтэй",
        COMPLETED: "Амжилттай",
        INACTIVE: "Идэвхгүй",
        BLOCKED: "Хязгаарласан",
        CLOSED: "Хаагдсан",
        PENDING: "Хүлээгдэж буй",
        FAILED: "Амжилтгүй",
      } as Record<string, string>
    )[status] || "Тодорхойгүй"
  );
}
