import { expect, type Page } from "@playwright/test";

/** Signs in with the dev-only sign-in (ADR-0011). */
export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as dev user" }).click();
  await page.waitForURL(/\/dashboard/);
}

/** Signs in and makes sure the fictional example plan is loaded. */
export async function signInWithExample(page: Page) {
  await signIn(page);
  const load = page.getByRole("button", { name: "Load the example plan" });
  if (await load.isVisible().catch(() => false)) {
    await load.click();
    await page.waitForURL(/\/dashboard/);
  }
  await expect(page.getByText("₹1,10,000").first()).toBeVisible();
}
