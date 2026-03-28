import { motion } from 'framer-motion';
import { Question } from '@/types/game';
import { GameTimer } from './GameTimer';
import { Button } from '@/components/ui/button';

interface AnswerPhaseProps {
  question: Question;
  round: number;
  isRecap: boolean;
  answer: string;
  onAnswerChange: (answer: string) => void;
  isWagered: boolean;
  onWagerChange: (wagered: boolean) => void;
  timeLeft: number;
  maxTime: number;
  onSubmit: () => void;
}

export function AnswerPhase({
  question, round, isRecap, answer, onAnswerChange,
  isWagered, onWagerChange, timeLeft, maxTime, onSubmit,
}: AnswerPhaseProps) {
  const isFinalRound = round === 6;
  const isMCQ = question.type === 'mcq' && isFinalRound;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto px-4"
    >
      {/* Round & Category */}
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-sm font-semibold border border-primary/20">
          Round {round}
        </span>
        <span className="text-muted-foreground text-sm">{question.category}</span>
      </div>

      {/* Recap badge */}
      {isRecap && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="px-4 py-2 bg-accent/10 border border-accent/20 rounded-lg text-accent text-sm font-medium"
        >
          ✏️ Review your answer — 2nd chance!
        </motion.div>
      )}

      {/* Question */}
      <h2 className="text-xl md:text-2xl font-bold text-center leading-tight">
        {question.text}
      </h2>

      {/* Timer */}
      <GameTimer timeLeft={timeLeft} maxTime={maxTime} />

      {/* MCQ or Text Input */}
      {isMCQ ? (
        <div className="grid grid-cols-2 gap-3 w-full">
          {question.options?.map((option) => (
            <button
              key={option}
              onClick={() => onAnswerChange(option)}
              className={`p-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                answer === option
                  ? 'border-primary bg-primary/15 text-primary box-glow-primary'
                  : 'border-border bg-card hover:border-primary/40 text-card-foreground'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Type your answer..."
          className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-center text-lg transition-all"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && answer && onSubmit()}
        />
      )}

      {/* Wager Toggle — Round 6 only */}
      {isFinalRound && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`flex items-center gap-4 p-4 w-full rounded-xl border transition-all duration-300 ${
            isWagered
              ? 'bg-accent/10 border-accent/30 box-glow-accent'
              : 'bg-card border-border'
          }`}
        >
          <button
            onClick={() => onWagerChange(!isWagered)}
            className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
              isWagered ? 'bg-accent' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute w-6 h-6 rounded-full bg-foreground top-1 transition-all duration-300 ${
                isWagered ? 'left-7' : 'left-1'
              }`}
            />
          </button>
          <div className="flex-1">
            <p className={`font-bold text-sm ${isWagered ? 'text-accent' : 'text-muted-foreground'}`}>
              Go Hard {isWagered ? '⚡' : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {isWagered ? 'Correct = +2 · Wrong = −2' : 'Safe play: +1 or 0'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Submit */}
      <Button
        onClick={onSubmit}
        disabled={!answer}
        className="w-full py-3 h-auto text-base font-bold rounded-xl"
      >
        {isRecap ? 'Submit Final Answer' : 'Lock In Answer'}
      </Button>
    </motion.div>
  );
}
