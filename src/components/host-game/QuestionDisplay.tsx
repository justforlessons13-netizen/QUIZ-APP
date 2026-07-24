import { motion } from 'framer-motion';
import { Mic, Users } from 'lucide-react';
import { Question } from '@/types/game';
import { GameTimer } from '@/components/game/GameTimer';
import { useEffect, useRef, useState } from 'react';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

interface QuestionDisplayProps {
  question: Question;
  round: number;
  totalRounds: number;
  questionInRound: number;
  totalInRound: number;
  timeLeft: number;
  maxTime: number;
  onActivate: () => void;
  onCollectAnswers: () => void;
  projectorMode?: boolean;
  timerActive?: boolean;
  packName?: string; // ← pack name shown in top center
  answeredCount?: number;
  teamsTotal?: number;
}

// ─── Animated Waveform ────────────────────────────────────────────────────────

const AnimatedWaveform = ({ isActivated }: { isActivated: boolean }) => {
  const BAR_COUNT = 48;
  const baseHeights = useRef(
    Array.from({ length: BAR_COUNT }, () => 18 + Math.random() * 28)
  );

  return (
    <div className="flex items-center justify-center gap-[5px] w-full max-w-[900px] h-[180px]">
      <div className="flex-shrink-0 w-[68px] h-[68px] bg-[#d9d9d9] rounded-full flex items-center justify-center mr-5 shadow-lg">
        <Mic className="text-[#120524] w-[34px] h-[34px]" />
      </div>
      {baseHeights.current.map((baseH, i) => (
        <motion.div
          key={i}
          className="w-[5px] rounded-full"
          style={{
            background: 'linear-gradient(180deg, #d9d9d9 0%, #888 100%)',
            boxShadow: isActivated ? '0 0 8px rgba(217,217,217,0.25)' : 'none',
          }}
          animate={
            isActivated
              ? {
                height: [`${baseH * 0.4}%`, `${baseH * 0.4 + Math.random() * 55}%`, `${baseH * 0.4}%`],
                opacity: 1,
              }
              : { height: `${baseH}%`, opacity: 0.35 }
          }
          transition={
            isActivated
              ? { duration: 0.45 + Math.random() * 0.45, repeat: Infinity, ease: 'easeInOut', delay: i * 0.025 }
              : { duration: 0.4 }
          }
        />
      ))}
    </div>
  );
};

// ─── Gradient text style ──────────────────────────────────────────────────────

const gradientTextStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #e8e8e8 0%, #9a9a9a 60%, #6b6b6b 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

// ─── Auto-fit hook ────────────────────────────────────────────────────────────

function useAutoFitText(
  textRef: React.RefObject<HTMLHeadingElement>,
  containerRef: React.RefObject<HTMLDivElement>,
  dep: string,
  defaultSize: number,
  minSize = 22
) {
  useEffect(() => {
    const el = textRef.current;
    const container = containerRef.current;
    if (!el || !container) return;
    requestAnimationFrame(() => {
      el.style.fontSize = `${defaultSize}px`;
      let size = defaultSize;
      while (el.scrollHeight > container.clientHeight && size > minSize) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    });
  }, [dep]);
}

// ─── Progress ring ────────────────────────────────────────────────────────────

