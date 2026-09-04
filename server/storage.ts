import {
  tournaments,
  users,
  type Tournament,
  type InsertTournament,
  type User,
  type UpsertUser,
  type RegisteredParticipant,
  type RegistrationInfo,
  type UpcomingTournament,
  type JoinedTournamentSummary,
} from "../shared/schema.js";
import { db } from "./db.js";
import { and, asc, desc, eq, gt, gte, isNotNull, isNull, or, sql } from "drizzle-orm";
import { TOURNAMENT_CONFIG, type RegistrationStatus } from "../shared/tournament-config.js";
import { generateAmericanFormatTournament } from "../shared/american-format-generator.js";
import type { AmericanFormatConfig } from "../shared/tournament-types.js";
import { nanoid } from "nanoid";
import { buildParticipantRegistrationPredicate } from "./participant-query.js";

export interface IStorage {
  // User profile and role operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  migrateUserId(oldId: string, newId: string, profile: { firstName: string | null; lastName: string | null; profileImageUrl: string | null }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  setUserRole(id: string, role: "player" | "organizer" | "admin"): Promise<User | undefined>;
  updateUserProfile(id: string, profile: { playtomicRating: number | null }): Promise<User | undefined>;
  
  // Tournament operations
  getTournament(id: number): Promise<Tournament | undefined>;
  getTournamentByShareId(shareId: string): Promise<Tournament | undefined>;
  getTournamentByUrlSlug(urlSlug: string): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  generateShareId(tournamentId: number): Promise<string>;
  generateUrlSlug(tournamentName: string): Promise<string>;
  getAllTournaments(): Promise<Tournament[]>;
  getUpcomingOpenTournaments(limit?: number): Promise<UpcomingTournament[]>;
  getTournamentsByOrganizer(organizerId: string): Promise<Tournament[]>;
  updateTournament(id: number, tournament: Partial<InsertTournament>): Promise<Tournament | undefined>;
  updateTournamentStatus(id: number, status: string): Promise<Tournament | undefined>;
  updateTournamentResults(id: number, results: any, schedule: any): Promise<Tournament | undefined>;
  updateTournamentScores(id: number, gameNumber: number, team1Score: number, team2Score: number, updatedBy: string): Promise<Tournament | undefined>;
  completeTournament(id: number, finalResults: any[]): Promise<Tournament | undefined>;
  getTournamentByLeaderboardId(leaderboardId: string): Promise<Tournament | undefined>;
  generateLeaderboardId(tournamentId: number): Promise<string>;
  archiveTournament(id: number): Promise<Tournament | undefined>;
  deleteTournamentPermanently(id: number): Promise<void>;
  getTournamentOwnerId(id: number): Promise<string | null>;
  
