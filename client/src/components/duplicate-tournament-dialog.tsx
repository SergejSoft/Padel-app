import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CopyPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_CONFIG } from "@shared/tournament-config";
import { suggestDuplicateDate, suggestDuplicateName } from "@shared/tournament-duplicate";
import type { Tournament } from "@shared/schema";

interface DuplicateTournamentDialogProps {
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
  onDuplicated?: (tournament: Tournament) => void;
}

export function DuplicateTournamentDialog({ tournament, isOpen, onClose, onDuplicated }: DuplicateTournamentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(() => suggestDuplicateName(tournament.name));
  const [date, setDate] = useState(() => suggestDuplicateDate(tournament.date));

  useEffect(() => {
    if (isOpen) {
      setName(suggestDuplicateName(tournament.name));
      setDate(suggestDuplicateDate(tournament.date));
    }
  }, [isOpen, tournament.name, tournament.date]);

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tournaments/${tournament.id}/duplicate`, {
        name: name.trim(),
        date,
      });
      return response.json() as Promise<Tournament>;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Tournament duplicated",
        description: `${created.name} is ready with a fresh schedule. ${tournament.name} was not changed.`,
      });
      onClose();
      onDuplicated?.(created);
    },
    onError: (error: Error) => {
      toast({ title: "Could not duplicate tournament", description: error.message, variant: "destructive" });
    },
  });

  const isOpenRegistration = tournament.tournamentMode === "registration" && !tournament.schedule?.length;
  const playerCount = isOpenRegistration
    ? (tournament.registeredParticipants ?? []).filter(p => p.status !== "removed").length
    : tournament.players?.length ?? 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || duplicateMutation.isPending) return;
    duplicateMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md p-4 sm:p-6" data-testid="duplicate-tournament-dialog">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Duplicate tournament</DialogTitle>
            <DialogDescription>
              Creates a new tournament with the same settings and players as {tournament.name}.
              The new one starts without scores and gets a freshly generated schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="duplicate-name">New tournament name</Label>
            <Input
              id="duplicate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={TOURNAMENT_CONFIG.VALIDATION.MAX_TOURNAMENT_NAME_LENGTH}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duplicate-date">Date</Label>
            <Input
              id="duplicate-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <ul className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
            <li>
              {playerCount} {playerCount === 1 ? "player" : "players"} in the same order
              {isOpenRegistration ? " (registration stays open)" : ""}
            </li>
            <li>
              {tournament.courtsCount} {tournament.courtsCount === 1 ? "court" : "courts"} · {tournament.pointsPerMatch} points per match
            </li>
            {(tournament.time || tournament.location) && (
              <li>{[tournament.time, tournament.location].filter(Boolean).join(" · ")}</li>
            )}
          </ul>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !date || duplicateMutation.isPending}>
              {duplicateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CopyPlus className="mr-2 h-4 w-4" />
              )}
              Create copy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
