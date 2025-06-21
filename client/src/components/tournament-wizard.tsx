import { useState } from "react";
import { Card } from "@/components/ui/card";
import { TournamentSetup } from "./tournament-setup";
import { PlayerEntry } from "./player-entry";
import { ScheduleDisplay } from "./schedule-display";
import type { TournamentSetup as TournamentSetupType } from "@shared/schema";

export function TournamentWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [tournamentSetup, setTournamentSetup] = useState<TournamentSetupType | null>(null);
  const [players, setPlayers] = useState<string[]>([]);

  const steps = [
    { number: 1, label: "Setup" },
    { number: 2, label: "Players" },
    { number: 3, label: "Schedule" },
  ];

  const handleSetupComplete = (setup: TournamentSetupType) => {
    setTournamentSetup(setup);
    if (setup.registrationOpen) {
      // Open Registration Flow: Skip player entry and go directly to schedule with empty players
      setPlayers([]);
      setCurrentStep(3);
    } else {
      // Simple Flow: Continue to player entry
      setCurrentStep(2);
    }
  };

  const handlePlayersComplete = (playerList: string[]) => {
    setPlayers(playerList);
    setCurrentStep(3);
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setTournamentSetup(null);
    setPlayers([]);
  };

  return (
    <div className="bg-background">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step.number <= currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`ml-2 text-sm font-medium transition-all ${
                    step.number <= currentStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-12 h-px bg-border ml-4"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="border-border">
        {currentStep === 1 && (
          <TournamentSetup
            onComplete={handleSetupComplete}
            onBack={() => {}}
          />
        )}

        {currentStep === 2 && tournamentSetup && (
          <PlayerEntry
            playersCount={tournamentSetup.playersCount}
            onComplete={handlePlayersComplete}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && tournamentSetup && (
          <ScheduleDisplay
            tournamentSetup={tournamentSetup}
            players={players}
            onBack={() => setCurrentStep(2)}
            onReset={resetWizard}
          />
        )}
      </Card>
    </div>
  );
}
