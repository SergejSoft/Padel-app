import { expect, test, type Page } from "@playwright/test";

/**
 * Deleting only archives a tournament, so fixtures would pile up in the
 * organizer's dashboard. Archive first, then remove the row permanently.
 */
async function removeFixtureTournament(page: Page, tournamentId: number) {
  await page.request.delete(`/api/tournaments/${tournamentId}`);
  const permanent = await page.request.delete(`/api/tournaments/${tournamentId}?permanent=true`);
  expect(permanent.status()).toBe(204);
}

test("organizer can add players from the edit modal of a registration tournament", async ({ page }) => {
  const unique = Date.now();
  const tournamentName = `EDIT-QA E2E ${unique}`;
  let tournamentId: number | undefined;

  try {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Tournament Dashboard|Admin Dashboard|My Padel/ }),
    ).toBeVisible();

    const createResponse = await page.request.post("/api/tournaments", {
      data: {
        name: tournamentName,
        date: "2030-09-06",
        time: "10:00",
        location: "E2E Court",
        playersCount: 8,
        courtsCount: 2,
        pointsPerMatch: 16,
        players: [],
        schedule: [],
        tournamentMode: "registration",
      },
    });
    expect(createResponse.ok()).toBe(true);
    const tournament = await createResponse.json();
    tournamentId = tournament.id;

    await page.reload();

    // Open the edit modal from the tournament row
    const row = page.getByRole("button", { name: `Edit tournament ${tournamentName}` });
    await expect(row).toBeVisible();
    await row.click();

    const modal = page.getByRole("dialog");
    await expect(modal.getByText("Manage Tournament")).toBeVisible();

    // Add two players manually (the players editor button; the registration
    // section further down has its own "Add Player" dialog trigger)
    const addButton = modal.getByRole("button", { name: "Add Player" }).first();
    await expect(addButton).toBeVisible();

    await addButton.click();
    await modal.getByPlaceholder("Player 1 name").fill("Manual Player One");
    await addButton.click();
    await modal.getByPlaceholder("Player 2 name").fill("Manual Player Two");

    await modal.getByRole("button", { name: "Update Tournament" }).click();
    await expect(modal).not.toBeVisible();

    // Verify participants were persisted
    const listResponse = await page.request.get("/api/tournaments");
    expect(listResponse.ok()).toBe(true);
    const tournaments = await listResponse.json();
    const updated = tournaments.find((t: any) => t.id === tournamentId);
    expect(updated).toBeTruthy();
    const names = (updated.registeredParticipants ?? []).map((p: any) => p.name);
    expect(names).toContain("Manual Player One");
    expect(names).toContain("Manual Player Two");

    // Reopen the modal and remove one player
    await page.reload();
    const rowAfter = page.getByRole("button", { name: `Edit tournament ${tournamentName}` });
    await rowAfter.click();
    const modalAfter = page.getByRole("dialog");
    await expect(modalAfter.getByPlaceholder("Player 1 name")).toHaveValue("Manual Player One");
    await modalAfter.getByRole("button", { name: "Remove player" }).first().click();
    await modalAfter.getByRole("button", { name: "Update Tournament" }).click();
    await expect(modalAfter).not.toBeVisible();

    const afterRemove = await page.request.get("/api/tournaments");
    const updatedAfterRemove = (await afterRemove.json()).find((t: any) => t.id === tournamentId);
    const namesAfterRemove = (updatedAfterRemove.registeredParticipants ?? []).map((p: any) => p.name);
    expect(namesAfterRemove).not.toContain("Manual Player One");
    expect(namesAfterRemove).toContain("Manual Player Two");
  } finally {
    if (tournamentId) {
      await removeFixtureTournament(page, tournamentId);
    }
  }
});

