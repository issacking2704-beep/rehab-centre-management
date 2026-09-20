import { test, expect } from "@playwright/test";

test.describe("Rehab Centre staging smoke", () => {
  test("login page renders and exposes both authentication modes", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Staff Login" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Attender Passkey/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.getByText("Authorized users only")).toBeVisible();
  });

  test("invalid staff login is handled without a crash", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill("qa-invalid@example.invalid");
    await page.getByLabel("Password").fill("invalid-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText(/Incorrect email or password|Unable to sign in|valid email/i)).toBeVisible({ timeout: 15_000 });
  });

  test("attender passkey mode renders validation", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Attender Passkey/ }).click();
    await expect(page.getByText("Patient Attender Passkey")).toBeVisible();
    await expect(page.getByRole("button", { name: "Unlock Assigned Patients" })).toBeVisible();
    await page.getByRole("button", { name: "Unlock Assigned Patients" }).click();
    await expect(page.getByText(/Please enter your Patient Attender passkey/i)).toBeVisible();
  });

  test("patient attender portal requires authentication", async ({ page }) => {
    await page.goto("/attender", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\\/login(?:\\?.*)?$/);
  });

  test("unauthenticated root redirects to login", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });

  test("common protected routes redirect unauthenticated users", async ({ page }) => {
    const routes = [
      "/patients",
      "/staff",
      "/attendance",
      "/vitals",
      "/bills",
      "/invoice",
      "/letterhead",
      "/reports",
      "/settings",
      "/deleted-patients",
    ];

    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    }
  });
});

test.describe("Authenticated QA hooks", () => {
  test.skip(!process.env.QA_STAFF_EMAIL || !process.env.QA_STAFF_PASSWORD, "Set QA_STAFF_EMAIL and QA_STAFF_PASSWORD for authenticated staging tests.");

  test("staff can sign in and reach dashboard", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(process.env.QA_STAFF_EMAIL!);
    await page.getByLabel("Password").fill(process.env.QA_STAFF_PASSWORD!);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
    await expect(page.getByText("Dashboard")).toBeVisible();
  });
});
