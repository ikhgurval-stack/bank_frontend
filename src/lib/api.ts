import { isLosslessNumber, parse } from "lossless-json";
import type {
  Account,
  CsrfToken,
  HistoryFilters,
  HistoryItem,
  HistoryPage,
  Registration,
  Recipient,
  RegisterRequest,
  Transfer,
  TransferRequest,
  User,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
const translations: Record<string, string> = {
  "Invalid full name": "Овог, нэрээ 2–120 тэмдэгтээр оруулна уу.",
  "Invalid account number":
    "Дансны дугаар DMB болон 12 оронтой тооноос бүрдэнэ.",
  "Amount must be greater than zero": "Шилжүүлэх дүн тэгээс их байх ёстой.",
  "MNT amount must be a whole number":
    "Төгрөгийн дүнг бүхэл тоогоор оруулна уу.",
  "USD amount supports up to 2 decimal places":
    "USD дүн таслалаас хойш хоёр хүртэл оронтой байна.",
  "Only MNT and USD are supported": "Зөвхөн MNT эсвэл USD сонгоно уу.",
  "Amount exceeds the allowed limit":
    "Оруулсан дүн зөвшөөрөгдөх хэмжээнээс хэтэрсэн байна.",
  "Converted amount exceeds the allowed limit":
    "Төгрөгт шилжүүлсэн дүн зөвшөөрөгдөх хэмжээнээс хэтэрсэн байна.",
  "Account currency mismatch": "Дансны валют таарахгүй байна.",
  "Invalid sender or recipient account":
    "Илгээх болон хүлээн авах дансаа шалгана уу. Ижил данс руу шилжүүлэх боломжгүй.",
  "Invalid username or password": "Нэвтрэх нэр эсвэл нууц үг буруу байна.",
  "Username already exists": "Энэ нэвтрэх нэр бүртгэлтэй байна.",
  "Passwords do not match": "Нууц үгс таарахгүй байна.",
  "Recipient account not found":
    "Хүлээн авах данс олдсонгүй. Дансны дугаараа шалгана уу.",
  "Sender account not found": "Шилжүүлэх данс олдсонгүй.",
  "Same account": "Илгээх болон хүлээн авах данс ялгаатай байх ёстой.",
  "Invalid MNT amount": "Шилжүүлэх дүнг бүхэл төгрөгөөр оруулна уу.",
  "Only MNT is supported": "Зөвхөн төгрөгөөр шилжүүлэг хийнэ.",
  "Unsupported currency": "Зөвхөн MNT эсвэл USD сонгоно уу.",
  "Currency mismatch": "Дансны валют таарахгүй байна.",
  "Invalid description": "Гүйлгээний утгыг 1–255 тэмдэгтээр оруулна уу.",
  "Invalid date range": "Эхлэх огноо дуусах огнооноос хойш байж болохгүй.",
  "Keyword too long": "Хайх үг 100-аас ихгүй тэмдэгттэй байна.",
  "Transfer not found": "Гүйлгээ олдсонгүй эсвэл танд харах эрх байхгүй байна.",
  "Transfer conflict":
    "Шилжүүлэг хийгдсэнгүй. Дансны үлдэгдэл, төлөв болон гүйлгээний түүхээ шалгана уу.",
};
const statusMessages: Record<number, string> = {
  400: "Мэдээллээ шалгаад дахин оролдоно уу.",
  401: "Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү.",
  403: "Хүсэлтийг зөвшөөрсөнгүй. Эрхээ шалгах эсвэл дахин оролдоно уу.",
  404: "Хүссэн мэдээлэл олдсонгүй.",
  409: "Хүсэлт давхардсан эсвэл дансны төлөв тохирохгүй байна.",
  500: "Серверт алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.",
  502: "Банкны сервертэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.",
  503: "Банкны үйлчилгээ түр боломжгүй байна.",
  504: "Серверийн хариу удаж байна. Дахин оролдоно уу.",
};
let csrfPromise: Promise<CsrfToken> | null = null;
export function clearAuthCache() {
  csrfPromise = null;
}
export function decodeJson(text: string): unknown {
  return parse(text, (key, value: unknown) =>
    isLosslessNumber(value)
      ? ["balance", "amount", "requestedAmount", "exchangeRate"].includes(key)
        ? value.toString()
        : Number(value.toString())
      : value,
  );
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  let raw: string;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(20000),
    });
    raw = response.status === 204 ? "" : await response.text();
  } catch {
    throw new ApiError(
      0,
      "Сервертэй холбогдож чадсангүй. Хүсэлт боловсруулагдсан эсэх нь тодорхойгүй байна. Холболт болон гүйлгээний түүхээ шалгана уу.",
    );
  }
  let data: unknown;
  try {
    data = raw ? decodeJson(raw) : undefined;
  } catch {
    data = undefined;
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) clearAuthCache();
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("session-expired"));
    const error =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "";
    throw new ApiError(
      response.status,
      translations[error] ||
        statusMessages[response.status] ||
        "Хүсэлтийг боловсруулахад алдаа гарлаа.",
    );
  }
  if (raw && data === undefined)
    throw new ApiError(500, "Серверээс буруу хариу ирлээ. Дахин оролдоно уу.");
  return data as T;
}
export function getCsrf(): Promise<CsrfToken> {
  if (!csrfPromise)
    csrfPromise = request<CsrfToken>("/auth/csrf").catch((error) => {
      csrfPromise = null;
      throw error;
    });
  return csrfPromise;
}
async function post<T>(
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  // Fetch a fresh token for every mutation. Never automatically replay a POST.
  clearAuthCache();
  const csrf = await getCsrf();
  return request<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
export const register = (body: RegisterRequest) =>
  post<Registration>("/auth/register", body);
export async function login(username: string, password: string) {
  const user = await post<User>("/auth/login", { username, password });
  clearAuthCache();
  await getCsrf();
  return user;
}
export async function logout() {
  await post<void>("/auth/logout");
  clearAuthCache();
}
export const getCurrentUser = () => request<User>("/auth/me");
export const getAccounts = () => request<Account[]>("/accounts/me");
export const createAccount = () => post<Account>("/accounts");
export const getRecipient = (accountNumber: string, signal?: AbortSignal) =>
  request<Recipient>(
    `/accounts/recipient?${new URLSearchParams({ accountNumber })}`,
    { signal },
  );
export const sendTransfer = (body: TransferRequest, key: string) =>
  post<Transfer>("/transfers", body, { "Idempotency-Key": key });
export function getTransfers(filters: HistoryFilters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return request<HistoryPage>(`/transfers?${query}`);
}
export const getTransferDetail = (id: string) =>
  request<HistoryItem>(`/transfers/${encodeURIComponent(id)}`);
export const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "Алдаа гарлаа. Дахин оролдоно уу.";
