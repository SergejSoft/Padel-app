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

    // The organizer adds an entry price afterwards from Manage; it must reach the public page
    const priceResponse = await page.request.put(`/api/tournaments/${tournamentId}`, {
      data: { price: "15", currency: "EUR" },
    });
    expect(priceResponse.ok()).toBe(true);
    expect(await priceResponse.json()).toMatchObject({ price: "15", currency: "EUR" });

    const publicContext = await browser.newContext({
      baseURL: testInfo.project.use.baseURL as string,
      storageState: { cookies: [], origins: [] },
    });
    const publicPage = await publicContext.newPage();
    await publicPage.goto(`/register/${registrationId}`);
    await expect(publicPage.getByText(`RELEASE-QA E2E ${unique}`, { exact: true })).toBeVisible();
    await expect(publicPage.getByText("24 points per match")).toBeVisible();
    await expect(publicPage.getByTestId("registration-price")).toContainText("€15");
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
    const secondMatch = converted.schedule[0].matches[1];
    const saveScore = (gameNumber: number, team1Score: number, team2Score: number) =>
      page.request.put(`/api/tournaments/${tournamentId}/scores`, {
        data: { gameNumber, team1Score, team2Score },
      });

    // A wrong entry can be reset for one game without touching the others
    expect((await saveScore(firstMatch.gameNumber, 20, 4)).ok()).toBe(true);
    expect((await saveScore(secondMatch.gameNumber, 12, 12)).ok()).toBe(true);
    const resetOne = await page.request.delete(
      `/api/tournaments/${tournamentId}/scores/${firstMatch.gameNumber}`,
    );
    expect(resetOne.ok()).toBe(true);
    expect((await resetOne.json()).finalScores).toMatchObject([
      { gameNumber: secondMatch.gameNumber, team1Score: 12, team2Score: 12 },
    ]);

    // Or everything can be wiped after a test run
    const resetAll = await page.request.delete(`/api/tournaments/${tournamentId}/scores`);
    expect(resetAll.ok()).toBe(true);
    expect((await resetAll.json()).finalScores).toEqual([]);

    const scoreResponse = await saveScore(firstMatch.gameNumber, 14, 10);
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

test("organizer dashboard groups tournaments into lifecycle sections", async ({ page }) => {
  const tag = `SECTIONS-QA ${Date.now()}`;
  const names = {
    today: `${tag} today`,
    upcoming: `${tag} upcoming`,
    past: `${tag} past`,
    archived: `${tag} archived`,
  };
  const tournamentIds: number[] = [];

  const createTournament = async (name: string, date: string) => {
    const response = await page.request.post("/api/tournaments", {
      data: {
        name,
        date,
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
    expect(response.ok()).toBe(true);
    const tournament = await response.json();
    tournamentIds.push(tournament.id);
    return tournament.id as number;
  };

  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Tournament Dashboard|Admin Dashboard/ })).toBeVisible();

    // The browser's local calendar day, which is what the dashboard compares against
    const today = await page.evaluate(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    });
    await createTournament(names.today, today);
    await createTournament(names.upcoming, "2030-05-01");
    await createTournament(names.past, "2020-01-15");
    const archivedId = await createTournament(names.archived, "2020-02-01");
    expect((await page.request.patch(`/api/tournaments/${archivedId}/archive`)).ok()).toBe(true);

    await page.reload();

    const row = (name: string) => page.getByRole("button", { name: `Edit tournament ${name}` });
    const section = (name: string) => page.getByRole("region", { name, exact: true });

    // A same-day tournament is upcoming, never "past"
    await expect(row(names.today)).toBeVisible();
    await expect(section("Needs results").getByRole("button", { name: `Edit tournament ${names.today}` })).toHaveCount(0);
    await expect(row(names.today)).toContainText("Today");

    const pastRow = section("Needs results").getByRole("button", { name: `Edit tournament ${names.past}` });
    await expect(pastRow).toBeVisible();
    await expect(pastRow).toContainText("No schedule yet");

    // Archived stays collapsed until opened
    await expect(section("Archived")).toBeVisible();
    await expect(row(names.archived)).toHaveCount(0);

    // Searching narrows every section and opens Archived
    await page.getByRole("searchbox", { name: "Search tournaments" }).fill(tag);
    await expect(section("Next up").getByRole("button", { name: `Edit tournament ${names.today}` })).toBeVisible();
    await expect(section("Upcoming").getByRole("button", { name: `Edit tournament ${names.upcoming}` })).toBeVisible();
    await expect(section("Upcoming").getByRole("button")).toHaveCount(1);
    await expect(section("Archived").getByRole("button", { name: `Edit tournament ${names.archived}` })).toBeVisible();

    await page.getByRole("searchbox", { name: "Search tournaments" }).fill("");
    await expect(row(names.archived)).toHaveCount(0);
    await section("Archived").getByRole("button", { name: /Archived/ }).click();
    await expect(row(names.archived)).toBeVisible();
  } finally {
    for (const id of tournamentIds) {
      await removeFixtureTournament(page, id);
    }
  }
});

