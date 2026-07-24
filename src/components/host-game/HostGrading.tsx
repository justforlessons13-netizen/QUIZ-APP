import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Emoji3D } from '@/components/ui/Emoji3D';
import type { LiveTeam, TeamAnswer } from '@/types/live-game';
import { Question } from '@/types/game';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

export interface RoundQuestionData {
  questionIndex: number;
  question: Question;
  answers: TeamAnswer[];
}

interface HostGradingProps {
  teams: LiveTeam[];
  questions: RoundQuestionData[];
  round: number;
  onSetCorrectness: (teamId: string, isCorrect: boolean, questionIndex: number) => void;
  onFinishRound: () => void;
}

export function HostGrading({ teams, questions, round, onSetCorrectness, onFinishRound }: HostGradingProps) {
  const [viewIndex, setViewIndex] = useState(0);
  const current = questions[viewIndex];
  const isLastPage = viewIndex === questions.length - 1;
  const allGraded = questions.every((q) => q.answers.every((a) => a.isCorrect !== null));

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto px-4"
    >
      {/* Header */}
      <div className="text-center">
        <div
          className="inline-block font-bungee text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full mb-2"
          style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.35)}`, color: theme.color1 }}
        >
          Grading — Round {round}
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Question {viewIndex + 1} of {questions.length}
        </p>
      </div>

      <div className="w-full space-y-2">
        <div className="text-base font-semibold text-center text-foreground">{current.question.text}</div>
        <div
          className="w-full rounded-xl px-4 py-3"
          style={{ background: alpha(theme.color1, 0.1), border: `1px solid ${alpha(theme.color1, 0.3)}` }}
        >
          <div className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: theme.color1 }}>
            Correct answer
          </div>
          <div className="text-sm font-semibold text-foreground">{current.question.answer}</div>
        </div>
      </div>

      <div className="w-full space-y-3">
        {teams.map((team) => {
          const answer = current.answers.find((a) => a.teamId === team.id);
          if (!answer) return null;

          return (
            <motion.div
              key={team.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
            >
              <Emoji3D emoji={team.emoji} className="w-6 h-6" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{team.name}</p>
                  {answer.hasCheated && (
                    <span className="bg-red-600 text-white font-bungee text-[8px] px-1.5 py-0.5 rounded animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]">
                      CHEAT DETECTED
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">"{answer.answer}"</p>
              </div>

              <button
                onClick={() => onSetCorrectness(team.id, !answer.isCorrect, current.questionIndex)}
                className={`w-[38px] h-[38px] flex-shrink-0 rounded-[10px] border flex items-center justify-center transition-all ${answer.isCorrect
                  ? 'bg-success/20 border-success text-success'
                  : 'bg-destructive/20 border-destructive text-destructive'
                  }`}
              >
                {answer.isCorrect ? <Check className="w-[18px] h-[18px]" /> : <X className="w-[18px] h-[18px]" />}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Stepper */}
      {questions.length > 1 && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewIndex((i) => Math.max(0, i - 1))}
            disabled={viewIndex === 0}
            className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center disabled:opacity-30 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setViewIndex(i)}
                className="w-2 h-2 rounded-full transition-transform"
                style={{
                  background: i === viewIndex ? theme.color1 : 'rgba(255,255,255,0.25)',
                  transform: i === viewIndex ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>
          <button
            onClick={() => setViewIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={isLastPage}
            className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center disabled:opacity-30 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLastPage && (
        <button
          onClick={onFinishRound}
          disabled={!allGraded}
          className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4 disabled:opacity-40 transition-opacity"
          style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
        >
          Finish Grading ▶
        </button>
      )}
    </motion.div>
  );
}
