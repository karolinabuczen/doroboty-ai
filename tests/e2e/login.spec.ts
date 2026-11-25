import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { initialState } from "../../src/features/prototype/model";
import { STORAGE_KEY } from "../../src/features/prototype/storage";
import { TEST_ACCOUNTS, TEST_PASSWORD } from "./auth-fixtures";

const anna = TEST_ACCOUNTS[0];
const karolina = TEST_ACCOUNTS[2];
const lockout = TEST_ACCOUNTS[5];

async function signIn(page: Page, login: string, password: string) {
  await page.getByLabel("Login").fill(login);
  await page.getByLabel("Hasło").fill(password);
  await page.getByRole("button", { name: "Zaloguj się", exact: true }).click();
}

test("protected pages send visitors to the login page and return them after signing in", async ({
  page,
}) => {
  await page.goto("/#/app/profil");
  await expect(page.getByRole("heading", { name: "Zaloguj się", level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/auth\/sign-in\?next=%2Fapp%2Fprofil/);
  await signIn(page, anna.login, TEST_PASSWORD);
  await expect(page).toHaveURL(/#\/app\/profil$/);
  await expect(page.getByLabel("Imię i nazwisko")).toHaveValue("Anna Kowalska");
});

test("wrong password and unknown login give the same message and no access", async ({ page }) => {
  await page.goto("/#/auth/sign-in");
  await signIn(page, anna.login, "definitely-wrong");
  const wrong = await page.getByRole("alert").innerText();
  expect(wrong).toBe("Nieprawidłowy login lub hasło.");
  await signIn(page, "nobody.here", "definitely-wrong");
  await expect(page.getByRole("alert")).toHaveText(wrong);
  await expect(page.getByLabel("Hasło")).toBeFocused();
  await expect(page.getByLabel("Hasło")).toHaveValue("");
  await page.goto("/#/app");
  await expect(page.getByRole("heading", { name: "Zaloguj się", level: 1 })).toBeVisible();
});

test("login cookie is HttpOnly and a saved person in the browser does not grant access", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const forged = { ...initialState(), activePersonId: "employer-brightlabs" };
  await page.evaluate(
    ({ key, raw }) => localStorage.setItem(key, raw),
    { key: STORAGE_KEY, raw: JSON.stringify(forged) },
  );
  await page.goto("/#/app/oferty");
  await expect(page.getByRole("heading", { name: "Zaloguj się", level: 1 })).toBeVisible();
  await signIn(page, anna.login, TEST_PASSWORD);
  await expect(page).toHaveURL(/#\/app/);
  const cookie = (await context.cookies()).find((x) => x.name === "dr_session")!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("dr_session");
});

test("roles only see their own areas", async ({ page }) => {
  await page.goto("/#/auth/sign-in");
  await signIn(page, anna.login, TEST_PASSWORD);
  await expect(page.getByRole("heading", { name: "Witaj, Anna" })).toBeVisible();
  await page.goto("/#/app/oferty");
  await expect(page.getByText("Ten widok jest dostępny dla pracodawcy")).toBeVisible();
  await page.goto("/#/app/case");
  await expect(page.getByText("Ten widok jest dostępny dla prowadzącego")).toBeVisible();
  await page.getByRole("button", { name: "Wyloguj się" }).first().click();
  await expect(page.getByRole("heading", { name: "Zaloguj się", level: 1 })).toBeVisible();
  await signIn(page, karolina.login, TEST_PASSWORD);
  await expect(page).toHaveURL(/#\/app\/case$/);
  await page.goto("/#/app/profil");
  await expect(page.getByText("Ten widok jest dostępny dla kandydata")).toBeVisible();
});

test("logout ends the session on the server, not only in the page", async ({ page }) => {
  await page.goto("/#/auth/sign-in");
  await signIn(page, anna.login, TEST_PASSWORD);
  await expect(page).toHaveURL(/#\/app$/);
  await page.getByRole("button", { name: "Wyloguj się" }).first().click();
  await expect(page.getByRole("heading", { name: "Zaloguj się", level: 1 })).toBeVisible();
  expect(((await (await page.request.get("/api/auth/session")).json()) as { user: unknown }).user).toBeNull();
  await page.reload();
  await page.goto("/#/app");
  await expect(page.getByRole("heading", { name: "Zaloguj się", level: 1 })).toBeVisible();
});

test("repeated failures lock the login, even for the right password", async ({ page }) => {
  await page.goto("/#/auth/sign-in");
  const attempt = async (password: string) => {
    await Promise.all([page.waitForResponse("**/api/auth/login"), signIn(page, lockout.login, password)]);
    await expect(page.getByLabel("Hasło")).toHaveValue("");
  };
  for (let i = 0; i < 5; i++) await attempt(`wrong-${i}`);
  await attempt(TEST_PASSWORD);
  await expect(page.getByRole("alert")).toContainText("Zbyt wiele nieudanych prób");
  await expect(page.getByRole("heading", { name: "Zaloguj się", level: 1 })).toBeVisible();
});

test("login page is accessible and fits a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/#/auth/sign-in");
  await expect(page.getByLabel("Login")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await signIn(page, anna.login, "wrong");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .disableRules(["color-contrast"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "artifacts/login-mobile.png", fullPage: true });
});
