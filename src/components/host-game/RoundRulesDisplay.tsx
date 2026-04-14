import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface RoundRulesDisplayProps {
  round: number;
  roundName?: string;
  rules?: string;
  projectorMode?: boolean;
  onStartRound: () => void;
}

export function RoundRulesDisplay({ round, roundName, rules, projectorMode, onStartRound }: RoundRulesDisplayProps) {
  const rulesContainerRef = useRef<HTMLDivElement>(null);

  const displayRules = rules && rules.trim().length > 0
    ? rules.split('\n').filter(rule => rule.trim() !== '')
    : ["NO PHONES ALLOWED", "DO NOT SHOUT", "WRITE CLEARLY"];

  useEffect(() => {
    const container = rulesContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      const MAX_SIZE = 28;
      const MIN_SIZE = 18;
      container.style.fontSize = `${MAX_SIZE}px`;
      let currentSize = MAX_SIZE;

      while (container.scrollHeight > container.clientHeight && currentSize > MIN_SIZE) {
        currentSize -= 1;
        container.style.fontSize = `${currentSize}px`;
      }
    });
  }, [rules]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="relative flex flex-col items-center w-full h-[calc(100vh-100px)] max-w-7xl mx-auto px-6 z-10"
    >
      <div className="flex flex-col items-center w-full flex-1 min-h-0 mt-[8vh]">

        {/* Header — shows roundName if provided, otherwise "Round N" */}
        <div className="flex-none">
          <h1
            className="text-[65px] font-bungee text-[#adbbff] leading-none uppercase text-center"
            style={{ textShadow: '0 0 12px rgba(173,187,255,0.5), 0 0 25px rgba(173,187,255,0.3)' }}
          >
            {roundName && roundName.trim() ? roundName : `Round ${round}`}
          </h1>
        </div>

        {/* Rules list */}
        <div className="flex-1 w-full flex flex-col justify-center min-h-0 py-4 my-6 bg-gradient-to-r from-transparent via-[#d9d9d9]/10 to-transparent overflow-hidden">
          <div
            ref={rulesContainerRef}
            className="flex flex-col items-center justify-center gap-4 text-center w-full h-full overflow-hidden z-10"
          >
            {displayRules.map((rule, index) => (
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 + 0.3 }}
                className="font-sugo uppercase text-[#d9d9d9] tracking-widest leading-relaxed drop-shadow-md"
                style={{ fontSize: 'inherit' }}
              >
                {/* No stripping — show rule exactly as entered */}
                {rule.trim()}
              </motion.p>
            ))}
          </div>
        </div>

      </div>

      {!projectorMode && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          onClick={() => {
            const audio = new Audio('/assets/here-we-go.mp3');
            audio.play().catch(() => { });
            onStartRound();
          }}
          className="flex-none bg-[#adbbff] text-[#120524] font-bungee text-[20px] px-8 py-3 rounded-md hover:scale-105 transition-transform uppercase flex items-center justify-center mb-[8vh] shadow-[0_0_15px_rgba(173,187,255,0.2)] z-10"
        >
          Here We Go!
        </motion.button>
      )}
    </motion.div>
  );
}