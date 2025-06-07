import { TournamentWizard } from "@/components/tournament-wizard";

export default function Tournament() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">P</span>
              </div>
              <h1 className="text-xl font-semibold text-foreground">Padel Tournament</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                Tournaments
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                Schedule
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                Help
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TournamentWizard />
      </main>
    </div>
  );
}
