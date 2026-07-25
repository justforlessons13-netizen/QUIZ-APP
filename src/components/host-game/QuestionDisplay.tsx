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

  const defaultFontSize = 30;

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
      className="relative flex-1 flex flex-col w-full max-w-[1920px] mx-auto px-10 pt-8 z-10"
    >
      {/* Hidden timer — tick sounds only */}
      {isActivated && (
        <div className="hidden">
          <GameTimer timeLeft={timeLeft} maxTime={maxTime} />
        </div>
      )}

      {/* ── Countdown ring (top-left) ── */}
      <div className="absolute top-6 left-8 z-20">
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
      <div className="absolute top-6 right-8 z-20">
        <ProgressRing progress={questionProgress} color={theme.color1}>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[19px] font-extrabold text-white">{questionInRound}</span>
            <span className="text-[10px] font-semibold text-white/65">of {totalInRound}</span>
          </div>
        </ProgressRing>
      </div>

      {/* ── TOP BAR ── */}
      <div className="w-full flex flex-col items-center flex-none">
        <div
          className="font-bungee text-[11px] uppercase"
          style={{
            letterSpacing: '0.12em', padding: '6px 16px', borderRadius: 16, marginBottom: 6,
            background: alpha(theme.color1, 0.133), border: `1px solid ${alpha(theme.color1, 0.271)}`, color: theme.color1,
          }}
        >
          Round {round} of {totalRounds}
        </div>
        {packName && (
          <span
            className="text-center"
            style={{ fontSize: 12, color: 'oklch(70% 0.01 195)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}
          >
            {packName}
          </span>
        )}
        {teamsTotal > 0 && (
          <div className="flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 700, color: theme.color1, marginBottom: 12 }}>
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
              className="leading-snug w-full"
              style={{ fontSize: `${defaultFontSize}px`, fontWeight: 600, color: '#fff' }}
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
              className="leading-snug w-full"
              style={{ fontSize: `${defaultFontSize}px`, fontWeight: 600, color: '#fff' }}
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
              className="leading-snug w-full"
              style={{ fontSize: `${defaultFontSize}px`, fontWeight: 600, color: '#fff' }}
            >
              {question.text}
            </h2>
          </div>
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            <motion.div
              className="overflow-hidden rounded-2xl"
              style={{
                width: '100%',
                maxWidth: projectorMode ? 1100 : 720,
                maxHeight: projectorMode ? '62vh' : '45vh',
                border: `1px solid ${alpha(theme.color1, 0.2)}`,
                background: 'rgba(0,0,0,0.2)',
              }}
              animate={{ filter: isActivated ? 'none' : 'grayscale(1) blur(8px)', opacity: isActivated ? 1 : 0.45 }}
              transition={{ duration: 0.7 }}
            >
              <img src={question.mediaUrl} alt="Visual clue" className="w-full h-full object-contain" style={{ maxHeight: projectorMode ? '62vh' : '45vh' }} />
            </motion.div>
          </div>
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
              className="leading-snug w-full"
              style={{ fontSize: `${defaultFontSize}px`, fontWeight: 600, color: '#fff' }}
            >
              {question.text}
            </h2>
          </div>
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            <motion.div
              className="overflow-hidden rounded-2xl"
              style={{
                width: '100%',
                maxWidth: projectorMode ? 1100 : 720,
                maxHeight: projectorMode ? '62vh' : '45vh',
                border: `1px solid ${alpha(theme.color1, 0.2)}`,
                background: 'rgba(0,0,0,0.2)',
              }}
              animate={{ filter: isActivated ? 'none' : 'grayscale(1) blur(8px)', opacity: isActivated ? 1 : 0.45 }}
              transition={{ duration: 0.7 }}
            >
              <video ref={videoRef} src={question.mediaUrl} loop={shouldLoop} playsInline className="w-full h-full object-contain" style={{ maxHeight: projectorMode ? '62vh' : '45vh' }} />
            </motion.div>
          </div>
        </>
      )}

      {/* ── HOST BUTTONS — normal flow row after content, matches design's separate bottom row ── */}
      {!projectorMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full flex flex-col items-center flex-none"
          style={{ padding: '14px 0 20px' }}
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
