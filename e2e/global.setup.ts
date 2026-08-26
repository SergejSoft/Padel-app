import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

setup.describe.configure({ mode: "serial" });

const authFile = path.join(process.cwd(), "playwright/.clerk/user.json");

setup("authenticate organizer", async ({ page }) => {
  const emailAddress = process.env.E2E_CLERK_USER_EMAIL;
  if (!emailAddress) {
    throw new Error("E2E_CLERK_USER_EMAIL is required for authenticated tests");
  }

  await clerkSetup();
  await page.goto("/");
  await clerk.signIn({ page, emailAddress });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Tournament Dashboard|Admin Dashboard|My Padel/ }),
  ).toBeVisible();

  mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
