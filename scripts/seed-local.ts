/**
 * Seeds the local docker-compose database with the local-auth users and a
 * few tournaments in different states. Wipes tournaments and users first.
 * Refuses to run against Neon. Run with `npm run db:seed`.
 */
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, isNeonUrl } from "../server/db.js";
import { storage } from "../server/storage.js";
import { tournaments, users, type Round } from "../shared/schema.js";
import { generateAmericanFormatTournament } from "../shared/american-format-generator.js";
import { LOCAL_USERS } from "../server/localAuth.js";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";
if (isNeonUrl(databaseUrl)) {
  console.error("Refusing to seed a Neon database. Point DATABASE_URL at the local docker-compose Postgres.");
  process.exit(1);
}

const organizer = LOCAL_USERS.find(u => u.id === "local_organizer")!;
const player = LOCAL_USERS.find(u => u.id === "local_player")!;
const newcomer = LOCAL_USERS.find(u => u.id === "local_newcomer")!;

function isoDate(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function buildSchedule(players: string[], courts: number, pointsPerMatch: number): Round[] {
  const result = generateAmericanFormatTournament({ players, courts, pointsPerMatch });
  if (!result.validation.isValid) {
    throw new Error(`Schedule generation failed: ${result.validation.errors.join(", ")}`);
  }
  return result.rounds.map(round => ({
    round: round.round,
    matches: round.matches.map(match => ({
      court: match.court,
      team1: [match.team1[0], match.team1[1]] as [string, string],
      team2: [match.team2[0], match.team2[1]] as [string, string],
      round: match.round,
      gameNumber: match.gameNumber,
    })),
  }));
}

/** Deterministic but varied score splits so the seeded leaderboards look real. */
function splitPoints(gameNumber: number, pointsPerMatch: number): [number, number] {
  const swing = Math.round(pointsPerMatch / 4);
  const offset = ((gameNumber * 7) % (2 * swing + 1)) - swing;
  const team1 = Math.round(pointsPerMatch / 2) + offset;
  return [team1, pointsPerMatch - team1];
}

async function scoreRounds(tournamentId: number, schedule: Round[], roundsToScore: number, pointsPerMatch: number) {
  for (const round of schedule.slice(0, roundsToScore)) {
    for (const match of round.matches) {
      const [team1Score, team2Score] = splitPoints(match.gameNumber, pointsPerMatch);
      await storage.updateTournamentScores(tournamentId, match.gameNumber, team1Score, team2Score, organizer.id);
    }
  }
}

function playerTotals(schedule: Round[], finalScores: { gameNumber: number; team1Score: number; team2Score: number }[]) {
  const totals = new Map<string, { pointsFor: number; pointsAgainst: number; played: number; won: number }>();
  const bump = (name: string, pointsFor: number, pointsAgainst: number) => {
    const entry = totals.get(name) ?? { pointsFor: 0, pointsAgainst: 0, played: 0, won: 0 };
    entry.pointsFor += pointsFor;
    entry.pointsAgainst += pointsAgainst;
    entry.played += 1;
    if (pointsFor > pointsAgainst) entry.won += 1;
    totals.set(name, entry);
  };
  for (const round of schedule) {
    for (const match of round.matches) {
      const score = finalScores.find(s => s.gameNumber === match.gameNumber);
      if (!score) continue;
      match.team1.forEach(name => bump(name, score.team1Score, score.team2Score));
      match.team2.forEach(name => bump(name, score.team2Score, score.team1Score));
    }
  }
  return Array.from(totals.entries())
    .map(([name, t]) => ({
      player: name,
      matchesPlayed: t.played,
      matchesWon: t.won,
      setsWon: t.won,
      setsLost: t.played - t.won,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      winPercentage: t.played ? (t.won / t.played) * 100 : 0,
      totalPoints: t.pointsFor,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

async function main() {
  console.log("Wiping tournaments and users…");
  await db.execute(sql`TRUNCATE TABLE ${tournaments}, ${users} RESTART IDENTITY CASCADE`);

  console.log("Creating local users…");
  for (const user of LOCAL_USERS) {
    await storage.upsertUser({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      playtomicRating: user.role === "player" ? 3.2 : null,
    });
  }

  // 1. Upcoming fixed-roster tournament, partially scored: the main scoring demo.
  const fridayPlayers = ["Ana", "Bruno", "Carla", "Diego", "Elena", "Fabio", "Gina", "Hugo"];
  const fridaySchedule = buildSchedule(fridayPlayers, 2, 24);
  const friday = await storage.createTournament({
    name: "Friday Night Americano",
    date: isoDate(2),
    time: "19:00",
    location: "Padel Club Centro",
    price: "12",
    currency: "EUR",
    playersCount: fridayPlayers.length,
    courtsCount: 2,
    pointsPerMatch: 24,
    players: fridayPlayers,
    schedule: fridaySchedule,
    organizerId: organizer.id,
  });
  await scoreRounds(friday.id, fridaySchedule, 2, 24);
  console.log(`  #${friday.id} ${friday.name} -> /shared/${friday.urlSlug}`);

  // 2. Registration-mode tournament with sign-ups open.
  const registrationId = nanoid(12);
  const now = new Date().toISOString();
  const [sunday] = await db
    .insert(tournaments)
    .values({
      name: "Sunday Open",
      date: isoDate(9),
      time: "10:30",
      location: "Riverside Padel",
      price: "15",
      currency: "EUR",
      playersCount: 12,
      courtsCount: 3,
      pointsPerMatch: 16,
      players: [],
      schedule: [],
      tournamentMode: "registration",
      registrationId,
      registrationStatus: "open",
      maxParticipants: 12,
      registeredParticipants: [
        { id: nanoid(8), userId: player.id, name: `${player.firstName} ${player.lastName}`, email: player.email, playtomicRating: 3.2, registeredAt: now, status: "registered" },
        { id: nanoid(8), name: "Marta Ruiz", email: "marta@example.test", playtomicRating: 2.8, registeredAt: now, status: "registered" },
        { id: nanoid(8), name: "Jonas Weber", playtomicRating: 4.1, registeredAt: now, status: "registered" },
        { id: nanoid(8), name: "Sofia Lind", email: "sofia@example.test", registeredAt: now, status: "registered" },
        { id: nanoid(8), name: "Tomás Reyes", playtomicRating: 3.5, registeredAt: now, status: "registered" },
      ],
      shareId: nanoid(16),
      urlSlug: "sunday-open",
      organizerId: organizer.id,
    })
    .returning();
  console.log(`  #${sunday.id} ${sunday.name} -> /register/${registrationId}`);

  // 3. Completed tournament with a leaderboard; the local player is co-organizer.
  const cupPlayers = ["Ivan", "Julia", "Karim", "Lena", "Marco", "Nadia", "Oscar", "Paula", "Quique", "Rosa", "Sergio", "Tania"];
  const cupSchedule = buildSchedule(cupPlayers, 3, 16);
  const cup = await storage.createTournament({
    name: "Summer Cup",
    date: isoDate(-10),
    time: "17:00",
    location: "Beach Padel Arena",
    playersCount: cupPlayers.length,
    courtsCount: 3,
    pointsPerMatch: 16,
    players: cupPlayers,
    schedule: cupSchedule,
    organizerId: organizer.id,
  });
  await scoreRounds(cup.id, cupSchedule, cupSchedule.length, 16);
  const scoredCup = (await storage.getTournament(cup.id))!;
  await db
    .update(tournaments)
    .set({
      results: playerTotals(cupSchedule, scoredCup.finalScores ?? []),
      status: "completed",
      completedAt: new Date(),
      leaderboardId: nanoid(16),
      coOrganizerEmail: newcomer.email,
    })
    .where(sql`${tournaments.id} = ${cup.id}`);
  console.log(`  #${cup.id} ${cup.name} -> /shared/${cup.urlSlug} (completed)`);

  // 4. A cancelled one so the dashboard shows every status.
  const cancelled = await storage.createTournament({
    name: "Rained-out Mixer",
    date: isoDate(-3),
    time: "18:00",
    location: "Open-air Courts",
    playersCount: 8,
    courtsCount: 2,
    pointsPerMatch: 24,
    players: fridayPlayers,
    schedule: buildSchedule(fridayPlayers, 2, 24),
    organizerId: organizer.id,
    status: "cancelled",
  });
  console.log(`  #${cancelled.id} ${cancelled.name} (cancelled)`);

  console.log("\nDone. Sign in as one of:");
  for (const user of LOCAL_USERS) console.log(`  ${user.firstName.padEnd(7)} ${user.role.padEnd(9)} ${user.email}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
