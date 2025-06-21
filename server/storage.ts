import {
  tournaments,
  users,
  type Tournament,
  type InsertTournament,
  type User,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Tournament operations
  getTournament(id: number): Promise<Tournament | undefined>;
  getTournamentByShareId(shareId: string): Promise<Tournament | undefined>;
  getTournamentByUrlSlug(urlSlug: string): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  generateShareId(tournamentId: number): Promise<string>;
  generateUrlSlug(tournamentName: string): Promise<string>;
  getAllTournaments(): Promise<Tournament[]>;
  getTournamentsByOrganizer(organizerId: string): Promise<Tournament[]>;
  updateTournament(id: number, tournament: Partial<InsertTournament>): Promise<Tournament | undefined>;
  updateTournamentStatus(id: number, status: string): Promise<Tournament | undefined>;
  deleteTournament(id: number): Promise<boolean>;
  getTournamentOwnerId(id: number): Promise<string | null>;
}

export class DatabaseStorage implements IStorage {
  async getTournament(id: number): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament || undefined;
  }

  async getTournamentByShareId(shareId: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.shareId, shareId));
    return tournament || undefined;
  }

  async getTournamentByUrlSlug(urlSlug: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.urlSlug, urlSlug));
    return tournament || undefined;
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    // Generate shareId and urlSlug immediately during creation to avoid duplicates
    const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const urlSlug = await this.generateUrlSlug(insertTournament.name);
    const [tournament] = await db
      .insert(tournaments)
      .values({
        ...insertTournament,
        shareId,
        urlSlug,
        players: insertTournament.players as any,
        schedule: insertTournament.schedule as any,
      })
      .returning();
    return tournament;
  }

  async generateShareId(tournamentId: number): Promise<string> {
    const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await db.update(tournaments).set({ shareId }).where(eq(tournaments.id, tournamentId));
    return shareId;
  }

  async generateUrlSlug(tournamentName: string): Promise<string> {
    // Create a URL-friendly slug from tournament name
    let baseSlug = tournamentName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();

    // If slug is empty, use a default
    if (!baseSlug) {
      baseSlug = 'tournament';
    }

    // Check if slug exists and make it unique
    let counter = 1;
    let finalSlug = baseSlug;
    
    while (true) {
      const existing = await db.select().from(tournaments).where(eq(tournaments.urlSlug, finalSlug));
      if (existing.length === 0) {
        break;
      }
      finalSlug = `${baseSlug}${counter}`;
      counter++;
    }

    return finalSlug;
  }

  async updateTournamentStatus(id: number, status: string): Promise<Tournament | undefined> {
    const [tournament] = await db
      .update(tournaments)
      .set({ status })
      .where(eq(tournaments.id, id))
      .returning();
    return tournament;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt));
  }

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getTournamentsByOrganizer(organizerId: string): Promise<Tournament[]> {
    console.log(`Storage: Looking for tournaments with organizer_id: "${organizerId}" (type: ${typeof organizerId})`);
    
    // Try both string and number comparisons to handle type mismatches
    const stringResult = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.organizerId, organizerId))
      .orderBy(desc(tournaments.createdAt));
    
    console.log(`Storage: Found ${stringResult.length} tournaments for organizer "${organizerId}"`);
    
    // If no results with string, try converting to number and back
    if (stringResult.length === 0) {
      const numericId = parseInt(organizerId);
      if (!isNaN(numericId)) {
        const numericResult = await db
          .select()
          .from(tournaments)
          .where(eq(tournaments.organizerId, numericId.toString()))
          .orderBy(desc(tournaments.createdAt));
        console.log(`Storage: Found ${numericResult.length} tournaments with numeric conversion`);
        return numericResult;
      }
    }
    
    return stringResult;
  }

  async updateTournament(id: number, tournamentData: Partial<InsertTournament>): Promise<Tournament | undefined> {
    // If players are being updated, we need to update the schedule as well
    if (tournamentData.players) {
      const existingTournament = await this.getTournament(id);
      if (existingTournament && existingTournament.schedule) {
        // Update player names in the schedule
        const updatedSchedule = this.updatePlayerNamesInSchedule(
          existingTournament.schedule,
          existingTournament.players as string[],
          tournamentData.players as string[]
        );
        tournamentData.schedule = updatedSchedule;
      }
    }

    const [tournament] = await db
      .update(tournaments)
      .set({
        ...tournamentData,
        players: tournamentData.players as any,
        schedule: tournamentData.schedule as any,
      })
      .where(eq(tournaments.id, id))
      .returning();
    return tournament;
  }

  private updatePlayerNamesInSchedule(schedule: any[], oldPlayers: string[], newPlayers: string[]): any[] {
    // Create a mapping from old names to new names
    const nameMapping: { [key: string]: string } = {};
    oldPlayers.forEach((oldName, index) => {
      if (index < newPlayers.length) {
        nameMapping[oldName] = newPlayers[index];
      }
    });

    // Update the schedule with new player names
    return schedule.map(round => ({
      ...round,
      matches: round.matches.map((match: any) => ({
        ...match,
        team1: [
          nameMapping[match.team1[0]] || match.team1[0],
          nameMapping[match.team1[1]] || match.team1[1]
        ],
        team2: [
          nameMapping[match.team2[0]] || match.team2[0],
          nameMapping[match.team2[1]] || match.team2[1]
        ]
      }))
    }));
  }

  async deleteTournament(id: number): Promise<boolean> {
    const result = await db.delete(tournaments).where(eq(tournaments.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getTournamentOwnerId(id: number): Promise<string | null> {
    const [tournament] = await db
      .select({ organizerId: tournaments.organizerId })
      .from(tournaments)
      .where(eq(tournaments.id, id));
    return tournament?.organizerId || null;
  }
}

export const storage = new DatabaseStorage();