  // Self-registration operations
  getTournamentByRegistrationId(registrationId: string): Promise<Tournament | undefined>;
  generateRegistrationId(tournamentId: number): Promise<string>;
  registerParticipant(registrationId: string, participant: Omit<RegisteredParticipant, 'id' | 'registeredAt' | 'status'>): Promise<RegisteredParticipant | null>;
  addParticipantAsOrganizer(tournamentId: number, participant: { name: string; email?: string; playtomicRating?: number | null }): Promise<RegisteredParticipant>;
  removeParticipant(tournamentId: number, participantId: string): Promise<boolean>;
  updateParticipant(tournamentId: number, participantId: string, updates: Partial<RegisteredParticipant>): Promise<RegisteredParticipant | null>;
  getRegistrationInfo(registrationId: string): Promise<RegistrationInfo | null>;
  getTournamentsByParticipant(userId: string, email?: string | null): Promise<JoinedTournamentSummary[]>;
  updateRegistrationStatus(tournamentId: number, status: RegistrationStatus): Promise<Tournament | undefined>;
  convertRegistrationToTournament(tournamentId: number): Promise<Tournament | undefined>;
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
        players: insertTournament.players as any,
        schedule: insertTournament.schedule as any,
        shareId,
        urlSlug
      } as typeof tournaments.$inferInsert)
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
    const existing = await this.getTournament(id);
    if (!existing) return undefined;

    const updates: Partial<typeof tournaments.$inferInsert> = { status };
    if (status === TOURNAMENT_CONFIG.STATUS.CANCELLED || status === TOURNAMENT_CONFIG.STATUS.ARCHIVED) {
      updates.registrationStatus = TOURNAMENT_CONFIG.REGISTRATION_STATUS.CLOSED;
    } else if (status === TOURNAMENT_CONFIG.STATUS.ACTIVE && existing.registrationId) {
      const participantCount = existing.registeredParticipants?.length ?? 0;
      const capacity = existing.maxParticipants ?? existing.playersCount;
      updates.registrationStatus = participantCount >= capacity
        ? TOURNAMENT_CONFIG.REGISTRATION_STATUS.FULL
        : TOURNAMENT_CONFIG.REGISTRATION_STATUS.OPEN;
    }

    const [tournament] = await db
      .update(tournaments)
      .set(updates)
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

  async getUpcomingOpenTournaments(limit = 6): Promise<UpcomingTournament[]> {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = await db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        date: tournaments.date,
        time: tournaments.time,
        location: tournaments.location,
        price: tournaments.price,
        currency: tournaments.currency,
        playersCount: tournaments.playersCount,
        maxParticipants: tournaments.maxParticipants,
        registeredParticipants: tournaments.registeredParticipants,
        pointsPerMatch: tournaments.pointsPerMatch,
        registrationId: tournaments.registrationId,
      })
      .from(tournaments)
      .where(and(
        eq(tournaments.status, TOURNAMENT_CONFIG.STATUS.ACTIVE),
        eq(tournaments.tournamentMode, TOURNAMENT_CONFIG.TOURNAMENT_MODE.SELF_REGISTRATION),
        eq(tournaments.registrationStatus, TOURNAMENT_CONFIG.REGISTRATION_STATUS.OPEN),
        isNotNull(tournaments.registrationId),
        isNotNull(tournaments.date),
        gte(tournaments.date, today),
        or(
          isNull(tournaments.registrationDeadline),
          gt(tournaments.registrationDeadline, new Date()),
        ),
      ))
      .orderBy(asc(tournaments.date), asc(tournaments.time))
      .limit(limit);

    return upcoming.map((tournament) => ({
      id: tournament.id,
      name: tournament.name,
      date: tournament.date!,
      time: tournament.time ?? "",
      location: tournament.location ?? "",
      price: tournament.price ?? undefined,
      currency: tournament.currency ?? undefined,
      currentParticipants: tournament.registeredParticipants?.length ?? 0,
      maxParticipants: tournament.maxParticipants ?? tournament.playersCount,
      pointsPerMatch: tournament.pointsPerMatch,
      registrationId: tournament.registrationId!,
    }));
  }

  // User profile and role operations
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`);
    return user || undefined;
  }

  /**
   * Re-keys an existing user to a new Clerk ID (same person, new auth
   * instance). tournaments.organizer_id references users.id without cascade,
   * so the new row must exist before references move and the old row can
   * only be deleted afterwards.
   */
  async migrateUserId(
    oldId: string,
    newId: string,
    profile: { firstName: string | null; lastName: string | null; profileImageUrl: string | null },
  ): Promise<User> {
    const oldUser = await this.getUser(oldId);
    if (!oldUser) throw new Error(`Cannot migrate unknown user ${oldId}`);

    // Free the unique email before inserting the new row
    await db
      .update(users)
      .set({ email: `migrated-${oldId}@retired.invalid` })
      .where(eq(users.id, oldId));

    const [newUser] = await db
      .insert(users)
      .values({
        id: newId,
        email: oldUser.email,
        firstName: profile.firstName ?? oldUser.firstName,
        lastName: profile.lastName ?? oldUser.lastName,
        profileImageUrl: profile.profileImageUrl ?? oldUser.profileImageUrl,
        playtomicRating: oldUser.playtomicRating,
        role: oldUser.role,
        createdAt: oldUser.createdAt,
        updatedAt: new Date(),
      })
      .returning();

    await db
      .update(tournaments)
      .set({ organizerId: newId })
      .where(eq(tournaments.organizerId, oldId));

    await db.execute(sql`
      UPDATE ${tournaments}
      SET registered_participants = (
        SELECT json_agg(
          CASE
            WHEN participant->>'userId' = ${oldId}
            THEN (participant::jsonb || jsonb_build_object('userId', ${newId}::text))::json
            ELSE participant
          END
        )
        FROM json_array_elements(${tournaments.registeredParticipants}) AS participant
      )
      WHERE EXISTS (
        SELECT 1
        FROM json_array_elements(COALESCE(${tournaments.registeredParticipants}, '[]'::json)) AS participant
        WHERE participant->>'userId' = ${oldId}
      )
    `);

    await db.delete(users).where(eq(users.id, oldId));

    return newUser;
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

  async setUserRole(id: string, role: "player" | "organizer" | "admin"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserProfile(id: string, profile: { playtomicRating: number | null }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
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
    if (tournamentData.players && !tournamentData.schedule) {
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
    if (tournamentData.playersCount !== undefined) updateData.playersCount = tournamentData.playersCount;
    if (tournamentData.courtsCount !== undefined) updateData.courtsCount = tournamentData.courtsCount;
    if (tournamentData.pointsPerMatch !== undefined) updateData.pointsPerMatch = tournamentData.pointsPerMatch;
    if (tournamentData.players) updateData.players = tournamentData.players as any;
    if (tournamentData.schedule) updateData.schedule = tournamentData.schedule as any;
    if (tournamentData.finalScores !== undefined) updateData.finalScores = tournamentData.finalScores as any;
    if (tournamentData.results !== undefined) updateData.results = tournamentData.results as any;
    if (tournamentData.status) updateData.status = tournamentData.status;
    if (tournamentData.tournamentMode) updateData.tournamentMode = tournamentData.tournamentMode;
    if (tournamentData.maxParticipants !== undefined) updateData.maxParticipants = tournamentData.maxParticipants;
    if (tournamentData.registrationStatus) updateData.registrationStatus = tournamentData.registrationStatus;
    if (tournamentData.registrationDeadline !== undefined) updateData.registrationDeadline = tournamentData.registrationDeadline;

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      // If no fields to update, just return the existing tournament
      return await this.getTournament(id);
    }

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

  async archiveTournament(id: number): Promise<Tournament | undefined> {
    return this.updateTournamentStatus(id, TOURNAMENT_CONFIG.STATUS.ARCHIVED);
  }

  async deleteTournamentPermanently(id: number): Promise<void> {
    await db.delete(tournaments).where(eq(tournaments.id, id));
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

  // Self-registration implementations
  async getTournamentByRegistrationId(registrationId: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.registrationId, registrationId));
    return tournament || undefined;
  }

  async generateRegistrationId(tournamentId: number): Promise<string> {
    const registrationId = nanoid(12); // Shorter, URL-friendly ID
    await db.update(tournaments).set({ registrationId }).where(eq(tournaments.id, tournamentId));
    return registrationId;
  }

  async registerParticipant(registrationId: string, participant: Omit<RegisteredParticipant, 'id' | 'registeredAt' | 'status'>): Promise<RegisteredParticipant | null> {
    const newParticipant: RegisteredParticipant = {
      id: nanoid(8),
      userId: participant.userId,
      name: participant.name,
      email: participant.email,
      playtomicRating: participant.playtomicRating,
      registeredAt: new Date().toISOString(),
      status: 'registered'
    };

    const serializedParticipant = JSON.stringify([newParticipant]);
    const result = await db.execute(sql`
      UPDATE ${tournaments}
      SET
        registered_participants = (
          COALESCE(${tournaments.registeredParticipants}, '[]'::json)::jsonb
          || ${serializedParticipant}::jsonb
        )::json,
        registration_status = CASE
          WHEN json_array_length(COALESCE(${tournaments.registeredParticipants}, '[]'::json)) + 1
            >= COALESCE(${tournaments.maxParticipants}, ${tournaments.playersCount})
          THEN ${TOURNAMENT_CONFIG.REGISTRATION_STATUS.FULL}
          ELSE ${TOURNAMENT_CONFIG.REGISTRATION_STATUS.OPEN}
        END
      WHERE ${tournaments.registrationId} = ${registrationId}
        AND ${tournaments.registrationStatus} = ${TOURNAMENT_CONFIG.REGISTRATION_STATUS.OPEN}
        AND (${tournaments.registrationDeadline} IS NULL OR ${tournaments.registrationDeadline} > NOW())
        AND json_array_length(COALESCE(${tournaments.registeredParticipants}, '[]'::json))
          < COALESCE(${tournaments.maxParticipants}, ${tournaments.playersCount})
        AND NOT EXISTS (
          SELECT 1
          FROM json_array_elements(COALESCE(${tournaments.registeredParticipants}, '[]'::json)) AS existing
          WHERE lower(existing->>'name') = lower(${participant.name})
        )
      RETURNING ${tournaments.id}
    `);

    return result.rows.length > 0 ? newParticipant : null;
  }

  async addParticipantAsOrganizer(tournamentId: number, participant: { name: string; email?: string; playtomicRating?: number | null }): Promise<RegisteredParticipant> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    const currentParticipants = tournament.registeredParticipants || [];
    const maxParticipants = tournament.maxParticipants || tournament.playersCount;

    if (currentParticipants.length >= maxParticipants) {
      throw new Error("Tournament is full");
    }

    const nameTaken = currentParticipants.some(
      p => p.name.toLowerCase() === participant.name.toLowerCase()
    );
    if (nameTaken) {
      throw new Error("A player with this name is already registered");
    }

    const newParticipant: RegisteredParticipant = {
      id: nanoid(8),
      name: participant.name,
      email: participant.email,
      playtomicRating: participant.playtomicRating,
      registeredAt: new Date().toISOString(),
      status: 'registered'
    };

    const updatedParticipants = [...currentParticipants, newParticipant];
    const newStatus = updatedParticipants.length >= maxParticipants
      ? TOURNAMENT_CONFIG.REGISTRATION_STATUS.FULL
      : tournament.registrationStatus;

    await db.update(tournaments)
      .set({
        registeredParticipants: updatedParticipants as any,
        registrationStatus: newStatus
      })
      .where(eq(tournaments.id, tournamentId));

    return newParticipant;
  }

  async removeParticipant(tournamentId: number, participantId: string): Promise<boolean> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return false;

    const currentParticipants = tournament.registeredParticipants || [];
    const updatedParticipants = currentParticipants.filter(p => p.id !== participantId);
    
    if (updatedParticipants.length === currentParticipants.length) {
      return false; // Participant not found
    }

    // Update registration status (reopen if was full)
    const newStatus = tournament.registrationStatus === TOURNAMENT_CONFIG.REGISTRATION_STATUS.FULL
      ? TOURNAMENT_CONFIG.REGISTRATION_STATUS.OPEN
      : tournament.registrationStatus;

    await db.update(tournaments)
      .set({ 
        registeredParticipants: updatedParticipants as any,
        registrationStatus: newStatus
      })
      .where(eq(tournaments.id, tournamentId));

    return true;
  }

  async updateParticipant(tournamentId: number, participantId: string, updates: Partial<RegisteredParticipant>): Promise<RegisteredParticipant | null> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return null;

    const currentParticipants = tournament.registeredParticipants || [];
    const participantIndex = currentParticipants.findIndex(p => p.id === participantId);
    
    if (participantIndex === -1) return null;

    // Update participant
    const updatedParticipant = { ...currentParticipants[participantIndex], ...updates };
    const updatedParticipants = [...currentParticipants];
    updatedParticipants[participantIndex] = updatedParticipant;

    await db.update(tournaments)
      .set({ registeredParticipants: updatedParticipants as any })
      .where(eq(tournaments.id, tournamentId));

    return updatedParticipant;
  }

  async getRegistrationInfo(registrationId: string): Promise<RegistrationInfo | null> {
    const tournament = await this.getTournamentByRegistrationId(registrationId);
    if (!tournament) return null;

    const currentParticipants = tournament.registeredParticipants || [];
    const hasSchedule = Array.isArray(tournament.schedule) && tournament.schedule.length > 0;
    const publicId = tournament.urlSlug || tournament.shareId;

    return {
      schedulePath: hasSchedule && publicId ? `/shared/${publicId}` : undefined,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      date: tournament.date || '',
      time: tournament.time || '',
      location: tournament.location || '',
      price: tournament.price || undefined,
      currency: tournament.currency || undefined,
      currentParticipants: currentParticipants.length,
      maxParticipants: tournament.maxParticipants || tournament.playersCount,
      pointsPerMatch: tournament.pointsPerMatch,
      registrationStatus: tournament.registrationStatus as 'open' | 'closed' | 'full',
      deadline: tournament.registrationDeadline?.toISOString()
    };
  }

  async getTournamentsByParticipant(userId: string, email?: string | null): Promise<JoinedTournamentSummary[]> {
    return db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        date: tournaments.date,
        time: tournaments.time,
        location: tournaments.location,
        status: tournaments.status,
        shareId: tournaments.shareId,
        urlSlug: tournaments.urlSlug,
        leaderboardId: tournaments.leaderboardId,
        registrationStatus: tournaments.registrationStatus,
      })
      .from(tournaments)
      .where(buildParticipantRegistrationPredicate(userId, email))
      .orderBy(desc(tournaments.createdAt));
  }

  async updateRegistrationStatus(tournamentId: number, status: RegistrationStatus): Promise<Tournament | undefined> {
    const [updated] = await db
      .update(tournaments)
      .set({ registrationStatus: status })
      .where(eq(tournaments.id, tournamentId))
      .returning();
    return updated || undefined;
  }

  async convertRegistrationToTournament(tournamentId: number): Promise<Tournament | undefined> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return undefined;

    // Converting twice would regenerate the schedule and orphan any scores
    // already recorded against the first one.
    const hasSchedule = Array.isArray(tournament.schedule) && tournament.schedule.length > 0;
    if (tournament.tournamentMode !== TOURNAMENT_CONFIG.TOURNAMENT_MODE.SELF_REGISTRATION || hasSchedule) {
      throw new Error('This tournament already has a schedule. Edit players in Manage if you need to regenerate it.');
    }

    // Convert registered participants to players array. The registration
    // list itself is left untouched so sign-up data is never lost.
    const participants = tournament.registeredParticipants || [];
    const playerNames = participants
      .filter(p => p.status === 'registered' || p.status === 'confirmed')
      .map(p => p.name);

    if (playerNames.length < TOURNAMENT_CONFIG.MIN_PLAYERS) {
      throw new Error(`At least ${TOURNAMENT_CONFIG.MIN_PLAYERS} registered players are required to generate a schedule.`);
    }

    // Generate the tournament schedule
    const config: AmericanFormatConfig = {
      players: playerNames,
      courts: tournament.courtsCount,
      pointsPerMatch: tournament.pointsPerMatch
    };

    const { rounds, validation } = generateAmericanFormatTournament(config);
    
    if (!validation.isValid) {
      throw new Error(`Failed to generate schedule: ${validation.errors.join(', ')}`);
    }

    // Close registration and update to traditional tournament mode with schedule
    const [updated] = await db
      .update(tournaments)
      .set({ 
        players: playerNames as any,
        playersCount: playerNames.length, // capacity may exceed actual sign-ups
        schedule: rounds as any,
        tournamentMode: TOURNAMENT_CONFIG.TOURNAMENT_MODE.FIXED_PLAYERS,
        registrationStatus: TOURNAMENT_CONFIG.REGISTRATION_STATUS.CLOSED
      })
      .where(eq(tournaments.id, tournamentId))
      .returning();
    
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
