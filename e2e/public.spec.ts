import { expect, test } from "@playwright/test";

test("signed-out visitor sees the landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /get started|sign in/i }).first()).toBeVisible();
});

test("invalid public links fail without exposing server details", async ({ request }) => {
  const shared = await request.get("/api/shared/not-a-real-tournament");
  expect(shared.status()).toBe(404);
  expect(await shared.json()).toEqual({ error: "Shared tournament not found" });

  const registration = await request.get("/api/registration/not-a-real-registration");
  expect(registration.status()).toBe(404);
  expect(await registration.json()).toEqual({ error: "Registration not found" });
});

test("signed-out users cannot mutate tournaments", async ({ request }) => {
  const attempts = await Promise.all([
    request.put("/api/tournaments/1", { data: { name: "Unauthorized" } }),
    request.delete("/api/tournaments/1"),
    request.post("/api/tournaments/1/share"),
    request.put("/api/tournaments/1/scores", {
      data: { gameNumber: 1, team1Score: 10, team2Score: 6 },
    }),
  ]);

  for (const response of attempts) {
    expect(response.status()).toBe(401);
  }

  const removedPromotionRoute = await request.post("/api/dev/make-admin");
  expect(removedPromotionRoute.status()).toBe(404);
});