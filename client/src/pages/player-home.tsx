import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserButton, useClerk } from "@clerk/react";
import { Link } from "wouter";
import {
  Calendar,
  ExternalLink,
  Loader2,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { JoinedTournamentSummary, User } from "@shared/schema";

type TournamentGroup = {
  title: string;
  description: string;
  tournaments: JoinedTournamentSummary[];
};

function getGroups(tournaments: JoinedTournamentSummary[]): TournamentGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming: JoinedTournamentSummary[] = [];
  const active: JoinedTournamentSummary[] = [];
  const completed: JoinedTournamentSummary[] = [];

  for (const tournament of tournaments) {
    if (
      tournament.status === "completed"
      || tournament.status === "cancelled"
      || tournament.status === "archived"
    ) {
      completed.push(tournament);
    } else if (tournament.date && new Date(tournament.date) >= today) {
      upcoming.push(tournament);
    } else {
      active.push(tournament);
    }
  }

  return [
    {
      title: "Upcoming",
      description: "Tournaments that are scheduled for the future",
      tournaments: upcoming,
    },
    {
      title: "Active and past",
      description: "Current tournaments and events awaiting completion",
      tournaments: active,
    },
    {
      title: "History",
      description: "Your tournament history",
      tournaments: completed,
    },
  ].filter((group) => group.tournaments.length > 0);
}

function TournamentCard({ tournament }: { tournament: JoinedTournamentSummary }) {
  const publicIdentifier = tournament.urlSlug || tournament.shareId;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">{tournament.name}</CardTitle>
            <CardDescription className="mt-1">
              {tournament.date || "Date to be confirmed"}
              {tournament.time ? ` at ${tournament.time}` : ""}
            </CardDescription>
          </div>
          <Badge variant={tournament.status === "cancelled" ? "destructive" : "secondary"}>
            {tournament.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {tournament.location && (
          <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {tournament.location}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {publicIdentifier && (
            <Button asChild size="sm">
              <Link href={`/shared/${publicIdentifier}`}>
                View tournament
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
          {publicIdentifier && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/shared/${publicIdentifier}/scores`}>Live scores</Link>
            </Button>
          )}
          {tournament.leaderboardId && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/leaderboard/${tournament.leaderboardId}`}>
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlayerHome() {
  const { user } = useAuth();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [playtomicRating, setPlaytomicRating] = useState("");
  const { data: tournaments = [], isLoading, error } = useQuery<JoinedTournamentSummary[]>({
    queryKey: ["/api/my/registrations"],
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/become-organizer", {});
      return response.json() as Promise<{ user: User }>;
    },
    onSuccess: ({ user: updatedUser }) => {
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Organizer access enabled",
        description: "You can now create and manage tournaments.",
      });
    },
    onError: (upgradeError: Error) => {
      toast({
        title: "Could not enable organizer access",
        description: upgradeError.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    setPlaytomicRating(user?.playtomicRating == null ? "" : String(user.playtomicRating));
  }, [user?.playtomicRating]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", "/api/auth/profile", {
        playtomicRating: playtomicRating === "" ? null : Number(playtomicRating),
      });
      return response.json() as Promise<User>;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      toast({ title: "Profile updated", description: "Your Playtomic rating has been saved." });
    },
    onError: (profileError: Error) => {
      toast({
        title: "Could not update profile",
        description: profileError.message,
        variant: "destructive",
      });
    },
  });

  const groups = getGroups(tournaments);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Padel</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName || user?.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => signOut({ redirectUrl: "/" })}>
              Sign Out
            </Button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 space-y-8 px-4 py-8">
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">My tournaments</h2>
              <p className="text-sm text-muted-foreground">
                Events you joined with this account or email address
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Loading your tournaments...
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-8 text-center text-destructive">
                We could not load your tournaments. Please refresh and try again.
              </CardContent>
            </Card>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="font-semibold">No joined tournaments yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Open a registration link shared by an organizer and join while signed in.
                  The tournament will then appear here automatically.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {groups.map((group) => (
                <section key={group.title}>
                  <h3 className="font-semibold">{group.title}</h3>
                  <p className="mb-3 text-sm text-muted-foreground">{group.description}</p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {group.tournaments.map((tournament) => (
                      <TournamentCard key={tournament.id} tournament={tournament} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Player profile</CardTitle>
            <CardDescription>
              Your rating is prefilled when you join a tournament. You can still change it for each event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full space-y-2 sm:max-w-xs">
                <label htmlFor="profile-playtomic-rating" className="text-sm font-medium">
                  Playtomic rating (optional)
                </label>
                <Input
                  id="profile-playtomic-rating"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="7"
                  step="0.01"
                  value={playtomicRating}
                  onChange={(event) => setPlaytomicRating(event.target.value)}
                  placeholder="For example, 3.25"
                />
              </div>
              <Button
                onClick={() => profileMutation.mutate()}
                disabled={
                  profileMutation.isPending
                  || (playtomicRating !== "" && (Number(playtomicRating) < 0 || Number(playtomicRating) > 7))
                }
                className="w-full sm:w-auto"
              >
                {profileMutation.isPending ? "Saving..." : "Save rating"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Want to organize an event?
            </CardTitle>
            <CardDescription>
              Enable organizer access to create, publish, share, and score your own tournaments.
              This change is immediate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>Become an organiser</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enable organizer access?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your player profile and joined tournaments will remain linked to your account.
                    You will also gain access to the tournament organizer dashboard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Not now</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={upgradeMutation.isPending}
                    onClick={() => upgradeMutation.mutate()}
                  >
                    {upgradeMutation.isPending ? "Enabling..." : "Become an organiser"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
