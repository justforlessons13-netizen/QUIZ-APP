import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface GameRulesDisplayProps {
  rules?: string;
  projectorMode?: boolean;
  onContinue: () => void;
}

export function GameRulesDisplay({ rules, projectorMode, onContinue }: GameRulesDisplayProps) {
  const rulesContainerRef = useRef<HTMLDivElement>(null);

  // Convert the single string from your database into an array
  const displayRules = rules && rules.trim().length > 0
    ? rules.split('\n').filter(rule => rule.trim() !== '')
    : [
      "DO NOT SHOUT THE CORRECT ANSWER!",
      "TOTAL OF 6 ROUNDS; RANKINGS WILL BE SHOWN AFTER EVERY 2 ROUNDS",
      "IF TEAMS TIE IN SCORE, THE WINNER IS THE TEAM WITH THE HIGHEST FINAL ROUND SCORE"
    ];

  // Auto-fit text resizing logic
  useEffect(() => {
    const container = rulesContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.style.fontSize = '28px'; // Max size
      let currentSize = 28;
      const minSize = 12;

      // While content overflows the strict container height, shrink it
      while (container.scrollHeight > container.clientHeight && currentSize > minSize) {
        currentSize -= 1;
        container.style.fontSize = `${currentSize}px`;
      }
    });
  }, [displayRules]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center w-full h-[calc(100vh-100px)] max-w-7xl mx-auto px-6 z-10 pt-[8vh]"
    >
      {/* --- Title Section --- */}
      <div className="flex-none text-center flex flex-col items-center">
        <h1
          className="text-[65px] font-bungee text-white leading-none tracking-normal uppercase"
          style={{
            textShadow: '0 0 10px #adbbff, 0 0 25px #adbbff, 0 0 45px #adbbff'
          }}
        >
          Game Rules
        </h1>
        {/* Preserved your exactly 25px subtitle */}
        <p className="text-[25px] tracking-[0.1em] uppercase font-sugo text-[#d9d9d9] mt-2">
          Review the rules before we begin
        </p>
      </div>

      {/* --- Rules List (Flexible Container) --- */}
      <div className="flex-1 w-full flex flex-col justify-center min-h-0 py-4 my-6 bg-gradient-to-r from-transparent via-[#d9d9d9]/10 to-transparent">
        <div ref={rulesContainerRef} className="flex flex-col items-center justify-center gap-5 text-center w-full h-full overflow-hidden">
          {displayRules.map((rule, index) => (
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 + 0.3 }}
              className="font-sugo uppercase text-[#d9d9d9] tracking-widest leading-relaxed drop-shadow-md"
              style={{ fontSize: 'inherit' }}
            >
              {/* Removes leading numbers or dots automatically */}
              {rule.replace(/^[\s\d.-]+/, '')}
            </motion.p>
          ))}
        </div>
      </div>

      {/* --- Action Button (Now Smaller & Sleeker) --- */}
      {!projectorMode && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          onClick={() => {
            const audio = new Audio('/assets/here-we-go.mp3');
            audio.play().catch(() => {});
            onContinue();
          }}
          // Reduced text to 20px and padding to px-8 py-3 to match the sleek Round Rules button
          className="bg-[#adbbff] text-[#120524] font-bungee text-[20px] px-8 py-3 rounded-md hover:scale-105 transition-transform uppercase flex items-center justify-center mt-auto mb-[8vh] shadow-[0_0_15px_rgba(173,187,255,0.2)]"
        >
          LET'S START
        </motion.button>
      )}

    </motion.div>
  );
}