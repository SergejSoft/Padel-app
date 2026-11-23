import { describe, expect, it } from "vitest";
import {
  buildDuplicateTournament,
  suggestDuplicateDate,
  suggestDuplicateName,
} from "../tournament-duplicate";
import { generateAmericanFormatTournament } from "../american-format-generator";
import type { Tournament } from "../schema";

const players = ["Ana", "Bruno", "Carla", "Diego", "Eva", "Fede", "Gina", "Hugo"];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function scoredTournament(overrides: Partial<Tournament> = {}): Tournament {
  const { rounds } = generateAmericanFormatTournament({ players, courts: 2, pointsPerMatch: 24 });
  const schedule = rounds.map(round => ({
    round: round.round,
    matches: round.matches.map(match => ({
      ...match,
      score: { team1Score: 14, team2Score: 10, isValid: true, totalPoints: 24, validationErrors: [] },
      status: "completed",
    })),
  }));
  const finalScores = schedule.flatMap(round => round.matches).map(match => ({
    gameNumber: match.gameNumber,
    team1Score: 14,
    team2Score: 10,
    updatedAt: "2026-11-22T19:00:00.000Z",
    updatedBy: "organizer_1",
  }));

  return {
    id: 41,
    name: "Monday Americano Day 1",
    date: "2026-11-22",
    time: "19:00",
    location: "Club Padel Norte",
    price: "12",
    currency: "EUR",
    playersCount: players.length,
    courtsCount: 2,
    pointsPerMatch: 24,
    players: [...players],
    schedule,
    results: players.map(player => ({
      player,
      matchesPlayed: 7,
      matchesWon: 4,
      setsWon: 4,
      setsLost: 3,
      pointsFor: 90,
      pointsAgainst: 78,
      winPercentage: 57,
      totalPoints: 90,
    })),
    finalScores,
    leaderboardId: "leader123",
    shareId: "share123",
    urlSlug: "monday-americano-day-1",
    status: "completed",
    organizerId: "organizer_1",
    coOrganizerId: "co_1",
    coOrganizerEmail: "co@example.com",
    tournamentMode: "fixed",
    registrationId: null,
    registrationStatus: "closed",
    maxParticipants: null,
    registeredParticipants: [
      { id: "p1", userId: "user_ana", name: "Ana", registeredAt: "2026-11-20T10:00:00.000Z", status: "registered" },
      { id: "p2", name: "Old", registeredAt: "2026-11-20T10:00:00.000Z", status: "removed" },
    ],
    registrationDeadline: null,
    createdAt: new Date("2026-11-20T10:00:00.000Z"),
    completedAt: new Date("2026-11-22T21:00:00.000Z"),
    ...overrides,
  };
}

describe("buildDuplicateTournament", () => {
  it("leaves the source tournament, its schedule and its scores untouched", () => {
    const source = scoredTournament();
    const before = structuredClone(source);
    deepFreeze(source);

    const copy = buildDuplicateTournament(source, { name: "Monday Americano Day 2", date: "2026-11-23" });

    expect(source).toEqual(before);
    expect(source.finalScores).toHaveLength(before.finalScores!.length);
    expect(source.schedule[0].matches[0].score.team1Score).toBe(14);

    // Nothing in the copy may alias the source's JSON columns.
    expect(copy.players).not.toBe(source.players);
    expect(copy.schedule).not.toBe(source.schedule);
    expect(copy.registeredParticipants![0]).not.toBe(source.registeredParticipants![0]);
  });

  it("copies format, settings, managers and players in order, with no scores", () => {
    const source = scoredTournament();
    const copy = buildDuplicateTournament(source, { name: "  Monday Americano Day 2  ", date: "2026-11-23" });

    expect(copy).toMatchObject({
      name: "Monday Americano Day 2",
      date: "2026-11-23",
      time: "19:00",
      location: "Club Padel Norte",
      price: "12",
      currency: "EUR",
      playersCount: 8,
      courtsCount: 2,
      pointsPerMatch: 24,
      players,
      organizerId: "organizer_1",
      coOrganizerId: "co_1",
      coOrganizerEmail: "co@example.com",
      tournamentMode: "fixed",
      status: "active",
      results: null,
      finalScores: [],
    });
    expect(copy).not.toHaveProperty("id");
    expect(copy).not.toHaveProperty("shareId");
    expect(copy).not.toHaveProperty("urlSlug");
    expect(copy).not.toHaveProperty("leaderboardId");
    expect(copy).not.toHaveProperty("completedAt");
  });

  it("generates a fresh, unscored schedule with the normal generator", () => {
    const copy = buildDuplicateTournament(scoredTournament(), { name: "Copy" });
    const expected = generateAmericanFormatTournament({ players, courts: 2, pointsPerMatch: 24 });

    expect(copy.schedule).toHaveLength(expected.rounds.length);
    const matches = copy.schedule.flatMap((round: any) => round.matches);
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match.score).toBeUndefined();
      expect(match.status).toBeUndefined();
    }
    expect(matches.flatMap((m: any) => [...m.team1, ...m.team2]).every((p: string) => players.includes(p))).toBe(true);
  });

  it("keeps the source date when none is given and drops removed registrations", () => {
    const copy = buildDuplicateTournament(scoredTournament(), { name: "Copy" });
    expect(copy.date).toBe("2026-11-22");
    expect(copy.registeredParticipants).toHaveLength(1);
    expect(copy.registeredParticipants![0]).toMatchObject({ userId: "user_ana", name: "Ana", status: "registered" });
    expect(copy.registeredParticipants![0].id).not.toBe("p1");
  });

  it("copies an open registration tournament as a new open registration without a schedule", () => {
    const source = scoredTournament({
      tournamentMode: "registration",
      players: [],
      schedule: [],
      finalScores: [],
      results: null,
      status: "active",
      registrationId: "reg123",
      registrationStatus: "open",
      maxParticipants: 8,
    });
    const copy = buildDuplicateTournament(source, { name: "Copy" });

    expect(copy.tournamentMode).toBe("registration");
    expect(copy.schedule).toEqual([]);
    expect(copy.registrationId).toBeTruthy();
    expect(copy.registrationId).not.toBe("reg123");
    expect(copy.registrationStatus).toBe("open");
    expect(copy.playersCount).toBe(8);
  });
});

describe("suggestDuplicateName", () => {
  it("bumps a trailing number", () => {
    expect(suggestDuplicateName("Monday Americano Day 1")).toBe("Monday Americano Day 2");
    expect(suggestDuplicateName("Session 9")).toBe("Session 10");
  });

  it("appends (copy) otherwise", () => {
    expect(suggestDuplicateName("Friday Americano")).toBe("Friday Americano (copy)");
  });
});

describe("suggestDuplicateDate", () => {
  it("moves a past date to today and keeps future dates", () => {
    expect(suggestDuplicateDate("2026-11-22", "2026-11-23")).toBe("2026-11-23");
    expect(suggestDuplicateDate("2026-11-30", "2026-11-23")).toBe("2026-11-30");
    expect(suggestDuplicateDate(null, "2026-11-23")).toBe("2026-11-23");
  });
});
