import { motion } from 'framer-motion';

interface GameRulesDisplayProps {
  rules?: string;
  onContinue: () => void;
}

export function GameRulesDisplay({ rules, onContinue }: GameRulesDisplayProps) {
  // Convert the single string from your database into an array
  const displayRules = rules && rules.trim().length > 0
    ? rules.split('\n').filter(rule => rule.trim() !== '')
    : [
      "DO NOT SHOUT THE CORRECT ANSWER!",
      "TOTAL OF 6 ROUNDS; RANKINGS WILL BE SHOWN AFTER EVERY 2 ROUNDS",
      "IF TEAMS TIE IN SCORE, THE WINNER IS THE TEAM WITH THE HIGHEST FINAL ROUND SCORE"
    ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center w-full h-[calc(100vh-100px)] max-w-7xl mx-auto px-6 z-10 pt-[8vh]"
    >
      {/* --- Title Section --- */}
      <div className="text-center flex flex-col items-center">
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

      {/* --- Rules List (Now matches Round Rules style: Centered & No Circles) --- */}
      <div className="w-full bg-gradient-to-r from-transparent via-[#d9d9d9]/10 to-transparent py-10 mt-10 mb-8">
        <div className="flex flex-col items-center gap-5 text-center">
          {displayRules.map((rule, index) => (
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 + 0.3 }}
              className="text-[28px] font-sugo uppercase text-[#d9d9d9] tracking-widest leading-relaxed drop-shadow-md"
            >
              {/* Removes leading numbers or dots automatically */}
              {rule.replace(/^[\s\d.-]+/, '')}
            </motion.p>
          ))}
        </div>
      </div>

      {/* --- Action Button (Now Smaller & Sleeker) --- */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        onClick={onContinue}
        // Reduced text to 20px and padding to px-8 py-3 to match the sleek Round Rules button
        className="bg-[#adbbff] text-[#120524] font-bungee text-[20px] px-8 py-3 rounded-md hover:scale-105 transition-transform uppercase flex items-center justify-center mt-auto mb-[8vh] shadow-[0_0_15px_rgba(173,187,255,0.2)]"
      >
        Let's Play
      </motion.button>

    </motion.div>
  );
}