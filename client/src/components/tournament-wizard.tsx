import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { TournamentSetup } from "./tournament-setup";
import { PlayerEntry } from "./player-entry";
import { ScheduleDisplay } from "./schedule-display";
import type { TournamentSetup as TournamentSetupType } from "@shared/schema";

interface WizardState {
  step: number;
  tournamentSetup: TournamentSetupType | null;
  players: string[];
}

const STORAGE_KEY = 'tournament_wizard_state';

export function TournamentWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [tournamentSetup, setTournamentSetup] = useState<TournamentSetupType | null>(null);
  const [players, setPlayers] = useState<string[]>([]);

  const steps = [
    { number: 1, label: "Setup" },
    { number: 2, label: "Players" },
    { number: 3, label: "Schedule" },
  ];

  // Load saved state on component mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState: WizardState = JSON.parse(savedState);
        setCurrentStep(parsedState.step);
        setTournamentSetup(parsedState.tournamentSetup);
        setPlayers(parsedState.players);
      } catch (error) {
        console.warn('Failed to parse saved wizard state:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    const state: WizardState = {
      step: currentStep,
      tournamentSetup,
      players
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [currentStep, tournamentSetup, players]);

  const handleSetupComplete = (setup: TournamentSetupType) => {
    setTournamentSetup(setup);
    setCurrentStep(2);
  };

  const handlePlayersComplete = (playerList: string[]) => {
    setPlayers(playerList);
    setCurrentStep(3);
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setTournamentSetup(null);
    setPlayers([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
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
            initialData={tournamentSetup || undefined}
          />
        )}

        {currentStep === 2 && tournamentSetup && (
          <PlayerEntry
            playersCount={tournamentSetup.playersCount}
            onComplete={handlePlayersComplete}
            onBack={handleBack}
            initialPlayers={players.length > 0 ? players : undefined}
          />
        )}

        {currentStep === 3 && tournamentSetup && players.length > 0 && (
          <ScheduleDisplay
            tournamentSetup={tournamentSetup}
            players={players}
            onBack={handleBack}
            onReset={resetWizard}
          />
        )}
      </Card>
    </div>
  );
}
