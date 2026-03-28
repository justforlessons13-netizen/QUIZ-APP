import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LiveTeam, TeamAnswer } from '@/types/live-game';
import { Question } from '@/types/game';
import { playCorrect, playIncorrect } from '@/lib/sounds';
import { Check, X } from 'lucide-react';

interface RoundRevealProps {
  teams: LiveTeam[];
  answers: TeamAnswer[];
  question: Question;
  round: number;
  totalRounds: number;
  onContinue: () => void;
  projectorMode?: boolean;
  questionInRound?: number;
}

// Canva canvas is 1920×1080 — convert px to vw/vh
const vw = (px: number) => `${(px / 19.2).toFixed(3)}vw`;
const vh = (px: number) => `${(px / 10.8).toFixed(3)}vh`;

// Sugo Display grey gradient fill
const sugoGradient: React.CSSProperties = {
  background: 'linear-gradient(180deg, #e8e8e8 0%, #9a9a9a 60%, #6b6b6b 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export function RoundReveal({
  answers,
  question,
  onContinue,
  projectorMode,
  questionInRound = 1,
}: RoundRevealProps) {
  const soundPlayed = useRef(false);

  const totalAnswers = answers.length;
  const correctCount = answers.filter(a => a.isCorrect).length;
  const incorrectCount = totalAnswers - correctCount;
  const correctPercentage = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;

  useEffect(() => {
    if (soundPlayed.current) return;
    soundPlayed.current = true;
    const timer = setTimeout(() => {
      if (correctCount > 0) playCorrect();
      else playIncorrect();
    }, 500);
    return () => clearTimeout(timer);
  }, [correctCount]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      // Full screen canvas, absolutely positioned to match Canva 1920×1080
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
    >

      {/* ── "QUESTION N" label ── */}
      {/* Bungee 24.3px, centered at X:845.3+229.4/2=960, Y:144.5 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute w-full flex flex-col items-center"
        style={{ top: vh(144.5) }}
      >
        <span
          className="font-bungee uppercase text-[#adbbff] leading-none tracking-wider"
          style={{
            fontSize: vw(24.3),
            textShadow: '0 0 15px rgba(173,187,255,0.6)',
          }}
        >
          Question {questionInRound}
        </span>
        {/* Underline — same width as text approx 229px */}
        <div
          className="rounded-full bg-[#adbbff]/60 mt-[4px]"
          style={{ width: vw(229.4), height: '3px' }}
        />
      </motion.div>

      {/* ── Question text ── */}
      {/* Sugo Display 26px, X:171.3, Y:207, W:1585.7 → centered */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="absolute text-center"
        style={{
          top: vh(207),
          left: vw(171.3),
          width: vw(1585.7),
        }}
      >
        <h3
          className="font-sugo uppercase tracking-[0.12em] leading-snug"
          style={{ fontSize: vw(26), ...sugoGradient }}
        >
          {question.text}
        </h3>
      </motion.div>

      {/* ── "CORRECT ANSWER" label ── */}
      {/* Bungee 24.3px, W:573.5, X:677.3, Y:409.2 → centered on page */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="absolute w-full flex flex-col items-center"
        style={{ top: vh(409.2) }}
      >
        <span
          className="font-bungee uppercase text-[#adbbff] leading-none tracking-wider"
          style={{ fontSize: vw(24.3) }}
        >
          Correct Answer
        </span>
        {/* Underline — width 308.8px from original file */}
        <div
          className="rounded-full bg-[#adbbff]/60 mt-[3px]"
          style={{ width: vw(308.8), height: '3px' }}
        />
      </motion.div>

      {/* ── Answer text ── */}
      {/* Bungee 40.3px, X:167.2, Y:469.8, W:1585.7 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 180 }}
        className="absolute text-center"
        style={{
          top: vh(469.8),
          left: vw(167.2),
          width: vw(1585.7),
        }}
      >
        <h2
          className="font-bungee uppercase text-[#adbbff] leading-tight"
          style={{
            fontSize: vw(40.3),
            textShadow: '0 0 30px rgba(173,187,255,0.5), 0 0 60px rgba(173,187,255,0.2)',
          }}
        >
          {question.answer}
        </h2>
      </motion.div>

      {/* ── Stats row ── */}
      {/* Green circle: W/H:63.8, X:693.9, Y:736 → gap between correct & incorrect ~200px */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="absolute flex items-center justify-center gap-[8vw] w-full"
        style={{ top: vh(736) }}
      >
        {/* Correct */}
        <div className="flex items-center gap-[1.2vw]">
          <div
            className="rounded-full bg-[#22c55e] flex items-center justify-center flex-shrink-0 shadow-[0_0_18px_rgba(34,197,94,0.4)]"
            style={{ width: vw(63.8), height: vw(63.8) }}
          >
            <Check
              className="text-white stroke-[3.5]"
              style={{ width: vw(32), height: vw(32) }}
            />
          </div>
          <span
            className="font-sugo uppercase tracking-widest text-[#d9d9d9] pt-1"
            style={{ fontSize: vw(26) }}
          >
            {correctCount} Teams
          </span>
        </div>

        {/* Incorrect */}
        <div className="flex items-center gap-[1.2vw]">
          <div
            className="rounded-full bg-[#ef4444] flex items-center justify-center flex-shrink-0 shadow-[0_0_18px_rgba(239,68,68,0.4)]"
            style={{ width: vw(63.8), height: vw(63.8) }}
          >
            <X
              className="text-white stroke-[3.5]"
              style={{ width: vw(32), height: vw(32) }}
            />
          </div>
          <span
            className="font-sugo uppercase tracking-widest text-[#d9d9d9] pt-1"
            style={{ fontSize: vw(26) }}
          >
            {incorrectCount} Teams
          </span>
        </div>
      </motion.div>

      {/* ── "X% OF TEAMS GOT THIS RIGHT" ── */}
      {/* Bungee 23.2px, W:573.5, X:677.3, Y:814.7 → centered */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="absolute w-full flex justify-center"
        style={{ top: vh(814.7) }}
      >
        <span
          className="font-bungee uppercase text-[#adbbff] tracking-wide"
          style={{ fontSize: vw(23.2) }}
        >
          {correctPercentage}% of teams got this right
        </span>
      </motion.div>

      {/* ── CONTINUE button ── */}
      {/* W:177.7, H:36.8, X:871.2, Y:975.9 → centered (871.2 + 177.7/2 = 960 = center) */}
      {!projectorMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute w-full flex justify-center pointer-events-auto"
          style={{ bottom: vh(67.3) }}
        >
          <button
            onClick={onContinue}
            className="bg-[#adbbff] text-[#120524] font-bungee uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all leading-none pb-[2px]"
            style={{
              width: vw(177.7),
              height: vw(36.8),
              fontSize: vw(23.2),
              borderRadius: vw(6),
              boxShadow: '0 0 20px rgba(173,187,255,0.2)',
            }}
          >
            Continue
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}