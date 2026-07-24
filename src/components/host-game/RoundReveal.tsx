import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TeamAnswer } from '@/types/live-game';
import { Question } from '@/types/game';
import { playCorrect, playIncorrect } from '@/lib/sounds';
import { Mic, ChevronLeft, ChevronRight } from 'lucide-react';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

export interface RoundQuestionData {
  questionIndex: number;
  question: Question;
  answers: TeamAnswer[];
}

interface RoundRevealProps {
  questions: RoundQuestionData[];
  round: number;
  onContinue: () => void;
  continueLabel?: string;
  projectorMode?: boolean;
  viewIndex: number;
  onSetViewIndex: (index: number) => void;
}

// ─── Animated Waveform ────────────────────────────────────────────────────────
const AnimatedWaveform = ({ projectorMode }: { projectorMode?: boolean }) => {
  const BAR_COUNT = 32;
  const baseHeights = useRef(
    Array.from({ length: BAR_COUNT }, () => 18 + Math.random() * 28)
  );

  return (
    <div className={`flex items-center justify-center gap-[3px] w-full ${projectorMode ? 'max-w-xl h-24' : 'max-w-sm h-14'}`}>
      <div
        className="flex-shrink-0 rounded-full flex items-center justify-center mr-3"
        style={{ width: projectorMode ? 44 : 32, height: projectorMode ? 44 : 32, background: alpha(theme.color1, 0.2), border: `1px solid ${alpha(theme.color1, 0.4)}` }}
      >
        <Mic style={{ color: theme.color1, width: projectorMode ? 22 : 16, height: projectorMode ? 22 : 16 }} />
      </div>
      {baseHeights.current.map((baseH, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: theme.color1 }}
          animate={{
            height: [`${baseH * 0.4}%`, `${baseH * 0.4 + Math.random() * 55}%`, `${baseH * 0.4}%`],
          }}
          transition={{
            duration: 0.45 + Math.random() * 0.45,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.025,
          }}
        />
      ))}
    </div>
  );
};

export function RoundReveal({
  questions,
  round,
  onContinue,
  continueLabel = 'See Leaderboard',
  projectorMode,
  viewIndex,
  onSetViewIndex,
}: RoundRevealProps) {
  const current = questions[viewIndex];
  const isLastPage = viewIndex === questions.length - 1;
  const soundPlayedForIndex = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { question, answers } = current;
  const questionInRound = viewIndex + 1;

  const totalAnswers = answers.length;
  const correctCount = answers.filter(a => a.isCorrect).length;
  const correctPercentage = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;

  const displayMediaUrl = question.answerMediaUrl || question.mediaUrl;
  const url = displayMediaUrl?.toLowerCase() || '';
  const isAudio = url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a') || url.includes('.ogg');
  const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
  const isImage = !!displayMediaUrl && !isAudio && !isVideo;

  useEffect(() => {
    if (soundPlayedForIndex.current === viewIndex) return;
    soundPlayedForIndex.current = viewIndex;
    const timer = setTimeout(() => {
      if (projectorMode) {
        if (correctCount > 0) playCorrect();
        else playIncorrect();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [viewIndex, correctCount, projectorMode]);

  useEffect(() => {
    if (isAudio && audioRef.current) {
      audioRef.current.muted = !projectorMode;
      audioRef.current.play().catch(() => {});
    }
    if (isVideo && videoRef.current) {
      videoRef.current.muted = !projectorMode;
      videoRef.current.play().catch(() => {});
    }
  }, [viewIndex, isAudio, isVideo, projectorMode]);

  if (!current) return null;

  return (
    <motion.div
      key={`reveal-${viewIndex}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex flex-col items-center gap-5 w-full mx-auto px-4 ${projectorMode ? 'max-w-3xl' : 'max-w-lg'}`}
    >
      {/* Header */}
      <div className="text-center">
        <div
          className={`inline-block font-bungee uppercase tracking-widest rounded-full mb-2 ${projectorMode ? 'text-sm px-6 py-2' : 'text-[11px] px-4 py-1.5'}`}
          style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.35)}`, color: theme.color1 }}
        >
          Answer Reveal — Round {round}
        </div>
        <p className={`text-muted-foreground uppercase tracking-widest ${projectorMode ? 'text-base' : 'text-xs'}`}>
          Question {questionInRound} of {questions.length}
        </p>
      </div>

      {/* Question text */}
      <p className={`font-semibold text-center text-foreground ${projectorMode ? 'text-2xl max-w-2xl' : 'text-base max-w-md'}`}>
        {question.text}
      </p>

      {/* Media */}
      {isAudio && (
        <div className="w-full flex justify-center py-2">
          <AnimatedWaveform projectorMode={projectorMode} />
          <audio ref={audioRef} src={displayMediaUrl} />
        </div>
      )}

      {(isVideo || isImage) && (
        <div
          className="w-full rounded-xl overflow-hidden bg-black/40 border flex items-center justify-center p-2"
          style={{ borderColor: alpha(theme.color1, 0.3), maxHeight: projectorMode ? 420 : 220 }}
        >
          {isVideo ? (
            <video ref={videoRef} src={displayMediaUrl} className="w-full h-full object-contain rounded-md" playsInline />
          ) : (
            <img src={displayMediaUrl} alt="Answer Media" className="w-full h-full object-contain rounded-md" />
          )}
        </div>
      )}

      {/* Answer */}
      <h2
        className={`font-bungee uppercase text-center leading-tight ${projectorMode ? 'text-6xl' : 'text-3xl'}`}
        style={{ color: theme.color1, textShadow: `0 0 30px ${alpha(theme.color1, 0.4)}` }}
      >
        {question.answer}
      </h2>

      {/* Stats */}
      <div className={`w-full space-y-2 ${projectorMode ? 'max-w-xl' : ''}`}>
        <div className="flex items-center justify-between">
          <span className={`font-bungee uppercase tracking-widest text-muted-foreground ${projectorMode ? 'text-sm' : 'text-[11px]'}`}>
            Answered Correctly
          </span>
          <span className={`font-bold text-success ${projectorMode ? 'text-lg' : 'text-sm'}`}>{correctPercentage}%</span>
        </div>
        <div className={`w-full rounded-full bg-secondary overflow-hidden ${projectorMode ? 'h-2.5' : 'h-1.5'}`}>
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${correctPercentage}%` }} />
        </div>
        <p className={`text-muted-foreground text-center ${projectorMode ? 'text-sm' : 'text-xs'}`}>
          {correctCount} of {totalAnswers} teams
        </p>
      </div>

      {/* Stepper + Continue */}
      {!projectorMode && (
        <div className="w-full flex flex-col items-center gap-3">
          {questions.length > 1 && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => onSetViewIndex(Math.max(0, viewIndex - 1))}
                disabled={viewIndex === 0}
                className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center disabled:opacity-30 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-2">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onSetViewIndex(i)}
                    className="w-2 h-2 rounded-full transition-transform"
                    style={{
                      background: i === viewIndex ? theme.color1 : 'rgba(255,255,255,0.25)',
                      transform: i === viewIndex ? 'scale(1.3)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => onSetViewIndex(Math.min(questions.length - 1, viewIndex + 1))}
                disabled={isLastPage}
                className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center disabled:opacity-30 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {isLastPage && (
            <button
              onClick={onContinue}
              className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4"
              style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
            >
              {continueLabel} ▶
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
