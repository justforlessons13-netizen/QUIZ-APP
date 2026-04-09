import { motion } from 'framer-motion';
import { Question } from '@/types/game';
import { Button } from '@/components/ui/button';

interface RevealPhaseProps {
  question: Question;
  playerAnswer: string;
  isCorrect: boolean;
  points: number;
  isWagered: boolean;
  round: number;
  onContinue: () => void;
}

export function RevealPhase({
  question, playerAnswer, isCorrect, points, isWagered, round, onContinue,
}: RevealPhaseProps) {
  const displayMediaUrl = question.answerMediaUrl || question.mediaUrl;
  const url = displayMediaUrl?.toLowerCase() || '';
  const isAudio = url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a') || url.includes('.ogg');
  const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
  const isImage = !!displayMediaUrl && !isAudio && !isVideo;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4"
    >
      {/* Correct Answer */}
      <div className="text-center w-full">
        <p className="text-sm text-muted-foreground mb-2">The correct answer is</p>
        
        {displayMediaUrl && (
          <div className="w-full flex justify-center mb-4">
            {isAudio && (
              <audio src={displayMediaUrl} controls className="w-full max-w-[240px]" />
            )}
            {isVideo && (
              <video src={displayMediaUrl} controls playsInline className="max-h-48 rounded-lg object-contain bg-black/20" />
            )}
            {isImage && (
              <img src={displayMediaUrl} alt="Answer Media" className="max-h-48 rounded-lg object-contain bg-black/20" />
            )}
          </div>
        )}

        <h2 className="text-3xl font-bold text-primary text-glow-primary">{question.answer}</h2>
      </div>

      {/* Your Answer */}
      <div className={`p-4 rounded-xl border-2 w-full text-center transition-all ${
        isCorrect
          ? 'border-success bg-success/10'
          : 'border-destructive bg-destructive/10'
      }`}>
        <p className="text-xs text-muted-foreground mb-1">Your answer</p>
        <p className="font-semibold text-lg">{playerAnswer || '(no answer)'}</p>
      </div>

      {/* Score Feedback */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', delay: 0.3, stiffness: 200 }}
        className="text-center"
      >
        <p className={`text-6xl font-bold ${
          points > 0 ? 'text-success text-glow-success' : points < 0 ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {points > 0 ? `+${points}` : points === 0 ? '0' : points}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {isWagered && round === 6 ? '⚡ Go Hard · ' : ''}
          {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
        </p>
      </motion.div>

      <Button onClick={onContinue} className="w-full py-3 h-auto text-base font-bold rounded-xl">
        Continue
      </Button>
    </motion.div>
  );
}
