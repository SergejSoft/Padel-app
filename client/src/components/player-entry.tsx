import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Players } from "@shared/schema";

interface PlayerEntryProps {
  playersCount: number;
  onComplete: (players: string[]) => void;
  onBack: () => void;
}

export function PlayerEntry({ playersCount, onComplete, onBack }: PlayerEntryProps) {
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const form = useForm<Players>({
    defaultValues: {
      players: Array(playersCount).fill(""),
    },
    mode: "onChange",
  });

  const validatePlayers = (players: string[]) => {
    const filledPlayers = players.filter(name => name.trim().length > 0);
    const uniqueNames = new Set(filledPlayers.map(name => name.trim().toLowerCase()));
    
    if (filledPlayers.length < playersCount) {
      setDuplicateError(`Please enter all ${playersCount} player names`);
      return false;
    }

    if (uniqueNames.size !== filledPlayers.length) {
      setDuplicateError("All player names must be unique");
      return false;
    }

    setDuplicateError(null);
    return true;
  };

  const onSubmit = (data: Players) => {
    const trimmedPlayers = data.players.map(name => name.trim());
    if (validatePlayers(trimmedPlayers)) {
      onComplete(trimmedPlayers);
    }
  };

  const watchedPlayers = form.watch("players");
  const filledCount = watchedPlayers.filter(name => name.trim().length > 0).length;
  const isButtonDisabled = !!duplicateError || filledCount < playersCount;

  console.log('Debug:', { 
    watchedPlayers, 
    filledCount, 
    playersCount, 
    duplicateError, 
    isButtonDisabled 
  });

  useEffect(() => {
    if (watchedPlayers.some(player => player.length > 0)) {
      validatePlayers(watchedPlayers);
    } else {
      setDuplicateError(null);
    }
  }, [watchedPlayers, playersCount]);

  return (
    <CardContent className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Player Names</h2>
        <p className="text-muted-foreground">Enter the names of all tournament participants</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-muted border border-border rounded-lg p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: playersCount }, (_, index) => (
                  <FormField
                    key={index}
                    control={form.control}
                    name={`players.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Player {index + 1}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter player name"
                            {...field}
                            className="focus:ring-primary focus:border-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              {duplicateError && (
                <Alert variant="destructive">
                  <AlertDescription>{duplicateError}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex-1"
                >
                  Back to Setup
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isButtonDisabled}
                >
                  Generate Schedule
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </CardContent>
  );
}
