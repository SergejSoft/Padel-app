import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hannoverBerlinPlayers, hannoverBerlinSchedule, hannoverBerlinScores } from "../../shared/__tests__/fixtures/hannover-berlin";

const ORGANIZER = "local_organizer";

const storedTournament = {
  id: 108,
  name: "Hannover-Berlin",
  date: "2026-11-22",
  status: "active",
  players: hannoverBerlinPlayers,
  playersCount: 7,
  courtsCount: 1,
  pointsPerMatch: 16,
  schedule: hannoverBerlinSchedule,
  finalScores: hannoverBerlinScores,
  results: null,
  leaderboardId: null,
  completedAt: null,
  organizerId: ORGANIZER,
  registeredParticipants: [],
};

const storage = vi.hoisted(() => ({
  getUser: vi.fn(),
  getTournament: vi.fn(),
  getTournamentManagerIds: vi.fn(),
  completeTournament: vi.fn(),
}));

vi.mock("../storage.js", () => ({ storage }));

describe("POST /api/tournaments/:id/complete", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    vi.stubEnv("LOCAL_AUTH", "true");
    vi.stubEnv("NODE_ENV", "test");
    const { createApp } = await import("../app");
    const app = await createApp();
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server?.close();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    storage.getUser.mockResolvedValue({ id: ORGANIZER, role: "organizer" });
    storage.getTournamentManagerIds.mockResolvedValue([ORGANIZER]);
    storage.getTournament.mockResolvedValue(storedTournament);
    storage.completeTournament.mockImplementation(async (_id: number, results: unknown[]) => ({
      ...storedTournament,
      status: "completed",
      results,
      leaderboardId: "leaderboard-108",
      completedAt: new Date(),
    }));
  });

  const complete = (path = "/api/tournaments/108/complete") =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer local:${ORGANIZER}` },
    });

  it("completes a fully scored tournament with results computed from its saved scores", async () => {
    const response = await complete();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "completed", leaderboardId: "leaderboard-108" });
    expect(storage.completeTournament).toHaveBeenCalledTimes(1);
    const [id, results] = storage.completeTournament.mock.calls[0];
    expect(id).toBe(108);
    expect(results[0]).toMatchObject({ player: "Gartenflus", totalPoints: 38, matchesPlayed: 4 });
    expect(results).toHaveLength(7);
  });

  it("refuses to complete while games are missing scores", async () => {
    storage.getTournament.mockResolvedValue({ ...storedTournament, finalScores: hannoverBerlinScores.slice(0, 6) });

    const response = await complete();

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Only 6 of 7 games have a saved score." });
    expect(storage.completeTournament).not.toHaveBeenCalled();
  });

  it("rejects users who do not manage the tournament", async () => {
    storage.getTournamentManagerIds.mockResolvedValue(["someone_else"]);

    const response = await complete();

    expect(response.status).toBe(403);
    expect(storage.completeTournament).not.toHaveBeenCalled();
  });

  it("no longer exposes the results endpoint that overwrote saved scores", async () => {
    const response = await fetch(`${baseUrl}/api/tournaments/108/results`, {
      method: "PATCH",
      headers: { Authorization: `Bearer local:${ORGANIZER}`, "Content-Type": "application/json" },
      body: JSON.stringify({ results: [], schedule: [] }),
    });

    expect(response.status).toBe(404);
  });
});
