import { motion } from 'framer-motion';

interface GameRulesDisplayProps {
  rules?: string;
  onContinue: () => void;
}

export function GameRulesDisplay({ rules, onContinue }: GameRulesDisplayProps) {
  // Convert the single string from your database into an array.
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
      // Full height container allows us to push the button to the absolute bottom
      className="flex flex-col items-center w-full h-[calc(100vh-100px)] max-w-6xl mx-auto px-6 z-10 pt-[8vh]"
    >
      {/* --- Title Section --- */}
      <div className="text-center flex flex-col items-center">
        {/* Changed tracking-widest to tracking-normal to tighten letter spacing */}
        <h1
          className="text-[65px] font-bungee text-white leading-none tracking-normal uppercase"
          style={{
            textShadow: '0 0 10px #adbbff, 0 0 25px #adbbff, 0 0 45px #adbbff'
          }}
        >
          Game Rules
        </h1>
        {/* Exactly 25px Subtitle */}
        <p className="text-[25px] tracking-[0.1em] uppercase font-sugo text-[#d9d9d9] mt-2">
          Review the rules before we begin
        </p>
      </div>

      {/* --- Rules List Container --- */}
      {/* Grey Gradient Background matches the Canva overlay */}
      <div className="w-full bg-gradient-to-r from-transparent via-[#d9d9d9]/10 to-transparent py-6 px-4 md:px-12 mt-10">
        <ul className="space-y-4 flex flex-col items-start max-w-4xl mx-auto">

          {displayRules.map((rule, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 + 0.3 }}
              className="flex items-start gap-4"
            >
              {/* Perfectly sized grey circle with dark number */}
              <span className="flex-shrink-0 w-[32px] h-[32px] rounded-full bg-[#d9d9d9] text-[#120524] flex items-center justify-center font-bold text-lg font-sans mt-1">
                {index + 1}
              </span>
              {/* Exactly 28px Grey Text */}
              <span className="text-[28px] leading-none pt-1 font-sugo uppercase text-[#d9d9d9] tracking-wider">
                {rule.replace(/^[\s-]+/, '')}
              </span>
            </motion.li>
          ))}

        </ul>
      </div>

      {/* --- Action Button --- */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        onClick={onContinue}
        // Swapped fixed width/height for dynamic padding (px-10 py-2) to shrink the background
        className="bg-[#adbbff] text-[#120524] font-bungee text-[32px] md:text-[40px] px-10 py-2 rounded-lg hover:scale-105 transition-transform uppercase flex items-center justify-center mt-auto mb-[8vh] shadow-[0_0_20px_rgba(173,187,255,0.2)]"
      >
        Let's Play
      </motion.button>

    </motion.div>
  );
}