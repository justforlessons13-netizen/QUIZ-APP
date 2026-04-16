import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LiveTeam } from '@/types/live-game';
import { Emoji3D } from '@/components/ui/Emoji3D';

interface FinalStandingsDisplayProps {
  teams: LiveTeam[];
  projectorMode?: boolean;
  onFinish: () => void;
}

export function FinalStandingsDisplay({
  teams,
  projectorMode = false,
  onFinish
}: FinalStandingsDisplayProps) {
  const sorted = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie breaker checking rounds backward
    for (let i = b.roundScores.length - 1; i >= 0; i--) {
      const diff = (b.roundScores[i] || 0) - (a.roundScores[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex flex-col items-center w-full max-w-5xl mx-auto px-4 ${projectorMode ? 'gap-8' : 'gap-4'}`}
    >
      <h2 className={`font-bungee text-[#adbbff] uppercase tracking-wider text-glow-primary ${projectorMode ? 'text-5xl mb-4' : 'text-3xl mb-2'}`}>
        Final Standings
      </h2>

      <div className="w-full bg-card/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className={`bg-black/40 text-white/70 font-bungee ${projectorMode ? 'text-lg' : 'text-sm'}`}>
              <tr>
                <th className="py-4 px-6 text-center w-16">#</th>
                <th className="py-4 px-4 w-12"></th>
                <th className="py-4 px-4">Team</th>
                <th className="py-4 px-4 text-center">R1</th>
                <th className="py-4 px-4 text-center">R2</th>
                <th className="py-4 px-4 text-center">R3</th>
                <th className="py-4 px-4 text-center">R4</th>
                <th className="py-4 px-4 text-center">R5</th>
                <th className="py-4 px-4 text-center text-accent">R6</th>
                <th className="py-4 px-6 text-right text-[#adbbff]">Total</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-white/5 font-sugo tracking-wider ${projectorMode ? 'text-2xl' : 'text-base'}`}>
              {sorted.map((team, index) => (
                <motion.tr 
                  key={team.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-6 text-center font-bold text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Emoji3D emoji={team.emoji} className={projectorMode ? 'w-8 h-8' : 'w-6 h-6'} />
                  </td>
                  <td className="py-4 px-4 text-white font-bold max-w-[150px] md:max-w-[250px] truncate">
                    {team.name}
                  </td>
                  {[0, 1, 2, 3, 4, 5].map(rIdx => (
                    <td key={rIdx} className={`py-4 px-4 text-center tabular-nums ${rIdx === 5 ? 'text-accent border-l border-white/5' : 'text-white/80'}`}>
                      {team.roundScores[rIdx] ?? 0}
                    </td>
                  ))}
                  <td className="py-4 px-6 text-right font-bungee text-[#adbbff] tabular-nums bg-[#adbbff]/5 border-l border-[#adbbff]/20">
                    {team.score}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!projectorMode && (
        <Button 
          onClick={onFinish} 
          className="w-full max-w-sm py-6 h-auto text-lg font-bungee bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl mt-4 shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all"
        >
          Finish Game →
        </Button>
      )}
    </motion.div>
  );
}