test("organizer can run a complete registration and scoring flow", async ({ page, browser }, testInfo) => {
  const unique = Date.now();
  let tournamentId: number | undefined;

  try {
    await page.goto("/");
    const playerHome = page.getByRole("heading", { name: "My Padel" });
    await expect(
      page.getByRole("heading", { name: /Tournament Dashboard|Admin Dashboard|My Padel/ }),
    ).toBeVisible();
    if (await playerHome.isVisible()) {
      await page.getByRole("button", { name: "Become an organiser" }).click();
      const confirmation = page.getByRole("alertdialog");
      await confirmation.getByRole("button", { name: "Become an organiser" }).click();
    }
    await expect(page.getByRole("heading", { name: /Tournament Dashboard|Admin Dashboard/ })).toBeVisible();

    const createResponse = await page.request.post("/api/tournaments", {
      data: {
        name: `RELEASE-QA E2E ${unique}`,
        date: "2030-06-15",
        time: "10:00",
        location: "E2E Court",
        playersCount: 8,
        courtsCount: 2,
        pointsPerMatch: 24,
        players: [],
        schedule: [],
        tournamentMode: "registration",
      },
    });
    expect(createResponse.ok()).toBe(true);
    const tournament = await createResponse.json();
    tournamentId = tournament.id;

    const registrationResponse = await page.request.post(`/api/tournaments/${tournamentId}/registration`, {
      data: { maxParticipants: 8 },
    });
    expect(registrationResponse.ok()).toBe(true);
    const { registrationId } = await registrationResponse.json();

    const publicContext = await browser.newContext({
      baseURL: testInfo.project.use.baseURL as string,
      storageState: { cookies: [], origins: [] },
    });
    const publicPage = await publicContext.newPage();
    await publicPage.goto(`/register/${registrationId}`);
    await expect(publicPage.getByText(`RELEASE-QA E2E ${unique}`, { exact: true })).toBeVisible();
    await expect(publicPage.getByText("24 points per match")).toBeVisible();
    await expect(publicPage.getByRole("button", { name: "Join Tournament" })).toBeVisible();

    const unsignedRegistration = await publicContext.request.post(
      `/api/registration/${registrationId}/register`,
      { data: { name: "Unsigned Player" } },
    );
    expect(unsignedRegistration.status()).toBe(401);

    await publicPage.getByRole("button", { name: "Join Tournament" }).click();
    await expect(publicPage).toHaveURL(/\/login\?redirect=/);
    await publicContext.close();

    for (let index = 1; index <= 8; index++) {
      const response = await page.request.post(`/api/registration/${registrationId}/register`, {
        data: {
          name: `E2E Player ${unique}-${index}`,
          email: `e2e-${unique}-${index}@example.com`,
          playtomicRating: index === 1 ? 3.25 : undefined,
        },
      });
      expect(response.ok()).toBe(true);
    }

    const convertResponse = await page.request.post(`/api/tournaments/${tournamentId}/convert`);
    expect(convertResponse.ok()).toBe(true);
    const converted = await convertResponse.json();
    expect(converted.schedule).toHaveLength(7);
    expect(converted.schedule.every((round: any) => round.matches.length === 2)).toBe(true);

    const firstMatch = converted.schedule[0].matches[0];
    const scoreResponse = await page.request.put(`/api/tournaments/${tournamentId}/scores`, {
      data: {
        gameNumber: firstMatch.gameNumber,
        team1Score: 14,
        team2Score: 10,
      },
    });
    expect(scoreResponse.ok()).toBe(true);

    // Schedule and scores are private: anonymous visitors are asked to sign in
    const anonymousContext = await browser.newContext({
      baseURL: testInfo.project.use.baseURL as string,
      storageState: { cookies: [], origins: [] },
    });
    const anonymousResponse = await anonymousContext.request.get(`/api/shared/${converted.shareId}`);
    expect(anonymousResponse.status()).toBe(401);
    expect(await anonymousResponse.json()).toMatchObject({ code: "sign_in_required" });
    const anonymousScores = await anonymousContext.request.get(`/api/shared/${converted.shareId}/scores`);
    expect(anonymousScores.status()).toBe(401);
    const anonymousPage = await anonymousContext.newPage();
    await anonymousPage.goto(`/shared/${converted.shareId}`);
    await expect(anonymousPage.getByRole("heading", { name: "Sign in to view this tournament" })).toBeVisible();
    await anonymousPage.getByRole("link", { name: "Sign in" }).click();
    await expect(anonymousPage).toHaveURL(/\/login\?redirect=/);
    await anonymousContext.close();

    // The organizer sees the full view, still without private participant data
    const publicResponse = await page.request.get(`/api/shared/${converted.shareId}`);
    expect(publicResponse.ok()).toBe(true);
    const publicTournament = await publicResponse.json();
    expect(publicTournament.canEdit).toBe(true);
    expect(publicTournament).not.toHaveProperty("organizerId");
    expect(publicTournament).not.toHaveProperty("coOrganizerId");
    expect(publicTournament).not.toHaveProperty("coOrganizerEmail");
    expect(publicTournament.registeredParticipants.every((participant: any) => !("email" in participant))).toBe(true);
    expect(publicTournament.registeredParticipants.every((participant: any) => !("userId" in participant))).toBe(true);
    expect(publicTournament.finalScores[0]).not.toHaveProperty("updatedBy");
    expect(publicTournament.pointsPerMatch).toBe(24);
    expect(publicTournament.registeredParticipants[0].playtomicRating).toBe(3.25);
    expect(publicTournament.finalScores[0]).toMatchObject({ team1Score: 14, team2Score: 10 });
  } finally {
    if (tournamentId) {
      await removeFixtureTournament(page, tournamentId);
    }
  }
});
