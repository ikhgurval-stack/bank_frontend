export interface User {
  username: string;
}
export interface CsrfToken {
  headerName: string;
  token: string;
  parameterName: string;
}
// BigDecimal JSON numbers are decoded losslessly into decimal strings.
export interface Account {
  accountNumber: string;
  balance: string;
  currency: string;
  status: string;
}
export interface Registration extends User {
  userId: string;
  accountNumber: string;
  balance: string;
}
export interface RegisterRequest extends User {
  fullName: string;
  password: string;
  confirmPassword: string;
}
export type Currency = "MNT" | "USD";
export interface Recipient {
  accountNumber: string;
  displayName: string;
  currency: string;
}
export interface TransferRequest {
  fromAccountNumber: string;
  toAccountNumber: string;
  amount: string;
  currency: Currency;
  description: string;
}
export interface Transfer extends Omit<TransferRequest, "currency"> {
  id: string;
  currency: string;
  requestedAmount: string;
  requestedCurrency: Currency;
  exchangeRate: string;
  status: string;
  createdAt: string;
}
export type Direction = "INCOMING" | "OUTGOING" | "INTERNAL";
export interface HistoryItem extends Transfer {
  direction: Direction;
}
export interface HistoryPage {
  items: HistoryItem[];
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
}
export interface HistoryFilters {
  keyword?: string;
  accountNumber?: string;
  currency?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}