test("organizer sets up a tournament by courts first and players second", async ({ page }) => {
  const tournamentName = `CAMP-QA E2E ${Date.now()}`;
  let tournamentId: number | undefined;

  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Tournament Dashboard|Admin Dashboard/ })).toBeVisible();
    await page.evaluate(() => localStorage.removeItem("tournament_wizard_state"));
    await page.goto("/tournament");

    const court = (count: number) =>
      page.getByRole("radio", { name: `${count} ${count === 1 ? "court" : "courts"}`, exact: true });
    const players = page.getByLabel("Players", { exact: true });
    const addPlayer = page.getByRole("button", { name: "Add a player" });
    const removePlayer = page.getByRole("button", { name: "Remove a player" });
    const lineup = page.getByTestId("lineup-summary");

    await court(1).click();
    await expect(players).toHaveValue("4");
    await expect(removePlayer).toBeDisabled();
    for (let index = 0; index < 3; index++) await addPlayer.click();
    await expect(players).toHaveValue("7");
    await expect(lineup).toContainText("4 play each round and 3 rest");
    await expect(lineup).toContainText("7 rounds · 4 games per player");

    await court(3).click();
    await expect(players).toHaveValue("12");
    await addPlayer.click();
    await expect(lineup).toContainText("12 play each round and 1 rests");
    await expect(lineup).toContainText("12 rounds · 11–12 games per player");

    await court(5).click();
    await expect(players).toHaveValue("20");
    await expect(addPlayer).toBeDisabled();

    await court(2).click();
    await removePlayer.click();
    await expect(players).toHaveValue("7");
    await expect(lineup).toContainText("Only 1 of 2 courts can be used");

    await page.getByLabel("Tournament Name").fill(tournamentName);
    await page.getByLabel("Tournament Date").fill("2030-07-01");
    await page.getByLabel("Start Time").fill("10:00");
    await page.getByLabel("Tournament Location").fill("E2E Camp");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create Tournament" }).click();
    await expect(page.getByRole("heading", { name: "Tournament Created!" })).toBeVisible();

    const tournaments = await (await page.request.get("/api/tournaments")).json();
    const created = tournaments.find((t: any) => t.name === tournamentName);
    expect(created).toMatchObject({ playersCount: 7, courtsCount: 2, maxParticipants: 7 });
    tournamentId = created.id;

    for (let index = 1; index <= 7; index++) {
      const response = await page.request.post(`/api/tournaments/${tournamentId}/participants`, {
        data: { name: `Camp Player ${index}` },
      });
      expect(response.ok()).toBe(true);
    }

    const convertResponse = await page.request.post(`/api/tournaments/${tournamentId}/convert`);
    expect(convertResponse.ok()).toBe(true);
    const converted = await convertResponse.json();
    expect(converted.schedule).toHaveLength(7);
    expect(converted.schedule.every((round: any) => round.matches.length === 1)).toBe(true);
  } finally {
    if (tournamentId) {
      await removeFixtureTournament(page, tournamentId);
    }
  }
});
