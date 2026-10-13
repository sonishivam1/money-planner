import { expect, test } from "@playwright/test";
import { signInWithExample } from "./helpers";

test("J1: sign in, load the example and see this month's plan", async ({ page }) => {
  await signInWithExample(page);
  await expect(page.getByText("₹8,300").first()).toBeVisible();
  await expect(page.getByText("Jun 2028").first()).toBeVisible();
});

test("signed-out visitors can't see app pages", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
