import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Trophy, Users, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RegistrationSuccessAnimationProps {
  isVisible: boolean;
  tournamentName: string;
  playerCount: number;
  totalPlayers: number;
  onComplete: () => void;
}

export function RegistrationSuccessAnimation({
  isVisible,
  tournamentName,
  playerCount,
  totalPlayers,
  onComplete,
}: RegistrationSuccessAnimationProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const timers = [
      setTimeout(() => setStage(1), 200),
      setTimeout(() => setStage(2), 800),
      setTimeout(() => setStage(3), 1400),
      setTimeout(() => {
        setStage(0);
        onComplete();
      }, 3000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <Card className="w-96 mx-4">
          <CardContent className="p-8 text-center relative overflow-hidden">
            {/* Background sparkles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={
                    stage >= 2
                      ? {
                          scale: [0, 1.5, 0],
                          opacity: [0, 1, 0],
                        }
                      : {}
                  }
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    repeat: 1,
                  }}
                />
              ))}
            </div>

            {/* Main success icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={stage >= 1 ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: "spring", duration: 0.6 }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <CheckCircle className="w-16 h-16 text-green-500" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={stage >= 1 ? { scale: [0, 1.2, 1] } : {}}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="absolute -inset-2 border-2 border-green-500 rounded-full"
                />
              </div>
            </motion.div>

            {/* Success message */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={stage >= 1 ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Registration Successful!
              </h2>
              <p className="text-gray-600">
                You've joined{" "}
                <span className="font-semibold">{tournamentName}</span>
              </p>
            </motion.div>

            {/* Tournament stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={stage >= 2 ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-2 gap-4 mb-6"
            >
              <div className="flex items-center justify-center space-x-2 p-3 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
                <div className="text-center">
                  <div className="font-bold text-blue-600">
                    {playerCount}/{totalPlayers}
                  </div>
                  <div className="text-xs text-blue-500">Players</div>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 p-3 bg-yellow-50 rounded-lg">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <div className="text-center">
                  <div className="font-bold text-yellow-600">Ready</div>
                  <div className="text-xs text-yellow-500">To Play</div>
                </div>
              </div>
            </motion.div>

            {/* Celebration effect */}
            <motion.div
              initial={{ scale: 0 }}
              animate={stage >= 3 ? { scale: 1 } : {}}
              transition={{ type: "spring", duration: 0.5 }}
              className="flex justify-center items-center space-x-2 text-purple-600"
            >
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">Get ready for an amazing tournament!</span>
              <Sparkles className="w-5 h-5" />
            </motion.div>

            {/* Progress indicator */}
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-green-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3 }}
            />
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}