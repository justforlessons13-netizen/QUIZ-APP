import { motion } from 'framer-motion';
import { Check, X, ClipboardCheck, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Emoji3D } from '@/components/ui/Emoji3D';
import type { LiveTeam, TeamAnswer } from '@/types/live-game';
import { Question } from '@/types/game';

interface HostGradingProps {
  teams: LiveTeam[];
  answers: TeamAnswer[];
  question: Question;
  round: number;
  questionInRound?: number;
  totalInRound?: number;
  onSetCorrectness: (teamId: string, isCorrect: boolean) => void;
  onFinalize: () => void;
}

export function HostGrading({
  teams, answers, question, round, questionInRound = 1, totalInRound = 1, onSetCorrectness, onFinalize,
}: HostGradingProps) {
  const allGraded = answers.every(a => a.isCorrect !== null);
  const isLastInRound = questionInRound === totalInRound;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto px-4"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">
          Grading Q{questionInRound} of {totalInRound}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Correct answer: <span className="text-primary font-bold">{question.answer}</span>
        </p>
      </div>

      <div className="w-full space-y-3">
        {teams.map(team => {
          const answer = answers.find(a => a.teamId === team.id);
          if (!answer) return null;

          return (
            <motion.div
              key={team.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
            >
              {/* UPDATED: Using the 3D Emoji Component */}
              <Emoji3D emoji={team.emoji} className="w-6 h-6" />

              <div className="flex-1 min-w-0">
                {/* Wrapper div keeps the name and badge horizontally aligned */}
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{team.name}</p>

                  {/* Anti-cheat badge appears only if flagged */}
                  {answer.hasCheated && (
                    <span className="bg-red-600 text-white font-bungee text-[8px] px-1.5 py-0.5 rounded animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]">
                      CHEAT DETECTED
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">"{answer.answer}"</p>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => onSetCorrectness(team.id, true)}
                  className={`p-2 rounded-lg transition-all ${answer.isCorrect === true
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-success/20 hover:text-success'
                    }`}
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onSetCorrectness(team.id, false)}
                  className={`p-2 rounded-lg transition-all ${answer.isCorrect === false
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-destructive/20 hover:text-destructive'
                    }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Button
        onClick={onFinalize}
        disabled={!allGraded}
        className="w-full py-3 h-auto text-base font-bold rounded-xl"
      >
        {isLastInRound ? (
          <>
            <ChevronRight className="w-5 h-5 mr-2" />
            Reveal Results
          </>
        ) : (
          <>
            Next Question
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    </motion.div>
  );
}