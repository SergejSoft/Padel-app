import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { TournamentSetup } from "@shared/schema";

interface TournamentCreationSummaryProps {
  tournamentSetup: TournamentSetup;
  onBack: () => void;
}

export function TournamentCreationSummary({ tournamentSetup, onBack }: TournamentCreationSummaryProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [createdTournamentId, setCreatedTournamentId] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create tournament with empty players array for self-registration
      const tournamentData = {
        name: tournamentSetup.name,
        date: tournamentSetup.date,
        time: tournamentSetup.time,
        location: tournamentSetup.location,
        playersCount: tournamentSetup.playersCount,
        courtsCount: tournamentSetup.courtsCount,
        pointsPerMatch: tournamentSetup.pointsPerMatch,
        gameDurationMinutes: tournamentSetup.gameDurationMinutes,
        players: [], // Empty players array for self-registration
        tournamentMode: 'registration', // Set to registration mode
      };

      const response = await apiRequest("POST", "/api/tournaments", tournamentData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tournament');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      setCreatedTournamentId(data.id);
      
      // Generate registration link
      try {
        const regResponse = await apiRequest("POST", `/api/tournaments/${data.id}/registration`, {
          maxParticipants: tournamentSetup.playersCount
        });
        
        if (regResponse.ok) {
          const regData = await regResponse.json();
          const registrationId = regData.registrationId || regData.tournament?.registrationId;
          if (registrationId) {
            setShareUrl(`${window.location.origin}/register/${registrationId}`);
          }
          
          toast({
            title: "Tournament Created!",
            description: "Your tournament has been created and is ready for registration.",
          });
        }
      } catch (error) {
        console.error('Failed to generate registration link:', error);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Registration link has been copied to clipboard.",
      });
    }
  };

  const handleViewDashboard = () => {
    setLocation("/dashboard");
  };

  if (createdTournamentId && shareUrl) {
    return (
      <CardContent className="py-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-foreground mb-2">Tournament Created!</h2>
            <p className="text-muted-foreground">
              Your tournament is ready for participant registration
            </p>
          </div>

          <div className="bg-muted border border-border rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-4">Registration Link</h3>
            <div className="flex items-center gap-2 bg-background p-3 rounded-md">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent border-none outline-none text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Share this link with participants to allow them to register
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleViewDashboard}
              className="w-full"
            >
              Go to Dashboard
            </Button>
            <p className="text-sm text-muted-foreground">
              You can manage registrations and generate the schedule from your dashboard
            </p>
          </div>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Create Tournament</h2>
        <p className="text-muted-foreground">Review your tournament details and create it</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-muted border border-border rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Tournament Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{tournamentSetup.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{new Date(tournamentSetup.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">{tournamentSetup.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium">{tournamentSetup.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Players:</span>
              <span className="font-medium">{tournamentSetup.playersCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Courts:</span>
              <span className="font-medium">{tournamentSetup.courtsCount}</span>
            </div>
          </div>
        </div>

        <Alert className="mb-6">
          <AlertDescription>
            After creation, you'll receive a registration link to share with participants. 
            The tournament schedule will be generated once enough players have registered.
          </AlertDescription>
        </Alert>

        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1"
            disabled={createMutation.isPending}
          >
            Back to Setup
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Tournament"
            )}
          </Button>
        </div>
      </div>
    </CardContent>
  );
}