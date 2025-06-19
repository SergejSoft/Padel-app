import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tournament } from "@shared/schema";
import { RegistrationSuccessAnimation } from "@/components/registration-success-animation";

export default function DevTest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mockUser, setMockUser] = useState<any>(null);
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    isLoading: boolean;
    user: any;
  }>({
    isAuthenticated: false,
    isLoading: false,
    user: null,
  });
  
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successAnimationData, setSuccessAnimationData] = useState<{
    tournamentName: string;
    playerCount: number;
    totalPlayers: number;
  } | null>(null);

  // Mock login mutation
  const mockLogin = useMutation({
    mutationFn: async (userType: string) => {
      const response = await fetch("/api/dev/login", {
        method: "POST",
        body: JSON.stringify({ userType }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Update local auth state immediately
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: data.user,
      });
      setMockUser(data.user);
      
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Mock Login Successful",
        description: `Logged in as ${data.user.role}`,
      });
      
      // Invalidate queries after successful login
      queryClient.invalidateQueries({ queryKey: ["/api/user/tournaments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get open tournaments (no auth required)
  const { data: openTournaments = [], isLoading: isLoadingTournaments } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments/open"],
    retry: false,
  });

  // Join tournament mutation
  const joinTournament = useMutation({
    mutationFn: async (tournamentId: number) => {
      const response = await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return { tournamentId, result: await response.json() };
    },
    onSuccess: (data) => {
      const tournament = openTournaments.find(t => t.id === data.tournamentId);
      if (tournament) {
        setSuccessAnimationData({
          tournamentName: tournament.name,
          playerCount: ((tournament as any).participantCount || 0) + 1,
          totalPlayers: tournament.playersCount,
        });
        setShowSuccessAnimation(true);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments/open"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Join",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get user tournaments (only when authenticated)
  const { data: userTournaments = [], isLoading: isLoadingUserTournaments } = useQuery<Tournament[]>({
    queryKey: ["/api/user/tournaments"],
    enabled: authState.isAuthenticated,
    retry: false,
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Development Test Page</h1>
      
      {/* Authentication Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Mock Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          {authState.isAuthenticated ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-medium text-green-800">
                  Logged in as: {authState.user?.firstName} {authState.user?.lastName} ({authState.user?.role})
                </p>
                <p className="text-sm text-green-600">Email: {authState.user?.email}</p>
              </div>
              <Button 
                onClick={() => {
                  setAuthState({ isAuthenticated: false, isLoading: false, user: null });
                  setMockUser(null);
                }}
                variant="outline"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground mb-4">
                Choose a user type to test the registration system:
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => mockLogin.mutate("player")}
                  disabled={mockLogin.isPending}
                  variant="outline"
                >
                  Login as Player
                </Button>
                <Button
                  onClick={() => mockLogin.mutate("organizer")}
                  disabled={mockLogin.isPending}
                  variant="outline"
                >
                  Login as Organizer
                </Button>
                <Button
                  onClick={() => mockLogin.mutate("admin")}
                  disabled={mockLogin.isPending}
                  variant="outline"
                >
                  Login as Admin
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Tournaments Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Available Tournaments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {openTournaments.map((tournament) => (
              <Card key={tournament.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{tournament.name}</h3>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Open
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {tournament.date ? new Date(tournament.date).toLocaleDateString() : 'Date TBD'} • {tournament.location}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      Players: {(tournament as any).participantCount || 0}/{tournament.playersCount}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => joinTournament.mutate(tournament.id)}
                      disabled={!authState.isAuthenticated || joinTournament.isPending}
                    >
                      {joinTournament.isPending ? "Joining..." : "Join Tournament"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Tournaments Section */}
      {authState.isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle>My Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            {userTournaments.length > 0 ? (
              <div className="grid gap-4">
                {userTournaments.map((tournament) => (
                  <Card key={tournament.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{tournament.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {tournament.date ? new Date(tournament.date).toLocaleDateString() : 'Date TBD'} • {tournament.location}
                          </p>
                        </div>
                        <Badge variant="secondary">Registered</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No tournaments joined yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Registration Success Animation */}
      {successAnimationData && (
        <RegistrationSuccessAnimation
          isVisible={showSuccessAnimation}
          tournamentName={successAnimationData.tournamentName}
          playerCount={successAnimationData.playerCount}
          totalPlayers={successAnimationData.totalPlayers}
          onComplete={() => {
            setShowSuccessAnimation(false);
            setSuccessAnimationData(null);
          }}
        />
      )}
    </div>
  );
}