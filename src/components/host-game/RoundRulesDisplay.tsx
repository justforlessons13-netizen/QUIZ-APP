import { motion } from 'framer-motion';

interface RoundRulesDisplayProps {
  round: number;
  roundName?: string; // New prop for custom naming
  rules?: string;
  onStartRound: () => void;
}

export function RoundRulesDisplay({ round, roundName, rules, onStartRound }: RoundRulesDisplayProps) {
  // This splits the long text from your input by "Enter" (newline)
  // and removes any empty lines
  const displayRules = rules && rules.trim().length > 0
    ? rules.split('\n').filter(rule => rule.trim() !== '')
    : ["NO PHONES ALLOWED", "DO NOT SHOUT", "ESMA IS ESMA"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="relative flex flex-col items-center w-full h-[calc(100vh-100px)] max-w-7xl mx-auto px-6 z-10"
    >
      {/* --- MAIN CENTER CONTENT --- */}
      <div className="flex flex-col items-center w-full mt-[12vh]">

        {/* --- HEADER --- */}
        <h1
          className="text-[65px] font-bungee text-[#adbbff] leading-none uppercase text-center"
          style={{ textShadow: '0 0 12px rgba(173, 187, 255, 0.5), 0 0 25px rgba(173, 187, 255, 0.3)' }}
        >
          {/* Shows Round Name if provided, otherwise defaults to Round # */}
          {roundName ? roundName : `Round ${round}`}
        </h1>

        {/* --- RULES LIST --- */}
        <div className="w-full bg-gradient-to-r from-transparent via-[#d9d9d9]/10 to-transparent py-8 mt-12 mb-8">
          <div className="flex flex-col items-center gap-4 text-center z-10">
            {displayRules.map((rule, index) => (
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 + 0.3 }}
                className="text-[28px] font-sugo uppercase text-[#d9d9d9] tracking-widest leading-relaxed drop-shadow-md"
              >
                {/* Removes leading dashes or numbers so the rules look cleaner */}
                {rule.replace(/^[\s\d.-]+/, '')}
              </motion.p>
            ))}
          </div>
        </div>

      </div>

      {/* --- ACTION BUTTON --- */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        onClick={onStartRound}
        className="bg-[#adbbff] text-[#120524] font-bungee text-[20px] px-8 py-3 rounded-md hover:scale-105 transition-transform uppercase flex items-center justify-center mt-auto mb-[8vh] shadow-[0_0_15px_rgba(173,187,255,0.2)] z-10"
      >
        Here We Go!
      </motion.button>
    </motion.div>
  );
}