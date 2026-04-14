import { motion } from 'framer-motion';
import { Mic, ChevronRightCircle } from 'lucide-react';
import { Question } from '@/types/game';
import { GameTimer } from '@/components/game/GameTimer';
import { useEffect, useRef, useState } from 'react';

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

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuestionDisplay({
  question,
  round,
  questionInRound,
  timeLeft,
  maxTime,
  onCollectAnswers,
  projectorMode,
  timerActive,
  onActivate,
  packName,
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

  const defaultFontSize = !hasMedia ? 52 : 38;

  useAutoFitText(textRef, textContainerRef, question.text, defaultFontSize, 22);

  useEffect(() => {
    if (timerActive || timeLeft < maxTime) setIsActivated(true);
  }, [timerActive, timeLeft, maxTime]);

  const isLowTime = isActivated && timeLeft <= 5 && timeLeft > 0;

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

      {/* ── TOP BAR ── */}
      {/* Three columns: R/Q badge | pack name | timer — all with underline */}
      <div className="w-full grid grid-cols-3 items-start flex-none mb-6">

        {/* Left — R1 / Q2 underlined */}
        <div className="flex items-start">
          <span
            className="font-bungee text-[20px] text-[#adbbff] tracking-wider leading-none"
            style={{ textDecoration: 'underline', textDecorationColor: 'rgba(173,187,255,0.7)', textUnderlineOffset: '6px', textDecorationThickness: '3px' }}
          >
            R{round} /&nbsp;Q{questionInRound}
          </span>
        </div>

        {/* Center — Pack name */}
        <div className="flex items-start justify-center">
          <span className="font-bungee text-[14px] text-[#adbbff]/70 tracking-widest leading-none uppercase text-center">
            {packName || ''}
          </span>
        </div>

        {/* Right — Timer underlined */}
        <div className="flex items-start justify-end">
          <span
            className={`font-bungee text-[20px] tracking-wider leading-none transition-colors duration-300 ${isLowTime ? 'text-red-400 animate-pulse' : 'text-[#adbbff]'
              }`}
            style={{
              textDecoration: 'underline',
              textDecorationColor: isLowTime ? 'rgba(248,113,113,0.7)' : 'rgba(173,187,255,0.7)',
              textUnderlineOffset: '6px',
              textDecorationThickness: '3px',
            }}
          >
            {formatTime(isActivated ? timeLeft : maxTime)}
          </span>
        </div>
      </div>

      {/* ── TEXT ONLY — vertically centered ── */}
      {!hasMedia && (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div
            ref={textContainerRef}
            className="w-full text-center"
            style={{ maxHeight: '70vh' }}
          >
            <h2
              ref={textRef}
              className="font-sugo uppercase tracking-widest leading-snug drop-shadow-md w-full"
              style={{ fontSize: `${defaultFontSize}px`, ...gradientTextStyle }}
            >
              {question.text}
            </h2>
          </div>
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
              className="bg-[#adbbff] text-[#120524] font-bungee text-[15px] px-6 py-1.5 rounded-[10px] hover:scale-105 active:scale-95 transition-transform uppercase tracking-wider"
            >
              Start Music &amp; Timer
            </button>
          ) : (
            <button
              onClick={onCollectAnswers}
              className="bg-[#adbbff] text-[#120524] font-bungee text-[15px] pl-5 pr-4 py-1.5 rounded-[10px] hover:scale-105 active:scale-95 transition-transform uppercase tracking-wider flex items-center gap-2"
            >
              Collect Answers
              <ChevronRightCircle className="w-4 h-4 fill-[#120524] text-[#adbbff]" />
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}