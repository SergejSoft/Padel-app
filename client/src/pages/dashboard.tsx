import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Settings, Users, Calendar, Edit, Crown, Share, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { UserButton, useClerk } from "@clerk/react";
import { TournamentWizard } from "@/components/tournament-wizard";
import { EditTournamentModal } from "@/components/edit-tournament-modal";
import { Footer } from "@/components/footer";
import type { Tournament } from "@shared/schema";

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { signOut } = useClerk();
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

  const { data: tournaments = [], isLoading, error } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
    retry: false,
  });

  // Sort tournaments by date (newest first), then by creation order
  const sortedTournaments = [...tournaments].sort((a, b) => {
    // First, sort by date if both have dates
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    // If only one has a date, prioritize it
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    // If neither has a date, sort by ID (newest first)
    return b.id - a.id;
  });
  const currentEditingTournament = editingTournament
    ? tournaments.find(tournament => tournament.id === editingTournament.id) ?? editingTournament
    : null;

  const getTournamentStatus = (tournament: Tournament) => {
    if (tournament.status === 'archived') return 'archived';
    if (tournament.status === 'cancelled') return 'cancelled';
    if (tournament.status === 'completed') return 'completed';
    if (tournament.date && new Date(tournament.date) < new Date()) return 'past';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'past':
        return <Badge variant="secondary">Past</Badge>;
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (showCreateTournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowCreateTournament(false)}
          >
            ← Back to Dashboard
          </Button>
        </div>
        <TournamentWizard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {isAdmin ? "Admin Dashboard" : "Tournament Dashboard"}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground truncate">
                Welcome back, {user?.firstName || user?.email}
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Button
                onClick={() => setShowCreateTournament(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base"
                size="sm"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">New Tournament</span>
                <span className="sm:hidden">New</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => signOut({ redirectUrl: "/" })}
                size="sm"
                className="text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </Button>
              <UserButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Developer Testing Panel */}


        {isAdmin && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <Crown className="h-4 w-4" />
            <AlertDescription>
              <strong>Admin Mode:</strong> You have full access to all tournaments and can manage users. 
              You can view and modify any tournament in the system.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold">{tournaments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold">
                {tournaments.filter(t => getTournamentStatus(t) === 'active').length}
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold capitalize">{user?.role}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tournaments List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isAdmin ? "All Tournaments" : "Your Tournaments"}
            </CardTitle>
            <CardDescription>
              {isAdmin 
                ? "Manage all tournaments in the system" 
                : "Tournaments you have created and organized"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading tournaments...</span>
              </div>
            ) : sortedTournaments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No tournaments found</p>
                <Button onClick={() => setShowCreateTournament(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Tournament
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedTournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground truncate flex-shrink-0">{tournament.name}</h3>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {tournament.playersCount} Players
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {tournament.courtsCount} Courts
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {tournament.pointsPerMatch} Points
                          </Badge>
                          {getStatusBadge(getTournamentStatus(tournament))}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          📅 {tournament.date ? new Date(tournament.date).toLocaleDateString() : 'No date set'}
                        </span>
                        <span className="flex items-center truncate">
                          📍 {tournament.location || 'No location set'}
                        </span>
                        {tournament.shareId && (
                          <span className="flex items-center">
                            <Share className="w-3 h-3 mr-1" />
                            Shareable
                          </span>
                        )}
                        {tournament.status === 'completed' && tournament.leaderboardId && (
                          <span className="flex items-center">
                            <Trophy className="w-3 h-3 mr-1" />
                            Final Results
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setEditingTournament(tournament)}
                        className="w-full sm:w-auto"
                        aria-label="Edit tournament"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Tournament Modal */}
        <EditTournamentModal
          tournament={currentEditingTournament}
          isOpen={!!editingTournament}
          onClose={() => setEditingTournament(null)}
        />

        </div>
      </div>
      
      <Footer />
    </div>
  );
}