const RING_R = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function ProgressRing({
  progress,
  color,
  children,
}: {
  progress: number; // 0..1, remaining
  color: string;
  children: React.ReactNode;
}) {
  const offset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div className="relative w-[92px] h-[92px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuestionDisplay({
  question,
  round,
  totalRounds,
  questionInRound,
  totalInRound,
  timeLeft,
  maxTime,
  onCollectAnswers,
  projectorMode,
  timerActive,
  onActivate,
  packName,
  answeredCount = 0,
  teamsTotal = 0,
}: QuestionDisplayProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [isActivated, setIsActivated] = useState(false);

  const url = question.mediaUrl?.toLowerCase() || '';
  const isAudio = url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a') || url.includes('.ogg');
  const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
  const isImage = !!question.mediaUrl && !isAudio && !isVideo;
  const hasMedia = !!question.mediaUrl;
  const shouldLoop = maxTime <= 45;
  const hasOptions = question.type === 'mcq' && !!question.options?.length;

  const defaultFontSize = !hasMedia ? 52 : 38;

  useAutoFitText(textRef, textContainerRef, question.text, defaultFontSize, 22);

  useEffect(() => {
    if (timerActive || timeLeft < maxTime) setIsActivated(true);
  }, [timerActive, timeLeft, maxTime]);

  const isLowTime = isActivated && timeLeft <= 5 && timeLeft > 0;
  const timerColor = isLowTime ? '#f87171' : theme.color1;
  const timerProgress = maxTime > 0 ? timeLeft / maxTime : 0;
  const questionProgress = totalInRound > 0 ? questionInRound / totalInRound : 0;

  useEffect(() => {
    if (!isActivated || !hasMedia) return;
    if (isAudio && audioRef.current) {
      audioRef.current.muted = !projectorMode;
      audioRef.current.play().catch(() => { });
    }
    if (isVideo && videoRef.current) {
      videoRef.current.muted = !projectorMode;
      videoRef.current.play().catch(() => { });
    }
  }, [isActivated, isAudio, isVideo, hasMedia, projectorMode]);

  const handleActivate = () => {
    setIsActivated(true);
    onActivate();
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col w-full h-[calc(100dvh-100px)] md:h-[calc(100vh-100px)] max-w-[1920px] mx-auto px-6 md:px-12 z-10 pt-[3vh] pb-[90px]"
    >
      {/* Hidden timer — tick sounds only */}
      {isActivated && (
        <div className="hidden">
          <GameTimer timeLeft={timeLeft} maxTime={maxTime} />
        </div>
      )}

      {/* ── Countdown ring (top-left) ── */}
      <div className="fixed top-6 left-6 md:left-12 z-20">
        <ProgressRing progress={timerProgress} color={timerColor}>
          <span
            className={`font-mono text-[18px] font-extrabold tabular-nums ${isLowTime ? 'animate-pulse' : ''}`}
            style={{ color: timerColor }}
          >
            {formatTime(isActivated ? timeLeft : maxTime)}
          </span>
        </ProgressRing>
      </div>

      {/* ── Question-number ring (top-right) ── */}
      <div className="fixed top-6 right-6 md:right-12 z-20">
        <ProgressRing progress={questionProgress} color={theme.color1}>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[19px] font-extrabold text-white">{questionInRound}</span>
            <span className="text-[10px] font-semibold text-white/65">of {totalInRound}</span>
          </div>
        </ProgressRing>
      </div>

      {/* ── TOP BAR ── */}
      <div className="w-full flex flex-col items-center flex-none mb-4 gap-1.5">
        <div
          className="font-bungee text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full"
          style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.35)}`, color: theme.color1 }}
        >
          Round {round} of {totalRounds}
        </div>
        {packName && (
          <span className="font-bungee text-[12px] text-white/50 tracking-widest uppercase text-center">
            {packName}
          </span>
        )}
        {teamsTotal > 0 && (
          <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: theme.color1 }}>
            <Users className="w-3.5 h-3.5" />
            {answeredCount}/{teamsTotal}
          </div>
        )}
      </div>

      {/* ── TEXT ONLY — vertically centered ── */}
      {!hasMedia && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6">
          <div
            ref={textContainerRef}
            className="w-full text-center"
            style={{ maxHeight: hasOptions ? '40vh' : '70vh' }}
          >
            <h2
              ref={textRef}
              className="font-sugo uppercase tracking-widest leading-snug drop-shadow-md w-full"
              style={{ fontSize: `${defaultFontSize}px`, ...gradientTextStyle }}
            >
              {question.text}
            </h2>
          </div>

          {hasOptions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {question.options!.map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl px-5 py-4 text-left text-[17px] font-semibold text-white/90"
                  style={{ background: '#13131f', border: `1px solid ${alpha(theme.color1, 0.3)}` }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-extrabold flex-shrink-0"
                    style={{ background: alpha(theme.color1, 0.25), color: theme.color1 }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AUDIO — question text near top, waveform centered ── */}
      {hasMedia && isAudio && (
        <>
          <div
            ref={textContainerRef}
            className="w-full flex-none text-center mb-4"
            style={{ maxHeight: '22vh' }}
          >
            <h2
              ref={textRef}
              className="font-sugo uppercase tracking-widest leading-snug drop-shadow-md w-full"
              style={{ fontSize: `${defaultFontSize}px`, ...gradientTextStyle }}
            >
              {question.text}
            </h2>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <motion.div
              className="w-full flex justify-center"
              animate={{ filter: isActivated ? 'none' : 'grayscale(1) blur(2px)', opacity: isActivated ? 1 : 0.4 }}
              transition={{ duration: 0.6 }}
            >
              <AnimatedWaveform isActivated={isActivated} />
            </motion.div>
          </div>
          <audio ref={audioRef} src={question.mediaUrl} loop={shouldLoop} />
        </>
      )}

      {/* ── IMAGE — question text near top, image fills remaining space ── */}
      {hasMedia && isImage && (
        <>
          <div
            ref={textContainerRef}
            className="w-full flex-none text-center mb-3"
            style={{ maxHeight: '22vh' }}
          >
            <h2
              ref={textRef}
              className="font-sugo uppercase tracking-widest leading-snug drop-shadow-md w-full"
              style={{ fontSize: `${defaultFontSize}px`, ...gradientTextStyle }}
            >
              {question.text}
            </h2>
          </div>
          <motion.div
            className="flex-1 min-h-0 w-full overflow-hidden rounded-none"
            animate={{ filter: isActivated ? 'none' : 'grayscale(1) blur(8px)', opacity: isActivated ? 1 : 0.45 }}
            transition={{ duration: 0.7 }}
          >
            <img src={question.mediaUrl} alt="Visual clue" className="w-full h-full object-contain" />
          </motion.div>
        </>
      )}

      {/* ── VIDEO — same as image ── */}
      {hasMedia && isVideo && (
        <>
          <div
            ref={textContainerRef}
            className="w-full flex-none text-center mb-3"
            style={{ maxHeight: '22vh' }}
          >
            <h2
              ref={textRef}
              className="font-sugo uppercase tracking-widest leading-snug drop-shadow-md w-full"
              style={{ fontSize: `${defaultFontSize}px`, ...gradientTextStyle }}
            >
              {question.text}
            </h2>
          </div>
          <motion.div
            className="flex-1 min-h-0 w-full overflow-hidden rounded-none bg-black/20"
            animate={{ filter: isActivated ? 'none' : 'grayscale(1) blur(8px)', opacity: isActivated ? 1 : 0.45 }}
            transition={{ duration: 0.7 }}
          >
            <video ref={videoRef} src={question.mediaUrl} loop={shouldLoop} playsInline className="w-full h-full object-contain" />
          </motion.div>
        </>
      )}

      {/* ── HOST BUTTONS — exact relative Y-alignment to global icons ── */}
      {!projectorMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-[38px] left-1/2 -translate-x-1/2 z-[60]"
        >
          {!isActivated ? (
            <button
              onClick={handleActivate}
              className="font-bungee text-[14px] px-11 py-4 rounded-[10px] hover:scale-105 active:scale-95 transition-transform uppercase tracking-widest min-w-[300px] text-center"
              style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
            >
              Start Music &amp; Timer
            </button>
          ) : (
            <button
              onClick={onCollectAnswers}
              className="font-bungee text-[14px] px-11 py-4 rounded-[10px] hover:scale-105 active:scale-95 transition-transform uppercase tracking-widest min-w-[300px] text-center"
              style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
            >
              Collect Answers
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
