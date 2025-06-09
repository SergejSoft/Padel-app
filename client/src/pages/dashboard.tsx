import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Settings, Users, Calendar, Trash2, Edit, Crown, Shield, Ban, Play, Share } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { TournamentWizard } from "@/components/tournament-wizard";
import { EditTournamentModal } from "@/components/edit-tournament-modal";
import { TournamentViewModal } from "@/components/tournament-view-modal";
import { Footer } from "@/components/footer";
import { apiRequest } from "@/lib/queryClient";
import type { Tournament } from "@shared/schema";

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [viewingTournament, setViewingTournament] = useState<Tournament | null>(null);

  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
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

  const deleteMutation = useMutation({
    mutationFn: async (tournamentId: number) => {
      await apiRequest("DELETE", `/api/tournaments/${tournamentId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Tournament deleted",
        description: "Tournament has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error deleting tournament",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/tournaments/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Tournament status updated",
        description: "Tournament status has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating status",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const makeAdminMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/dev/make-admin", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Role updated",
        description: `You are now an admin (${data.user.role}). Page will refresh to show admin features.`,
      });
      // Refresh page to update UI
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (error: any) => {
      console.error("Admin promotion error:", error);
      toast({
        title: "Error updating role",
        description: error.message || "Please sign in again and try again.",
        variant: "destructive",
      });
      // If unauthorized, redirect to login
      if (error.message?.includes("Unauthorized")) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 2000);
      }
    },
  });

  const handleDeleteTournament = (tournamentId: number, tournamentName: string) => {
    if (confirm(`Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(tournamentId);
    }
  };

  const handleCancelTournament = (tournamentId: number) => {
    updateStatusMutation.mutate({ id: tournamentId, status: 'cancelled' });
  };

  const handleActivateTournament = (tournamentId: number) => {
    updateStatusMutation.mutate({ id: tournamentId, status: 'active' });
  };

  const getTournamentStatus = (tournament: Tournament) => {
    if (tournament.status === 'cancelled') return 'cancelled';
    if (tournament.date && new Date(tournament.date) < new Date()) return 'past';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'past':
        return <Badge variant="secondary">Past</Badge>;
      case 'active':
        return <Badge variant="default">Active</Badge>;
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isAdmin ? "Admin Dashboard" : "Tournament Dashboard"}
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.firstName || user?.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowCreateTournament(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Tournament
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/api/logout"}
              >
                Sign Out
              </Button>
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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tournaments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tournaments.filter(t => new Date(t.date || '') >= new Date()).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{user?.role}</div>
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
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                        <Badge variant="outline">
                          {tournament.playersCount} Players
                        </Badge>
                        <Badge variant="outline">
                          {tournament.courtsCount} Courts
                        </Badge>
                        {getStatusBadge(getTournamentStatus(tournament))}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <span>📅 {tournament.date ? new Date(tournament.date).toLocaleDateString() : 'No date set'}</span>
                        <span>📍 {tournament.location || 'No location set'}</span>
                        {tournament.shareId && (
                          <span className="flex items-center">
                            <Share className="w-3 h-3 mr-1" />
                            Shareable
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingTournament(tournament)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTournament(tournament)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {getTournamentStatus(tournament) === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelTournament(tournament.id)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                      {getTournamentStatus(tournament) === 'cancelled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivateTournament(tournament.id)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTournament(tournament.id, tournament.name)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
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
          tournament={editingTournament}
          isOpen={!!editingTournament}
          onClose={() => setEditingTournament(null)}
        />

        {/* Tournament View Modal */}
        <TournamentViewModal
          tournament={viewingTournament}
          isOpen={!!viewingTournament}
          onClose={() => setViewingTournament(null)}
        />
        </div>
      </div>
      
      <Footer />
    </div>
  );
}