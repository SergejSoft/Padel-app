import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Settings, Users, Calendar, Trash2, Edit, Crown, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { TournamentWizard } from "@/components/tournament-wizard";
import { EditTournamentModal } from "@/components/edit-tournament-modal";
import { apiRequest } from "@/lib/queryClient";
import type { Tournament } from "@shared/schema";

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
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

  const makeAdminMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/dev/make-admin", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Role updated",
        description: "You are now an admin. Refresh the page to see admin features.",
      });
      // Refresh page to update UI
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: () => {
      toast({
        title: "Error updating role",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTournament = (tournamentId: number, tournamentName: string) => {
    if (confirm(`Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(tournamentId);
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
    <div className="min-h-screen bg-background">
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
      <div className="container mx-auto px-4 py-8">
        {/* Developer Testing Panel */}
        {!isAdmin && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                <strong>Testing Mode:</strong> You are currently an <Badge variant="outline">Organizer</Badge>. 
                Click to become an admin and test admin features.
              </span>
              <Button
                size="sm"
                onClick={() => makeAdminMutation.mutate()}
                disabled={makeAdminMutation.isPending}
                className="ml-4"
              >
                {makeAdminMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    Become Admin
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
            ) : tournaments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No tournaments found</p>
                <Button onClick={() => setShowCreateTournament(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Tournament
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {tournaments.map((tournament) => (
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
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <span>📅 {tournament.date ? new Date(tournament.date).toLocaleDateString() : 'No date set'}</span>
                        <span>📍 {tournament.location || 'No location set'}</span>
                        {tournament.shareId && (
                          <Badge variant="secondary">Shared</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/shared/${tournament.shareId}`, '_blank')}
                        disabled={!tournament.shareId}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Implement edit functionality
                          toast({
                            title: "Edit functionality",
                            description: "Edit functionality will be implemented next.",
                          });
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
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
      </div>
    </div>
  );
}