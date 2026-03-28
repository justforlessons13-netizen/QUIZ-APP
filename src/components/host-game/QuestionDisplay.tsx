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
}

// ─── Animated Waveform ────────────────────────────────────────────────────────

const AnimatedWaveform = ({ isActivated }: { isActivated: boolean }) => {
  const BAR_COUNT = 48;

  // Pre-generate stable random heights so they don't shift on re-render
  const baseHeights = useRef(
    Array.from({ length: BAR_COUNT }, () => 18 + Math.random() * 28)
  );

  return (
    <div className="flex items-center justify-center gap-[5px] w-full max-w-[900px] h-[180px]">
      {/* Mic icon */}
      <div className="flex-shrink-0 w-[68px] h-[68px] bg-[#d9d9d9] rounded-full flex items-center justify-center mr-5 shadow-lg">
        <Mic className="text-[#120524] w-[34px] h-[34px]" />
      </div>

      {/* Bars */}
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
                height: [
                  `${baseH * 0.4}%`,
                  `${baseH * 0.4 + Math.random() * 55}%`,
                  `${baseH * 0.4}%`,
                ],
                opacity: 1,
              }
              : { height: `${baseH}%`, opacity: 0.35 }
          }
          transition={
            isActivated
              ? {
                duration: 0.45 + Math.random() * 0.45,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.025,
              }
              : { duration: 0.4 }
          }
        />
      ))}
    </div>
  );
};

// ─── Gradient text style (Sugo Display grey gradient) ────────────────────────

const gradientTextStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #e8e8e8 0%, #9a9a9a 60%, #6b6b6b 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuestionDisplay({
  question,
  round,
  questionInRound,
  timeLeft,
  maxTime,
  onCollectAnswers,
  projectorMode,
  onActivate,
}: QuestionDisplayProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActivated, setIsActivated] = useState(false);

  const url = question.mediaUrl?.toLowerCase() || '';
  const isAudio = url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a') || url.includes('.ogg');
  const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
  const isImage = !!question.mediaUrl && !isAudio && !isVideo;
  const hasMedia = !!question.mediaUrl;
  const shouldLoop = maxTime <= 45;

  const isLowTime = isActivated && timeLeft <= 5 && timeLeft > 0;

  // Play media on activate
  useEffect(() => {
    if (!isActivated || !hasMedia) return;
    if (isAudio && audioRef.current) {
      audioRef.current.play().catch(() => { });
    }
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => { });
    }
  }, [isActivated, isAudio, isVideo, hasMedia]);

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
      className="relative flex flex-col items-center w-full h-[calc(100vh-100px)] max-w-[1920px] mx-auto px-8 md:px-16 z-10 pt-[5vh]"
    >
      {/* Hidden timer — handles tick sounds only */}
      {isActivated && (
        <div className="hidden">
          <GameTimer timeLeft={timeLeft} maxTime={maxTime} />
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="w-full flex justify-between items-start max-w-[1700px]">
        {/* Round / Question badge */}
        <div className="flex flex-col items-center gap-[5px]">
          <span className="font-bungee text-[22px] text-[#adbbff] tracking-wider leading-none">
            R{round} / Q{questionInRound}
          </span>
          <div className="w-full h-[3px] bg-[#adbbff] rounded-full opacity-70" />
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center gap-[5px]">
          <span
            className={`font-bungee text-[22px] tracking-wider leading-none transition-colors duration-300 ${isLowTime ? 'text-red-400 animate-pulse' : 'text-[#adbbff]'
              }`}
          >
            {formatTime(isActivated ? timeLeft : maxTime)}
          </span>
          <div
            className={`w-full h-[3px] rounded-full opacity-70 transition-colors duration-300 ${isLowTime ? 'bg-red-400' : 'bg-[#adbbff]'
              }`}
          />
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[1585px] gap-6">

        {/* TEXT ONLY — big centered question */}
        {!hasMedia && (
          <h2
            className="font-sugo text-[42px] md:text-[52px] uppercase tracking-widest text-center leading-snug drop-shadow-md"
            style={gradientTextStyle}
          >
            {question.text}
          </h2>
        )}

        {/* AUDIO question */}
        {hasMedia && isAudio && (
          <>
            <h2
              className="font-sugo text-[38px] md:text-[46px] uppercase tracking-widest text-center leading-snug drop-shadow-md"
              style={gradientTextStyle}
            >
              {question.text}
            </h2>

            <motion.div
              className="w-full flex justify-center"
              animate={{ filter: isActivated ? 'none' : 'grayscale(1) blur(2px)', opacity: isActivated ? 1 : 0.4 }}
              transition={{ duration: 0.6 }}
            >
              <AnimatedWaveform isActivated={isActivated} />
            </motion.div>

            <audio ref={audioRef} src={question.mediaUrl} loop={shouldLoop} />
          </>
        )}

        {/* IMAGE question */}
        {hasMedia && isImage && (
          <>
            <h2
              className="font-sugo text-[32px] md:text-[40px] uppercase tracking-widest text-center leading-snug drop-shadow-md"
              style={gradientTextStyle}
            >
              {question.text}
            </h2>

            <motion.div
              className="w-full max-w-[1156px] overflow-hidden rounded-sm"
              style={{ height: '52vh', minHeight: 280 }}
              animate={{ filter: isActivated ? 'none' : 'grayscale(1) blur(8px)', opacity: isActivated ? 1 : 0.45 }}
              transition={{ duration: 0.7 }}
            >
              <img
                src={question.mediaUrl}
                alt="Visual clue"
                className="w-full h-full object-contain"
              />
            </motion.div>
          </>
        )}

        {/* VIDEO question */}
        {hasMedia && isVideo && (
          <>
            <h2
              className="font-sugo text-[32px] md:text-[40px] uppercase tracking-widest text-center leading-snug drop-shadow-md"
              style={gradientTextStyle}
            >
              {question.text}
            </h2>

            <motion.div
              className="w-full max-w-[1156px] overflow-hidden rounded-sm bg-black/20"
              style={{ height: '52vh', minHeight: 280 }}
              animate={{ filter: isActivated ? 'none' : 'grayscale(1) blur(8px)', opacity: isActivated ? 1 : 0.45 }}
              transition={{ duration: 0.7 }}
            >
              <video
                ref={videoRef}
                src={question.mediaUrl}
                loop={shouldLoop}
                playsInline
                className="w-full h-full object-contain"
              />
            </motion.div>
          </>
        )}
      </div>

      {/* ── HOST BUTTONS ── */}
      {!projectorMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-auto mb-[6vh] z-10"
        >
          {!isActivated ? (
            <button
              onClick={handleActivate}
              className="bg-[#adbbff] text-[#120524] font-bungee text-[18px] px-8 py-2.5 rounded-md hover:scale-105 active:scale-95 transition-transform uppercase shadow-[0_0_20px_rgba(173,187,255,0.25)] tracking-wide"
            >
              Start Music &amp; Timer
            </button>
          ) : (
            <button
              onClick={onCollectAnswers}
              className="bg-[#adbbff] text-[#120524] font-bungee text-[18px] pl-7 pr-5 py-2.5 rounded-md hover:scale-105 active:scale-95 transition-transform uppercase shadow-[0_0_20px_rgba(173,187,255,0.25)] tracking-wide flex items-center gap-2"
            >
              Collect Answers
              <ChevronRightCircle className="w-5 h-5 fill-[#120524] text-[#adbbff]" />
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}