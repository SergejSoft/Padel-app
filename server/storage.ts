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
  updateTournamentResults(id: number, results: any, schedule: any): Promise<Tournament | undefined>;
  updateTournamentScores(id: number, gameNumber: number, team1Score: number, team2Score: number, updatedBy: string): Promise<Tournament | undefined>;
  completeTournament(id: number, finalResults: any[]): Promise<Tournament | undefined>;
  getTournamentByLeaderboardId(leaderboardId: string): Promise<Tournament | undefined>;
  generateLeaderboardId(tournamentId: number): Promise<string>;
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
        name: insertTournament.name,
        date: insertTournament.date,
        time: insertTournament.time,
        location: insertTournament.location,
        playersCount: insertTournament.playersCount,
        courtsCount: insertTournament.courtsCount,
        players: insertTournament.players as any,
        schedule: insertTournament.schedule as any,
        organizerId: insertTournament.organizerId,
        status: insertTournament.status || 'active',
        shareId,
        urlSlug
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
    try {
      console.log(`Storage: Looking for user with id: "${id}"`);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      console.log(`Storage: User found:`, user ? `${user.id} (${user.role})` : 'not found');
      return user;
    } catch (error) {
      console.error('Storage error in getUser:', error);
      throw error;
    }
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
    try {
      console.log(`Storage: Looking for tournaments with organizer_id: "${organizerId}"`);
      
      const result = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.organizerId, organizerId))
        .orderBy(desc(tournaments.createdAt));
      
      console.log(`Storage: Found ${result.length} tournaments for organizer "${organizerId}"`);
      return result;
    } catch (error) {
      console.error('Storage error in getTournamentsByOrganizer:', error);
      throw error;
    }
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

    const updateData: any = {};
    if (tournamentData.name) updateData.name = tournamentData.name;
    if (tournamentData.date) updateData.date = tournamentData.date;
    if (tournamentData.time) updateData.time = tournamentData.time;
    if (tournamentData.location) updateData.location = tournamentData.location;
    if (tournamentData.players) updateData.players = tournamentData.players as any;
    if (tournamentData.schedule) updateData.schedule = tournamentData.schedule as any;
    if (tournamentData.status) updateData.status = tournamentData.status;

    const [tournament] = await db
      .update(tournaments)
      .set(updateData)
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

  async updateTournamentResults(id: number, results: any, schedule: any): Promise<Tournament | undefined> {
    try {
      // Generate leaderboard ID if not exists
      const leaderboardId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const [tournament] = await db
        .update(tournaments)
        .set({ 
          results: results as any,
          finalScores: schedule as any,
          schedule: schedule as any,
          status: 'completed',
          leaderboardId: leaderboardId,
          completedAt: new Date()
        })
        .where(eq(tournaments.id, id))
        .returning();
      return tournament || undefined;
    } catch (error) {
      console.error('Storage error in updateTournamentResults:', error);
      throw error;
    }
  }

  async getTournamentByLeaderboardId(leaderboardId: string): Promise<Tournament | undefined> {
    try {
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.leaderboardId, leaderboardId));
      return tournament || undefined;
    } catch (error) {
      console.error('Storage error in getTournamentByLeaderboardId:', error);
      throw error;
    }
  }

  async generateLeaderboardId(tournamentId: number): Promise<string> {
    try {
      const leaderboardId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      await db
        .update(tournaments)
        .set({ leaderboardId })
        .where(eq(tournaments.id, tournamentId));
        
      return leaderboardId;
    } catch (error) {
      console.error('Storage error in generateLeaderboardId:', error);
      throw error;
    }
  }

  async getTournamentOwnerId(id: number): Promise<string | null> {
    const [tournament] = await db
      .select({ organizerId: tournaments.organizerId })
      .from(tournaments)
      .where(eq(tournaments.id, id));
    return tournament?.organizerId || null;
  }

  async updateTournamentScores(id: number, gameNumber: number, team1Score: number, team2Score: number, updatedBy: string): Promise<Tournament | undefined> {
    const tournament = await this.getTournament(id);
    if (!tournament) return undefined;

    // Get existing scores or initialize empty array
    const existingScores = tournament.finalScores || [];
    
    // Find existing score for this game or create new one
    const scoreIndex = existingScores.findIndex((score: any) => score.gameNumber === gameNumber);
    const scoreEntry = {
      gameNumber,
      team1Score,
      team2Score,
      updatedAt: new Date().toISOString(),
      updatedBy
    };

    if (scoreIndex >= 0) {
      existingScores[scoreIndex] = scoreEntry;
    } else {
      existingScores.push(scoreEntry);
    }

    const [updatedTournament] = await db
      .update(tournaments)
      .set({ finalScores: existingScores })
      .where(eq(tournaments.id, id))
      .returning();

    return updatedTournament;
  }

  async completeTournament(id: number, finalResults: any[]): Promise<Tournament | undefined> {
    const [updatedTournament] = await db
      .update(tournaments)
      .set({ 
        results: finalResults,
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(tournaments.id, id))
      .returning();

    return updatedTournament;
  }
}

export const storage = new DatabaseStorage();
