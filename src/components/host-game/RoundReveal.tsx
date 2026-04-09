import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LiveTeam, TeamAnswer } from '@/types/live-game';
import { Question } from '@/types/game';
import { playCorrect, playIncorrect } from '@/lib/sounds';
import { Check, X, Mic } from 'lucide-react';

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

// ─── Animated Waveform ────────────────────────────────────────────────────────
const AnimatedWaveform = () => {
  const BAR_COUNT = 48;
  const baseHeights = useRef(
    Array.from({ length: BAR_COUNT }, () => 18 + Math.random() * 28)
  );

  return (
    <div className="flex items-center justify-center gap-[5px] w-full max-w-[900px] h-full">
      <div className="flex-shrink-0 w-[68px] h-[68px] bg-[#d9d9d9] rounded-full flex items-center justify-center mr-5 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
        <Mic className="text-[#120524] w-[34px] h-[34px]" />
      </div>
      {baseHeights.current.map((baseH, i) => (
        <motion.div
          key={i}
          className="w-[5px] rounded-full"
          style={{
            background: 'linear-gradient(180deg, #d9d9d9 0%, #888 100%)',
            boxShadow: '0 0 10px rgba(217,217,217,0.3)',
          }}
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
  answers,
  question,
  onContinue,
  projectorMode,
  questionInRound = 1,
}: RoundRevealProps) {
  const soundPlayed = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const totalAnswers = answers.length;
  const correctCount = answers.filter(a => a.isCorrect).length;
  const incorrectCount = totalAnswers - correctCount;
  const correctPercentage = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;

  const displayMediaUrl = question.answerMediaUrl || question.mediaUrl;
  const url = displayMediaUrl?.toLowerCase() || '';
  const isAudio = url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a') || url.includes('.ogg');
  const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
  const isImage = !!displayMediaUrl && !isAudio && !isVideo;
  const hasMedia = !!displayMediaUrl;

  useEffect(() => {
    if (soundPlayed.current) return;
    soundPlayed.current = true;
    const timer = setTimeout(() => {
      if (projectorMode) {
        if (correctCount > 0) playCorrect();
        else playIncorrect();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [correctCount, projectorMode]);

  useEffect(() => {
    if (isAudio && audioRef.current) {
      audioRef.current.muted = !projectorMode;
      audioRef.current.play().catch(() => {});
    }
    if (isVideo && videoRef.current) {
      videoRef.current.muted = !projectorMode;
      videoRef.current.play().catch(() => {});
    }
  }, [isAudio, isVideo, projectorMode]);

  // Determine dynamic Y positions based on media presence
  const yQuestionN = hasMedia && (isVideo || isImage) ? vh(50) : vh(144.5);
  const yQuestionText = hasMedia && (isVideo || isImage) ? vh(100) : vh(207);
  const yCorrectLabel = hasMedia && (isVideo || isImage) ? vh(810) : hasMedia && isAudio ? vh(500) : vh(409.2);
  const yCorrectText = hasMedia && (isVideo || isImage) ? vh(810) : hasMedia && isAudio ? vh(560) : vh(469.8);
  const yStatsRow = hasMedia && (isVideo || isImage) ? vh(930) : hasMedia && isAudio ? vh(700) : vh(736);
  const yStatsPct = hasMedia && (isVideo || isImage) ? vh(1000) : hasMedia && isAudio ? vh(780) : vh(814.7);

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
      {(projectorMode || !hasMedia || isAudio) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute w-full flex flex-col items-center"
          style={{ top: yQuestionN }}
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
          <div
            className="rounded-full bg-[#adbbff]/60 mt-[4px]"
            style={{ width: vw(229.4), height: '3px' }}
          />
        </motion.div>
      )}

      {/* ── Question text ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="absolute w-full flex justify-center"
        style={{ top: yQuestionText }}
      >
        <h3
          className="font-sugo uppercase tracking-[0.12em] leading-snug text-center"
          style={{ fontSize: vw(26), maxWidth: vw(1585.7), ...sugoGradient }}
        >
          {question.text}
        </h3>
      </motion.div>

      {/* ── AUDIO Media ── */}
      {isAudio && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute w-full flex justify-center"
          style={{ top: vh(280), height: vh(180) }}
        >
          <AnimatedWaveform />
          <audio ref={audioRef} src={displayMediaUrl} />
        </motion.div>
      )}

      {/* ── VIDEO/IMAGE Media ── */}
      {(isVideo || isImage) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute w-full flex justify-center"
          style={{ top: vh(140) }}
        >
          <div
            className="rounded-lg overflow-hidden bg-black/40 border-[3px] border-[#adbbff]/30 shadow-[0_0_30px_rgba(173,187,255,0.15)] flex items-center justify-center p-2"
            style={{ width: vw(1156.7), height: vh(652.4) }}
          >
            {isVideo ? (
              <video
                ref={videoRef}
                src={displayMediaUrl}
                className="w-full h-full object-contain rounded-md"
                playsInline
              />
            ) : (
              <img
                src={displayMediaUrl}
                alt="Answer Media"
                className="w-full h-full object-contain rounded-md"
              />
            )}
          </div>
        </motion.div>
      )}

      {/* ── "CORRECT ANSWER" label ── */}
      {(!hasMedia || isAudio) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="absolute w-full flex flex-col items-center"
          style={{ top: yCorrectLabel }}
        >
          <span
            className="font-bungee uppercase text-[#adbbff] leading-none tracking-wider"
            style={{ fontSize: vw(24.3) }}
          >
            Correct Answer
          </span>
          <div
            className="rounded-full bg-[#adbbff]/60 mt-[3px]"
            style={{ width: vw(308.8), height: '3px' }}
          />
        </motion.div>
      )}

      {/* ── Answer text ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 180 }}
        className="absolute w-full flex justify-center"
        style={{ top: yCorrectText }}
      >
        <h2
          className="font-bungee uppercase text-[#adbbff] leading-tight text-center"
          style={{
            fontSize: hasMedia && (isVideo || isImage) ? vw(30) : vw(40.3),
            maxWidth: vw(1585.7),
            textShadow: '0 0 30px rgba(173,187,255,0.5), 0 0 60px rgba(173,187,255,0.2)',
          }}
        >
          {question.answer}
        </h2>
      </motion.div>

      {/* ── Stats row ── */}
      {(projectorMode || !hasMedia || isAudio) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="absolute flex items-center justify-center gap-[8vw] w-full"
          style={{ top: yStatsRow }}
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
      )}

      {/* ── "X% OF TEAMS GOT THIS RIGHT" ── */}
      {(projectorMode || !hasMedia || isAudio) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="absolute w-full flex justify-center"
          style={{ top: yStatsPct }}
        >
          <span
            className="font-bungee uppercase text-[#adbbff] tracking-wide"
            style={{ fontSize: vw(23.2) }}
          >
            {correctPercentage}% of teams got this right
          </span>
        </motion.div>
      )}

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