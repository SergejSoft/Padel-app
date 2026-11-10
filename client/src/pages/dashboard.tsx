import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calendar, CheckCircle2, Crown, Loader2, Plus, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { UserButton, useClerk } from "@/lib/auth";
import { TournamentWizard } from "@/components/tournament-wizard";
import { EditTournamentModal } from "@/components/edit-tournament-modal";
import { JoinedTournamentCard } from "@/components/joined-tournament-card";
import { NextUpCard, OrganizerTournamentRow } from "@/components/organizer-tournament-card";
import { TournamentSection } from "@/components/tournament-section";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";
import { groupTournaments } from "@shared/tournament-lifecycle";
import type { JoinedTournamentSummary, Tournament } from "@shared/schema";

function matchesSearch(tournament: { name: string; location: string | null }, query: string): boolean {
  if (!query) return true;
  return tournament.name.toLowerCase().includes(query)
    || (tournament.location ?? "").toLowerCase().includes(query);
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface StatCardProps {
  label: string;
  count: number;
  icon: typeof Calendar;
  targetId: string;
  highlight?: boolean;
}

function StatCard({ label, count, icon: Icon, targetId, highlight }: StatCardProps) {
  return (
    <button
      type="button"
      disabled={count === 0}
      onClick={() => scrollToSection(targetId)}
      className={cn(
        "rounded-lg border bg-card p-3 sm:p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "enabled:hover:border-primary/40 enabled:hover:bg-accent disabled:cursor-default",
        highlight && count > 0 && "border-amber-300 bg-amber-50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4 text-muted-foreground", highlight && count > 0 && "text-amber-700")} aria-hidden="true" />
      </div>
      <div className="mt-1 text-xl lg:text-2xl font-bold">{count}</div>
    </button>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { signOut } = useClerk();
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [search, setSearch] = useState("");

  const { data: tournaments = [], isLoading, error } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
    retry: false,
  });
  const { data: joinedTournaments = [] } = useQuery<JoinedTournamentSummary[]>({
    queryKey: ["/api/my/registrations"],
    retry: false,
  });

  const currentEditingTournament = editingTournament
    ? tournaments.find(tournament => tournament.id === editingTournament.id) ?? editingTournament
    : null;

  const query = search.trim().toLowerCase();
  const totals = groupTournaments(tournaments);
  const groups = groupTournaments(tournaments.filter((tournament) => matchesSearch(tournament, query)));
  const [nextUp, ...laterUpcoming] = groups.upcoming;

  const managedIds = new Set(tournaments.map((tournament) => tournament.id));
  const playingGroups = groupTournaments(
    joinedTournaments.filter((tournament) => !managedIds.has(tournament.id) && matchesSearch(tournament, query)),
  );
  const playing = [
    ...playingGroups.upcoming,
    ...playingGroups.needsResults,
    ...playingGroups.finished,
    ...playingGroups.archived,
  ];

  const hasMatches = groups.upcoming.length > 0
    || groups.needsResults.length > 0
    || groups.finished.length > 0
    || groups.archived.length > 0
    || playing.length > 0;

  const renderRow = (tournament: Tournament) => (
    <OrganizerTournamentRow
      tournament={tournament}
      currentUserId={user?.id}
      onManage={setEditingTournament}
    />
  );

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {isAdmin ? "Admin Dashboard" : "Tournament Dashboard"}
                </h1>
                {user?.role && (
                  <Badge variant="outline" className="capitalize flex-shrink-0">{user.role}</Badge>
                )}
              </div>
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
        {isAdmin && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <Crown className="h-4 w-4" />
            <AlertDescription>
              <strong>Admin Mode:</strong> You have full access to all tournaments and can manage users. 
              You can view and modify any tournament in the system.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading tournaments...</span>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              We could not load your tournaments. Please refresh and try again.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {tournaments.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No tournaments found</p>
                  <Button onClick={() => setShowCreateTournament(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Tournament
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 lg:gap-6">
                  <StatCard label="Upcoming" count={totals.upcoming.length} icon={Calendar} targetId="next-up" />
                  <StatCard
                    label="Needs results"
                    count={totals.needsResults.length}
                    icon={AlertTriangle}
                    targetId="needs-results"
                    highlight
                  />
                  <StatCard label="Completed" count={totals.finished.length} icon={CheckCircle2} targetId="completed" />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{isAdmin ? "All tournaments" : "Your tournaments"}</h2>
                    <p className="text-sm text-muted-foreground">
                      {isAdmin ? "Every tournament in the system" : "Tournaments you have created and organized"}
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name or location"
                      aria-label="Search tournaments"
                      className="pl-9"
                    />
                  </div>
                </div>
              </>
            )}

            {query && !hasMatches && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">No tournaments match "{search.trim()}"</p>
                  <Button variant="outline" onClick={() => setSearch("")}>Clear search</Button>
                </CardContent>
              </Card>
            )}

            {nextUp && (
              <section id="next-up" aria-labelledby="next-up-title" className="scroll-mt-6">
                <h2 id="next-up-title" className="mb-3 text-lg font-semibold">Next up</h2>
                <NextUpCard tournament={nextUp} currentUserId={user?.id} onManage={setEditingTournament} />
              </section>
            )}

            <TournamentSection
              id="upcoming"
              title="Upcoming"
              description="Scheduled tournaments, soonest first"
              items={laterUpcoming}
              getKey={(tournament) => tournament.id}
              renderItem={renderRow}
            />

            <TournamentSection
              id="needs-results"
              title="Needs results"
              description="The date has passed but no final results were saved. Enter scores, or archive it if it didn't happen."
              items={groups.needsResults}
              getKey={(tournament) => tournament.id}
              renderItem={renderRow}
            />

            <TournamentSection
              id="playing"
              title="Playing in"
              description="Tournaments you joined as a player"
              items={playing}
              getKey={(tournament) => tournament.id}
              renderItem={(tournament) => <JoinedTournamentCard tournament={tournament} />}
              initialLimit={4}
              expandAll={!!query}
              listClassName="grid gap-4 space-y-0 lg:grid-cols-2"
            />

            <TournamentSection
              id="completed"
              title="Completed"
              description="Finished and cancelled tournaments, newest first"
              items={groups.finished}
              getKey={(tournament) => tournament.id}
              renderItem={renderRow}
              initialLimit={5}
              expandAll={!!query}
            />

            <TournamentSection
              id="archived"
              title="Archived"
              description="Stored with all scores. Open one to restore it."
              items={groups.archived}
              getKey={(tournament) => tournament.id}
              renderItem={renderRow}
              collapsible
              expandAll={!!query}
            />
          </div>
        )}

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
