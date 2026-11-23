import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tournament } from "@shared/schema";

/** Marks a tournament completed; the server computes the final results. */
export function useCompleteTournament(onCompleted?: (tournament: Tournament) => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tournamentId: number): Promise<Tournament> => {
      const response = await apiRequest("POST", `/api/tournaments/${tournamentId}/complete`);
      return response.json();
    },
    onSuccess: (tournament) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shared"] });
      toast({
        title: "Tournament completed",
        description: "Final results are saved and the leaderboard link is ready.",
      });
      onCompleted?.(tournament);
    },
    onError: (error: Error) => {
      toast({ title: "Could not complete tournament", description: error.message, variant: "destructive" });
    },
  });
}
