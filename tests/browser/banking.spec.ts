import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function post(
  api: APIRequestContext,
  path: string,
  data?: unknown,
  key?: string,
) {
  const csrfResponse = await api.get("/api/v1/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();
  const csrf = await csrfResponse.json();
  return api.post(`/api/v1${path}`, {
    data,
    headers: {
      [csrf.headerName]: csrf.token,
      ...(key ? { "Idempotency-Key": key } : {}),
    },
  });
}

test("recipient lookup ignores outdated responses and expired sessions redirect", async ({
  page,
}) => {
  const username = `lookup_${Date.now()}`;
  const password = randomUUID();
  const fullName = "Хайлтын Шалгалт";
  const registration = await post(page.request, "/auth/register", {
    fullName,
    username,
    password,
    confirmPassword: password,
  });
  expect(registration.status()).toBe(201);
  const source = await registration.json();
  expect(
    (await post(page.request, "/auth/login", { username, password })).ok(),
  ).toBeTruthy();
  const destination = await (await post(page.request, "/accounts")).json();
  await page.goto("/transfer");
  let releaseSlow!: () => void;
  const slowGate = new Promise<void>((resolve) => {
    releaseSlow = resolve;
  });
  let notifyStarted!: () => void;
  const slowStarted = new Promise<void>((resolve) => {
    notifyStarted = resolve;
  });
  let notifyFinished!: () => void;
  const slowFinished = new Promise<void>((resolve) => {
    notifyFinished = resolve;
  });
  await page.route(
    `**/api/v1/accounts/recipient?accountNumber=${source.accountNumber}`,
    async (route) => {
      const response = await route.fetch();
      notifyStarted();
      await slowGate;
      try {
        await route.fulfill({ response });
      } finally {
        notifyFinished();
      }
    },
  );
  await page.getByLabel("Хүлээн авах дансны дугаар").fill(source.accountNumber);
  await slowStarted;
  await expect(page.getByText("Хүлээн авагчийг шалгаж байна…")).toBeVisible();
  await page
    .getByLabel("Хүлээн авах дансны дугаар")
    .fill(destination.accountNumber);
  await expect(page.getByText(fullName, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Үргэлжлүүлэх" }),
  ).toBeEnabled();
  releaseSlow();
  await slowFinished;
  await expect(
    page.getByRole("button", { name: "Үргэлжлүүлэх" }),
  ).toBeEnabled();
  await page.getByLabel("Хүлээн авах дансны дугаар").fill("DMB");
  await expect(page.getByText(fullName, { exact: true })).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Үргэлжлүүлэх" }),
  ).toBeDisabled();
  expect((await post(page.request, "/auth/logout")).status()).toBe(204);
  await page.goto("/accounts");
  await expect(page).toHaveURL(/login/);
});

test("real registration, session, account, transfer, history and responsive themes", async ({
  page,
}) => {
  const username = `ui_${Date.now()}`;
  const password = randomUUID();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/register");
  await page.getByLabel("Овог, нэр", { exact: true }).fill("Болд Бат-Эрдэнэ");
  await page.getByLabel("Хэрэглэгчийн нэр", { exact: true }).fill(username);
  await page.getByLabel("Нууц үг", { exact: true }).fill(password);
  await page.getByLabel("Нууц үг давтах", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Бүртгүүлэх", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Бүртгэл амжилттай!" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Нэвтрэх", exact: true }).click();
  await page.getByLabel("Хэрэглэгчийн нэр", { exact: true }).fill(username);
  await page.getByLabel("Нууц үг", { exact: true }).fill("wrong_password");
  await page.getByRole("button", { name: "Нэвтрэх", exact: true }).click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "Нэвтрэх нэр эсвэл нууц үг буруу",
  );
  await page.getByLabel("Нууц үг", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Нэвтрэх", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("heading", { name: `Сайн байна уу, ${username}.` }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `Сайн байна уу, ${username}.` }),
  ).toBeVisible();
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Данс нээх", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Данс нээх", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(2);
  const accountResponse = await page.request.get("/api/v1/accounts/me");
  const accounts = await accountResponse.json();
  const source = accounts.find((a: { balance: number }) => a.balance > 0);
  const destination = accounts.find(
    (a: { balance: number }) => a.balance === 0,
  );
  expect(destination).toBeTruthy();
  await page.goto(`/transfer?from=${source.accountNumber}`);
  await page
    .getByLabel("Хүлээн авах дансны дугаар")
    .fill(destination.accountNumber);
  await page.getByLabel("Мөнгөн дүн", { exact: true }).fill("1234");
  await page
    .getByLabel("Гүйлгээний утга", { exact: true })
    .fill("Браузерын бодит шалгалт");
  await page.getByRole("button", { name: "Үргэлжлүүлэх" }).click();
  await expect(
    page.getByRole("heading", { name: "Мэдээллээ нягтлаарай" }),
  ).toBeVisible();
  let rejectedKey: string | undefined;
  await page.route("**/api/v1/transfers", async (route) => {
    rejectedKey = route.request().headers()["idempotency-key"];
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Invalid description" }),
    });
  });
  await page.getByRole("button", { name: "Шилжүүлэг баталгаажуулах" }).click();
  await expect(page.locator("main [role=alert]")).toBeVisible();
  await page.getByRole("button", { name: "Засах", exact: true }).click();
  await expect(page.getByLabel("Гүйлгээний утга", { exact: true })).toHaveValue(
    "Браузерын бодит шалгалт",
  );
  await page.getByLabel("Мөнгөн дүн", { exact: true }).fill("1235");
  await page.getByLabel("Мөнгөн дүн", { exact: true }).fill("1234");
  await page.getByRole("button", { name: "Үргэлжлүүлэх" }).click();
  await page.unroute("**/api/v1/transfers");
  const editedRequest = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().endsWith("/transfers"),
  );
  await page.getByRole("button", { name: "Шилжүүлэг баталгаажуулах" }).click();
  expect((await editedRequest).headers()["idempotency-key"]).not.toBe(
    rejectedKey,
  );
  await expect(
    page.getByRole("heading", { name: "Шилжүүлэг амжилттай" }),
  ).toBeVisible();
  const balances = await (await page.request.get("/api/v1/accounts/me")).json();
  expect(
    balances.find(
      (a: { accountNumber: string }) =>
        a.accountNumber === source.accountNumber,
    ).balance,
  ).toBe(998766);
  expect(
    balances.find(
      (a: { accountNumber: string }) =>
        a.accountNumber === destination.accountNumber,
    ).balance,
  ).toBe(1234);
  // Let the real backend commit, then simulate losing only the response.
  await page.goto(`/transfer?from=${source.accountNumber}`);
  await page
    .getByLabel("Хүлээн авах дансны дугаар")
    .fill(destination.accountNumber);
  await page.getByLabel("Мөнгөн дүн", { exact: true }).fill("7");
  await page
    .getByLabel("Гүйлгээний утга", { exact: true })
    .fill("Хариу тасарсан хүсэлтийн шалгалт");
  await page.getByRole("button", { name: "Үргэлжлүүлэх" }).click();
  await page.route("**/api/v1/transfers", async (route) => {
    if (route.request().method() === "POST") {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Шилжүүлэг баталгаажуулах" }).click();
  await expect(
    page.getByRole("button", { name: "Ижил хүсэлтийг дахин шалгах" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Засах", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Шилжүүлэг амжилттай" }),
  ).not.toBeVisible();
  await page.unroute("**/api/v1/transfers");
  await page
    .getByRole("button", { name: "Ижил хүсэлтийг дахин шалгах" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Шилжүүлэг амжилттай" }),
  ).toBeVisible();
  const afterRetry = await (
    await page.request.get("/api/v1/accounts/me")
  ).json();
  expect(
    afterRetry.find(
      (a: { accountNumber: string }) =>
        a.accountNumber === source.accountNumber,
    ).balance,
  ).toBe(998759);
  await page.goto(`/transfer?from=${source.accountNumber}`);
  await page.getByLabel("Хүлээн авах дансны дугаар").fill("DMB999999999999");
  await expect(page.locator("form [role=alert]")).toContainText(
    "Хүлээн авах данс олдсонгүй",
  );
  await expect(
    page.getByRole("button", { name: "Үргэлжлүүлэх" }),
  ).toBeDisabled();
  await page
    .getByLabel("Хүлээн авах дансны дугаар")
    .fill(destination.accountNumber);
  await expect(
    page.getByText("Болд Бат-Эрдэнэ", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Валют", { exact: true }).selectOption("USD");
  await page.getByLabel("Мөнгөн дүн", { exact: true }).fill("100.00");
  await page
    .getByLabel("Гүйлгээний утга", { exact: true })
    .fill("USD бодит шалгалт");
  await expect(
    page.getByText("Шилжих дүн: 360,000.00 ₮", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Үргэлжлүүлэх" }).click();
  await expect(
    page.getByText("Болд Бат-Эрдэнэ", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Туршилтын ханш: 1 USD = 3,600 MNT", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/transfer-usd-confirmation.png",
    fullPage: true,
  });
  const usdRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().endsWith("/transfers"),
  );
  await page.getByRole("button", { name: "Шилжүүлэг баталгаажуулах" }).click();
  expect((await usdRequest).postDataJSON()).toMatchObject({
    amount: "100.00",
    currency: "USD",
  });
  await expect(
    page.getByRole("heading", { name: "Шилжүүлэг амжилттай" }),
  ).toBeVisible();
  await expect(page.locator("dl")).toContainText("360,000.00 ₮");
  await expect(page.locator("dl")).toContainText("$100.00");
  const afterUsd = await (await page.request.get("/api/v1/accounts/me")).json();
  expect(
    afterUsd.find(
      (a: { accountNumber: string }) =>
        a.accountNumber === source.accountNumber,
    ).balance,
  ).toBe(638759);
  await page.goto("/accounts");
  await expect(page.getByText("638,759.00 ₮", { exact: true })).toBeVisible();
  await page.getByLabel("Үлдэгдэл харах валют").selectOption("USD");
  await expect(
    page.getByText("Бодит үлдэгдэл: 638,759.00 ₮", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByLabel("Үлдэгдэл харах валют")).toHaveValue("USD");
  await expect(page.getByText("≈ $277.78", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Үлдэгдэл харах валют")).toHaveValue("USD");
  await page.goto("/history");
  await page.getByLabel("Оруулсан валют", { exact: true }).selectOption("USD");
  const filteredRequest = page.waitForRequest(
    (r) =>
      r.url().includes("/api/v1/transfers?") &&
      r.url().includes("currency=USD"),
  );
  await page.getByRole("button", { name: "Хайх", exact: true }).click();
  await filteredRequest;
  await page
    .getByRole("button", { name: /USD бодит шалгалт.*дэлгэрэнгүй/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText("$100.00");
  await expect(page.getByRole("dialog")).toContainText("360,000.00 ₮");
  await page.keyboard.press("Escape");
  await page.goto("/history");
  await page
    .getByLabel("Хайх үг", { exact: true })
    .fill("Браузерын бодит шалгалт");
  await page.getByRole("button", { name: "Хайх", exact: true }).click();
  await page
    .getByRole("button", { name: /Браузерын бодит шалгалт.*дэлгэрэнгүй/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText(source.accountNumber);
  await expect(page.getByRole("dialog")).toContainText("Өөрийн данс хооронд");
  await page.keyboard.press("Escape");
  await page.getByLabel("Хайх үг", { exact: true }).fill("no_such_transfer");
  await page.getByRole("button", { name: "Хайх", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Гүйлгээ алга байна" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Бараан горим" }).first().click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/dashboard");
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  for (const route of ["/dashboard", "/accounts", "/transfer", "/history"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.locator("summary").click();
  await page.getByRole("button", { name: "Цайвар горим" }).last().click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("button", { name: "Системийн горим" }).last().click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Системээс гарах" }).click();
  await expect(page).toHaveURL(/login/);
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
  await page.goto("/accounts");
  await expect(page).toHaveURL(/login/);
  expect(errors).toEqual([]);
});

test("unavailable backend shows an error without a false success", async ({
  page,
}) => {
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 502, body: "Bad Gateway" }),
  );
  await page.goto("/login");
  await page
    .getByLabel("Хэрэглэгчийн нэр", { exact: true })
    .fill("unavailable");
  await page.getByLabel("Нууц үг", { exact: true }).fill("unavailable");
  await page.getByRole("button", { name: "Нэвтрэх", exact: true }).click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "сервертэй холбогдож чадсангүй",
  );
  await expect(page).toHaveURL(/login/);
  await page.setViewportSize({ width: 320, height: 740 });
  for (const route of ["/login", "/register"]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("real cross-user transfer, idempotency, authorization and server pagination", async ({
  playwright,
}) => {
  const a = await playwright.request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
  });
  const b = await playwright.request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
  });
  try {
    const users = [];
    for (const [index, api] of [a, b].entries()) {
      const username = `api_${Date.now()}_${index}`;
      const password = randomUUID();
      const registration = await post(api, "/auth/register", {
        fullName: `Хэрэглэгч ${index}`,
        username,
        password,
        confirmPassword: password,
      });
      expect(registration.status()).toBe(201);
      users.push(await registration.json());
      expect(
        (await post(api, "/auth/login", { username, password })).ok(),
      ).toBeTruthy();
    }
    expect((await a.post("/api/v1/accounts")).status()).toBe(403);
    const body = {
      fromAccountNumber: users[0].accountNumber,
      toAccountNumber: users[1].accountNumber,
      amount: "73",
      currency: "MNT",
      description: "API бодит шалгалт",
    };
    const key = randomUUID();
    const first = await post(a, "/transfers", body, key);
    expect(first.status()).toBe(201);
    const transfer = await first.json();
    const replay = await post(a, "/transfers", body, key);
    expect((await replay.json()).id).toBe(transfer.id);
    expect(
      (await post(a, "/transfers", { ...body, amount: "74" }, key)).status(),
    ).toBe(409);
    expect((await post(b, "/transfers", body, randomUUID())).status()).toBe(
      403,
    );
    expect(
      (
        await post(a, "/transfers", { ...body, amount: "1.5" }, randomUUID())
      ).ok(),
    ).toBeFalsy();
    const incoming = await (
      await b.get(`/api/v1/transfers/${transfer.id}`)
    ).json();
    expect(incoming.direction).toBe("INCOMING");
    const outgoing = await (
      await a.get("/api/v1/transfers?keyword=API&currency=MNT&page=0&size=1")
    ).json();
    expect(outgoing.items).toHaveLength(1);
    expect(outgoing.items[0].direction).toBe("OUTGOING");
    expect((await a.get(`/api/v1/transfers/${randomUUID()}`)).status()).toBe(
      404,
    );
    const balance = await (await a.get("/api/v1/accounts/me")).json();
    expect(balance[0].balance).toBe(999927);
    const recipient = await a.get(
      `/api/v1/accounts/recipient?accountNumber=${users[1].accountNumber}`,
    );
    expect(recipient.status()).toBe(200);
    expect(await recipient.json()).toEqual({
      accountNumber: users[1].accountNumber,
      displayName: "Хэрэглэгч 1",
      currency: "MNT",
    });
    expect(
      (await a.get("/api/v1/accounts/recipient?accountNumber=bad")).status(),
    ).toBe(400);
    expect(
      (
        await a.get("/api/v1/accounts/recipient?accountNumber=DMB999999999999")
      ).status(),
    ).toBe(404);
    for (const [amount, settlement] of [
      ["100.00", "360000.00"],
      ["10.50", "37800.00"],
      ["0.01", "36.00"],
    ]) {
      const usdBody = { ...body, amount, currency: "USD" };
      const usdKey = randomUUID();
      const usdResponse = await post(a, "/transfers", usdBody, usdKey);
      expect(usdResponse.status()).toBe(201);
      const usdTransfer = await usdResponse.json();
      expect(usdTransfer).toMatchObject({
        amount: settlement,
        currency: "MNT",
        requestedAmount: amount,
        requestedCurrency: "USD",
        exchangeRate: "3600.00",
      });
      expect(
        (await (await post(a, "/transfers", usdBody, usdKey)).json()).id,
      ).toBe(usdTransfer.id);
      expect(
        (
          await post(
            a,
            "/transfers",
            { ...usdBody, amount: "1", currency: "MNT" },
            usdKey,
          )
        ).status(),
      ).toBe(409);
    }
    const usdPage = await (
      await a.get("/api/v1/transfers?currency=USD&page=0&size=2")
    ).json();
    expect(usdPage.totalElements).toBe(3);
    expect(usdPage.items).toHaveLength(2);
    expect(
      usdPage.items.every(
        (item: { requestedCurrency: string }) =>
          item.requestedCurrency === "USD",
      ),
    ).toBeTruthy();
    const nextPage = await (
      await a.get("/api/v1/transfers?currency=USD&page=1&size=2")
    ).json();
    expect(nextPage.items).toHaveLength(1);
    expect(usdPage.items.map((item: { id: string }) => item.id)).not.toContain(
      nextPage.items[0].id,
    );
    expect((await (await a.get("/api/v1/accounts/me")).json())[0].balance).toBe(
      602091,
    );
    expect(
      (
        await post(
          a,
          "/transfers",
          { ...body, currency: "USD", amount: "0.001" },
          randomUUID(),
        )
      ).status(),
    ).toBe(400);
    expect((await post(a, "/auth/logout")).status()).toBe(204);
  } finally {
    await a.dispose();
    await b.dispose();
  }
});
