import { defineConfig, devices, type Project } from "@playwright/test";

const authenticatedProjects: Project[] = process.env.E2E_CLERK_USER_EMAIL
  ? [
      {
        name: "setup",
        testMatch: /global\.setup\.ts/,
      },
      {
        name: "authenticated",
        testMatch: /authenticated\.spec\.ts/,
        dependencies: ["setup"],
        use: {
          ...devices["Desktop Chrome"],
          storageState: "playwright/.clerk/user.json",
        },
      },
    ]
  : [];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "public",
      testMatch: /public\.spec\.ts/,
      use: devices["Desktop Chrome"],
    },
    ...authenticatedProjects,
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:5000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
