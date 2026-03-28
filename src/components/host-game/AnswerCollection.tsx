import { motion } from 'framer-motion';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { Button } from '@/components/ui/button';
import { LiveTeam, TeamAnswer } from '@/types/live-game';
import { Question } from '@/types/game';

interface AnswerCollectionProps {
  teams: LiveTeam[];
  answers: TeamAnswer[];
  question: Question;
  round: number;
  questionInRound?: number;
  totalInRound?: number;
  onUpdateAnswer: (teamId: string, answer: string, isWagered?: boolean) => void;
  onNext: () => void; // Renamed from onAutoGrade to be more generic
}

export function AnswerCollection({
  teams, answers, question, round, questionInRound = 1, totalInRound = 1, onUpdateAnswer, onNext,
}: AnswerCollectionProps) {
  const isFinalRound = round === 6;
  const allAnswered = answers.every(a => a.answer.trim() !== '');

  // Logic to determine button text
  const isLastInRound = questionInRound === totalInRound;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto px-4"
    >
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Enter Team Answers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Round {round} · Q{questionInRound}/{totalInRound}
        </p>
      </div>

      <div className="w-full space-y-3">
        {teams.map(team => {
          const answer = answers.find(a => a.teamId === team.id);
          return (
            <motion.div
              key={team.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
            >
              <Emoji3D emoji={team.emoji} className="w-6 h-6" />
              <span className="font-medium text-foreground">{team.name}</span>

              {/* Manual Entry Input */}
              {question.type === 'mcq' ? (
                <div className="flex gap-1">
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => onUpdateAnswer(team.id, opt, answer?.isWagered)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs border transition-colors ${answer?.answer === opt
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-muted-foreground border-transparent hover:border-primary/50'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={answer?.answer || ''}
                  onChange={e => onUpdateAnswer(team.id, e.target.value, answer?.isWagered)}
                  placeholder="Answer..."
                  className="w-32 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              )}

              {/* Wager toggle for round 6 */}
              {isFinalRound && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={answer?.isWagered ?? false}
                    onChange={(e) => onUpdateAnswer(team.id, answer?.answer ?? '', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${answer?.isWagered ? 'bg-accent' : 'bg-muted'
                    }`}>
                    <div className={`absolute w-4 h-4 rounded-full bg-foreground top-1 transition-all ${answer?.isWagered ? 'left-5' : 'left-1'
                      }`} />
                  </div>
                  <span className={`text-xs font-medium ${answer?.isWagered ? 'text-accent' : 'text-muted-foreground'
                    }`}>
                    ⚡
                  </span>
                </label>
              )}
            </motion.div>
          );
        })}
      </div>

      <Button
        onClick={onNext}
        disabled={!allAnswered}
        className={`w-full py-3 h-auto text-base font-bold rounded-xl ${!isLastInRound ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''}`}
      >
        {isLastInRound ? (
          <>
            <ClipboardCheck className="w-5 h-5 mr-2" />
            Finish Round & Grade
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