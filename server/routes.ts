import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTournamentSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin, isOwnerOrAdmin } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create tournament (requires authentication)
  app.post("/api/tournaments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTournamentSchema.parse({
        ...req.body,
        organizerId: userId,
      });
      const tournament = await storage.createTournament(validatedData);
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get tournament by ID
  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tournament = await storage.getTournament(id);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get tournaments (role-based access)  
  app.get("/api/tournaments", async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        console.log('API: User not authenticated for tournaments endpoint');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.claims.sub;
      console.log(`API: Fetching tournaments for authenticated user: ${userId}`);
      
      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`API: User ${userId} not found in database, creating default organizer`);
        // Create user with organizer role if not exists
        const newUser = await storage.upsertUser({
          id: userId,
          email: req.user.claims.email || null,
          firstName: req.user.claims.first_name || null,
          lastName: req.user.claims.last_name || null,
          profileImageUrl: req.user.claims.profile_image_url || null,
          role: 'organizer'
        });
        console.log(`API: Created new user: ${newUser.id} with role ${newUser.role}`);
      }
      
      const finalUser = user || await storage.getUser(userId);
      console.log(`API: User found: ${finalUser?.id} with role ${finalUser?.role}`);
      
      let tournaments = await storage.getTournamentsByOrganizer(userId);
      console.log(`API: User ${userId} owns ${tournaments.length} tournaments`);
      
      // If admin, also include all other tournaments
      if (finalUser?.role === 'admin') {
        const allTournaments = await storage.getAllTournaments();
        const ownTournamentIds = new Set(tournaments.map(t => t.id));
        const otherTournaments = allTournaments.filter(t => !ownTournamentIds.has(t.id));
        tournaments = [...tournaments, ...otherTournaments];
        console.log(`API: Admin user now has ${tournaments.length} total tournaments`);
      }
      
      console.log(`API: Returning ${tournaments.length} tournaments`);
      res.json(tournaments);
    } catch (error: any) {
      console.error('API Error fetching tournaments:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  // Update tournament (owner or admin only)
  app.put("/api/tournaments/:id", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTournamentSchema.partial().parse(req.body);
      const tournament = await storage.updateTournament(id, validatedData);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update tournament status (cancel/activate)
  app.patch("/api/tournaments/:id/status", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['active', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'active' or 'cancelled'" });
      }
      
      const tournament = await storage.updateTournamentStatus(id, status);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update tournament schedule (owner or admin only)
  app.patch("/api/tournaments/:id/schedule", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { schedule } = req.body;
      
      const tournament = await storage.updateTournament(id, { schedule });
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete tournament (owner or admin only)
  app.delete("/api/tournaments/:id", isOwnerOrAdmin(async (req: any) => {
    return await storage.getTournamentOwnerId(parseInt(req.params.id));
  }), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTournament(id);
      
      if (!success) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin routes
  app.post("/api/admin/promote-user", isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.body;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updatedUser = await storage.upsertUser({
        ...user,
        role: "admin",
        updatedAt: new Date(),
      });
      
      res.json({ message: "User promoted to admin", user: updatedUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/users", isAdmin, async (req: any, res) => {
    try {
      // For now, return empty array - would need to implement getAllUsers in storage
      res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Development helper: Make current user admin (remove in production)
  app.post("/api/dev/make-admin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updatedUser = await storage.upsertUser({
        ...user,
        role: "admin",
        updatedAt: new Date(),
      });
      
      res.json({ message: "You are now an admin", user: updatedUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate share ID for tournament
  app.post("/api/tournaments/:id/share", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid tournament ID" });
      }
      
      const shareId = await storage.generateShareId(id);
      const tournament = await storage.getTournament(id);
      res.json({ 
        shareId, 
        urlSlug: tournament?.urlSlug 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get tournament by share ID or URL slug
  app.get("/api/shared/:identifier", async (req, res) => {
    try {
      const { identifier } = req.params;
      
      // Try to find by shareId first, then by urlSlug
      let tournament = await storage.getTournamentByShareId(identifier);
      if (!tournament) {
        tournament = await storage.getTournamentByUrlSlug(identifier);
      }
      
      if (!tournament) {
        return res.status(404).json({ error: "Shared tournament not found" });
      }
      
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Shared leaderboard view (public)
  app.get("/api/shared/:identifier/scores", async (req, res) => {
    try {
      const { identifier } = req.params;
      
      // Try to find by shareId first, then by urlSlug
      let tournament = await storage.getTournamentByShareId(identifier);
      if (!tournament) {
        tournament = await storage.getTournamentByUrlSlug(identifier);
      }
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      // Check if tournament has saved results
      if ((!tournament.finalScores || tournament.finalScores.length === 0) && 
          (!tournament.results || tournament.results.length === 0)) {
        // Calculate results from current schedule if it has scores
        const schedule = tournament.schedule || [];
        const hasScores = schedule.some((round: any) => 
          round.matches && round.matches.some((match: any) => match.score)
        );
        
        console.log('Schedule:', JSON.stringify(schedule, null, 2));
        console.log('Has scores:', hasScores);
        
        if (!hasScores) {
          return res.status(404).json({ error: "Tournament results not available yet" });
        }
        
        // Calculate player stats from schedule
        const calculatePlayerStats = (rounds: any[]) => {
          const playerStats: any = {};
          
          rounds.forEach((round: any) => {
            round.matches?.forEach((match: any) => {
              if (match.score) {
                const { team1, team2, score } = match;
                
                // Initialize players if not exists
                [...team1, ...team2].forEach(player => {
                  if (!playerStats[player]) {
                    playerStats[player] = {
                      player,
                      matchesPlayed: 0,
                      matchesWon: 0,
                      setsWon: 0,
                      setsLost: 0,
                      pointsFor: 0,
                      pointsAgainst: 0,
                      totalPoints: 0
                    };
                  }
                });
                
                // Update stats
                team1.forEach(player => {
                  playerStats[player].matchesPlayed++;
                  playerStats[player].pointsFor += score.team1Score;
                  playerStats[player].pointsAgainst += score.team2Score;
                  
                  if (score.team1Score > score.team2Score) {
                    playerStats[player].matchesWon++;
                    playerStats[player].totalPoints += 3; // 3 points for win
                  }
                  
                  playerStats[player].setsWon += score.team1Score;
                  playerStats[player].setsLost += score.team2Score;
                  playerStats[player].totalPoints += score.team1Score; // 1 point per set won
                });
                
                team2.forEach(player => {
                  playerStats[player].matchesPlayed++;
                  playerStats[player].pointsFor += score.team2Score;
                  playerStats[player].pointsAgainst += score.team1Score;
                  
                  if (score.team2Score > score.team1Score) {
                    playerStats[player].matchesWon++;
                    playerStats[player].totalPoints += 3; // 3 points for win
                  }
                  
                  playerStats[player].setsWon += score.team2Score;
                  playerStats[player].setsLost += score.team1Score;
                  playerStats[player].totalPoints += score.team2Score; // 1 point per set won
                });
              }
            });
          });
          
          return Object.values(playerStats).map((stats: any) => ({
            player: stats.player,
            totalPoints: stats.totalPoints,
            gamesPlayed: stats.matchesPlayed,
            averageScore: stats.matchesPlayed > 0 ? stats.totalPoints / stats.matchesPlayed : 0
          }));
        };
        
        const calculatedScores = calculatePlayerStats(schedule);
        
        res.json({
          tournament: {
            id: tournament.id,
            name: tournament.name,
            date: tournament.date,
            location: tournament.location,
            status: tournament.status
          },
          finalScores: calculatedScores,
          results: calculatedScores
        });
        return;
      }
      
      res.json({
        tournament: {
          id: tournament.id,
          name: tournament.name,
          date: tournament.date,
          location: tournament.location,
          status: tournament.status
        },
        finalScores: tournament.finalScores,
        results: tournament.results
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update tournament final scores
  app.post("/api/tournaments/:id/final-scores", isAuthenticated, async (req: any, res) => {
    try {
      const tournamentId = parseInt(req.params.id);
      const { finalScores } = req.body;
      
      // Check if user is organizer or admin
      const ownerId = await storage.getTournamentOwnerId(tournamentId);
      if (!ownerId || (req.user.id !== ownerId && req.user.role !== 'admin')) {
        return res.status(403).json({ error: "Not authorized to update this tournament" });
      }
      
      const updatedTournament = await storage.updateTournamentFinalScores(tournamentId, finalScores);
      if (!updatedTournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      res.json(updatedTournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save tournament results
  app.patch("/api/tournaments/:id/results", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid tournament ID" });
      }

      const { results, schedule } = req.body;
      
      if (!results || !schedule) {
        return res.status(400).json({ error: "Results and schedule are required" });
      }

      // Check if user owns tournament or is admin
      const userId = req.user?.id;
      const tournamentOwnerId = await storage.getTournamentOwnerId(id);
      const user = await storage.getUser(userId!);
      
      if (tournamentOwnerId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ error: "Not authorized to save results for this tournament" });
      }

      const tournament = await storage.updateTournamentResults(id, results, schedule);
      
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get tournament leaderboard by leaderboard ID
  app.get("/api/leaderboard/:leaderboardId", async (req, res) => {
    try {
      const { leaderboardId } = req.params;
      
      const tournament = await storage.getTournamentByLeaderboardId(leaderboardId);
      
      if (!tournament) {
        return res.status(404).json({ error: "Leaderboard not found" });
      }

      if (tournament.status !== 'completed' || !tournament.results) {
        return res.status(404).json({ error: "Tournament results not available" });
      }
      
      res.json({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentDate: tournament.date,
        tournamentTime: tournament.time,
        tournamentLocation: tournament.location,
        results: tournament.results,
        finalScores: tournament.finalScores,
        completedAt: tournament.completedAt,
        status: tournament.status
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
