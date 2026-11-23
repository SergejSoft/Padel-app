/**
 * Runs against the local docker-compose Postgres only (`npm run db:local`,
 * migrated). Skipped when DATABASE_URL is unset; never runs against Neon.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Tournament } from "../../shared/schema";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";
const isLocalDatabase = !!databaseUrl && !/\.neon\.tech/.test(databaseUrl);

describe.skipIf(!isLocalDatabase)("storage.duplicateTournament (local database)", () => {
  let storage: typeof import("../storage").storage;
  let source: Tournament;
  const createdIds: number[] = [];

  beforeAll(async () => {
    ({ storage } = await import("../storage"));
    const { generateAmericanFormatTournament } = await import("../../shared/american-format-generator");
    const players = ["Ana", "Bruno", "Carla", "Diego", "Eva", "Fede", "Gina", "Hugo"];
    const { rounds } = generateAmericanFormatTournament({ players, courts: 2, pointsPerMatch: 24 });

    const created = await storage.createTournament({
      name: "Duplicate source",
      date: "2026-11-22",
      time: "19:00",
      location: "Test club",
      playersCount: players.length,
      courtsCount: 2,
      pointsPerMatch: 24,
      players,
      schedule: rounds as any[],
    });
    createdIds.push(created.id);

    for (const match of rounds.flatMap(round => round.matches).slice(0, 4)) {
      await storage.updateTournamentScores(created.id, match.gameNumber, 15, 9, "test");
    }
    source = (await storage.completeTournament(created.id, [{ player: "Ana", totalPoints: 60 }]))!;
  });

  afterAll(async () => {
    for (const id of createdIds) await storage?.deleteTournamentPermanently(id);
  });

  it("creates a separate row and leaves the source row and its scores unchanged", async () => {
    const copy = (await storage.duplicateTournament(source.id, { name: "Duplicate copy", date: "2026-11-23" }))!;
    createdIds.push(copy.id);

    const sourceAfter = await storage.getTournament(source.id);
    expect(sourceAfter).toEqual(source);
    expect(sourceAfter!.finalScores).toHaveLength(4);
    expect(sourceAfter!.status).toBe("completed");

    expect(copy.id).not.toBe(source.id);
    expect(copy.shareId).not.toBe(source.shareId);
    expect(copy.urlSlug).not.toBe(source.urlSlug);
    expect(copy.players).toEqual(source.players);
    expect(copy.finalScores).toEqual([]);
    expect(copy.results).toBeNull();
    expect(copy.status).toBe("active");
    expect(copy.schedule.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown tournament", async () => {
    expect(await storage.duplicateTournament(-1, { name: "Nope" })).toBeUndefined();
  });
});
