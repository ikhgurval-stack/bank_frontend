import type { Account, TransferRequest } from "./types";
import { minorUnits, settlementAmount } from "./format";
export function validateTransfer(
  request: TransferRequest,
  accounts: Account[],
): string {
  const source = accounts.find(
    (account) =>
      account.accountNumber === request.fromAccountNumber &&
      account.status === "ACTIVE",
  );
  if (!source) return "Идэвхтэй илгээх данс сонгоно уу.";
  if (!/^DMB\d{12}$/.test(request.toAccountNumber))
    return "Хүлээн авах данс DMB болон 12 оронтой тооноос бүрдэнэ.";
  if (request.fromAccountNumber === request.toAccountNumber)
    return "Илгээх болон хүлээн авах данс ялгаатай байх ёстой.";
  const pattern =
    request.currency === "USD" ? /^\d{1,17}(\.\d{1,2})?$/ : /^\d{1,17}$/;
  if (!pattern.test(request.amount))
    return request.currency === "USD"
      ? "USD дүнг таслалаас хойш хоёр хүртэл оронтой оруулна уу. Бүхэл хэсэг 17-оос ихгүй оронтой байна."
      : "Төгрөгийн дүнг 17-оос ихгүй оронтой бүхэл тоогоор оруулна уу.";
  if (minorUnits(request.amount) === 0n)
    return "Шилжүүлэх дүн тэгээс их байх ёстой.";
  const settled = minorUnits(
    settlementAmount(request.amount, request.currency),
  );
  if (settled > 9999999999999999999n)
    return "Төгрөгт шилжүүлсэн дүн зөвшөөрөгдөх хэмжээнээс хэтэрсэн байна.";
  if (settled > minorUnits(source.balance))
    return "Шилжүүлэг хийхэд төгрөгийн үлдэгдэл хүрэлцэхгүй байна.";
  if (!request.description.trim() || request.description.length > 255)
    return "Гүйлгээний утгыг 1–255 тэмдэгтээр оруулна уу.";
  return "";
}
export function transferFingerprint(request: TransferRequest) {
  return JSON.stringify([
    request.fromAccountNumber,
    request.toAccountNumber,
    request.amount,
    request.currency,
    request.description,
  ]);
}
export function transferIntent(
  request: TransferRequest,
  previous: { fingerprint: string; key: string } | null,
) {
  const fingerprint = transferFingerprint(request);
  return previous?.fingerprint === fingerprint
    ? previous
    : { fingerprint, key: crypto.randomUUID() };
}
