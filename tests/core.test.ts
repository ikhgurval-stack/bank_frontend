import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import {
  ApiError,
  clearAuthCache,
  createAccount,
  decodeJson,
  getTransfers,
  login,
  logout,
  sendTransfer,
} from "../src/lib/api";
import {
  minorUnits,
  totalBalance,
  settlementAmount,
  usdEquivalent,
  money,
} from "../src/lib/format";
import { transferIntent, validateTransfer } from "../src/lib/transfer";
import type { Account, TransferRequest } from "../src/lib/types";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  clearAuthCache();
});
const request: TransferRequest = {
  fromAccountNumber: "DMB000000000001",
  toAccountNumber: "DMB000000000002",
  amount: "100",
  currency: "MNT",
  description: "Туршилт",
};
const accounts: Account[] = [
  {
    accountNumber: request.fromAccountNumber,
    balance: "1000.00",
    currency: "MNT",
    status: "ACTIVE",
  },
];
test("BigDecimal JSON and total remain exact above Number.MAX_SAFE_INTEGER", () => {
  const parsed = decodeJson('{"balance":99999999999999999.99,"page":2}') as {
    balance: string;
    page: number;
  };
  assert.equal(parsed.balance, "99999999999999999.99");
  assert.equal(parsed.page, 2);
  assert.equal(totalBalance([parsed.balance, "0.01"]), "100000000000000000.00");
  assert.equal(minorUnits("0.10"), 10n);
});
test("transfer validation follows whole-MNT, ownership, balance and description constraints", () => {
  assert.equal(validateTransfer(request, accounts), "");
  for (const change of [
    { amount: "1.1" },
    { amount: "0" },
    { amount: "1001" },
    { amount: "1e2" },
    { amount: "100000000000000000" },
    { fromAccountNumber: request.toAccountNumber },
    { toAccountNumber: request.fromAccountNumber },
    { toAccountNumber: "123" },
    { description: " " },
  ])
    assert.ok(validateTransfer({ ...request, ...change }, accounts));
});
test("same intent keeps UUID; changed payload receives a new UUID", () => {
  const first = transferIntent(request, null);
  assert.equal(transferIntent({ ...request }, first).key, first.key);
  assert.notEqual(
    transferIntent({ ...request, amount: "101" }, first).key,
    first.key,
  );
  assert.notEqual(
    transferIntent({ ...request, currency: "USD" }, first).key,
    first.key,
  );
});
test("USD preview and display conversion use exact integer arithmetic", () => {
  for (const [input, expected] of [
    ["100", "360000.00"],
    ["10.50", "37800.00"],
    ["0.01", "36.00"],
  ]) {
    assert.equal(settlementAmount(input, "USD"), expected);
  }
  assert.equal(settlementAmount("100", "MNT"), "100.00");
  assert.equal(usdEquivalent("540000.00"), "150.00");
  assert.equal(usdEquivalent("18.00"), "0.01");
  assert.equal(usdEquivalent("17.99"), "0.00");
  assert.equal(money("150", "USD"), "$150.00");
  assert.equal(usdEquivalent("99999999999999999.99"), "27777777777777.78");
});
test("USD validation compares converted MNT balance and bounds settlement precision", () => {
  const source = [{ ...accounts[0], balance: "360000.00" }];
  assert.equal(validateTransfer({ ...request, currency: "USD" }, source), "");
  assert.ok(
    validateTransfer({ ...request, currency: "USD", amount: "100.01" }, source),
  );
  for (const amount of [
    "0",
    "-1",
    "1.001",
    "1e2",
    "0.001",
    "99999999999999999.99",
  ]) {
    assert.ok(
      validateTransfer({ ...request, currency: "USD", amount }, source),
    );
  }
  assert.equal(
    validateTransfer({ ...request, currency: "USD", amount: "0.01" }, source),
    "",
  );
});
test("requested amounts and exchange rates also decode losslessly", () => {
  assert.deepEqual(
    decodeJson(
      '{"requestedAmount":99999999999999999.99,"exchangeRate":3600.00}',
    ),
    { requestedAmount: "99999999999999999.99", exchangeRate: "3600.00" },
  );
});
test("USD requests send original currency and decimal string, without client rate", async () => {
  let payload: unknown;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).endsWith("/csrf"))
      return Response.json({ headerName: "X-CSRF-TOKEN", token: "fresh" });
    payload = JSON.parse(String(init.body));
    return Response.json({});
  };
  await sendTransfer(
    { ...request, amount: "10.50", currency: "USD" },
    "test-key",
  );
  assert.deepEqual(payload, { ...request, amount: "10.50", currency: "USD" });
});
test("login includes session credentials, CSRF and refreshes token after rotation; logout accepts 204", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  let token = 0;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/csrf"))
      return Response.json({
        headerName: "X-CSRF-TOKEN",
        token: `token-${++token}`,
      });
    if (String(url).endsWith("/logout"))
      return new Response(null, { status: 204 });
    return Response.json({ username: "demo" });
  };
  await login("demo", "password");
  assert.deepEqual(
    calls.map((c) => c.url),
    ["/api/v1/auth/csrf", "/api/v1/auth/login", "/api/v1/auth/csrf"],
  );
  assert.equal(
    new Headers(calls[1].init.headers).get("X-CSRF-TOKEN"),
    "token-1",
  );
  await logout();
  assert.equal(
    new Headers(calls[4].init.headers).get("X-CSRF-TOKEN"),
    "token-3",
  );
  assert.ok(
    calls.every(
      (c) => c.init.credentials === "include" && c.init.cache === "no-store",
    ),
  );
});
test("network failure never automatically replays mutation; explicit transfer retry reuses supplied UUID", async () => {
  const keys: (string | null)[] = [];
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).endsWith("/csrf"))
      return Response.json({ headerName: "X-CSRF-TOKEN", token: "fresh" });
    keys.push(new Headers(init.headers).get("Idempotency-Key"));
    throw new TypeError("offline");
  };
  await assert.rejects(sendTransfer(request, "same-key"), ApiError);
  assert.equal(keys.length, 1);
  await assert.rejects(sendTransfer(request, "same-key"), ApiError);
  assert.deepEqual(keys, ["same-key", "same-key"]);
});
test("403 invalidates CSRF; safe error parsing handles non-JSON 502", async () => {
  let tokens = 0;
  let writes = 0;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/csrf")) {
      tokens++;
      return Response.json({
        headerName: "X-CSRF-TOKEN",
        token: String(tokens),
      });
    }
    writes++;
    return new Response("<html>Unavailable</html>", {
      status: writes === 1 ? 403 : 502,
    });
  };
  await assert.rejects(
    createAccount(),
    (e: unknown) => e instanceof ApiError && e.status === 403,
  );
  assert.equal(writes, 1);
  await assert.rejects(
    createAccount(),
    (e: unknown) =>
      e instanceof ApiError &&
      e.status === 502 &&
      !e.message.includes("<html>"),
  );
  assert.equal(tokens, 2);
});
test("history filters are sent to server with encoded keywords and pagination", async () => {
  let url = "";
  globalThis.fetch = async (input) => {
    url = String(input);
    return Response.json({
      items: [],
      totalElements: 0,
      page: 2,
      size: 10,
      totalPages: 0,
    });
  };
  await getTransfers({
    keyword: "хоол & кофе",
    accountNumber: "DMB000000000001",
    fromDate: "2026-10-01",
    toDate: "2026-10-14",
    currency: "MNT",
    page: 2,
    size: 10,
  });
  const params = new URL(url, "http://localhost").searchParams;
  assert.equal(params.get("keyword"), "хоол & кофе");
  assert.equal(params.get("page"), "2");
  assert.equal(params.get("currency"), "MNT");
  assert.equal(params.get("fromDate"), "2026-10-01");
});
