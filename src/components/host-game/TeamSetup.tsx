import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, X } from 'lucide-react';
import { LiveTeam } from '@/types/live-game';
import { QRCodeSVG } from 'qrcode.react';
import { Emoji3D } from '@/components/ui/Emoji3D';

interface TeamSetupProps {
  teams: LiveTeam[];
  onAddTeam: (name: string, emoji?: string) => void;
  onRemoveTeam: (id: string) => void;
  onStart: () => void;
  gameCode: string;
  projectorMode?: boolean;
}

export function TeamSetup({ teams, onAddTeam, onRemoveTeam, onStart, gameCode, projectorMode }: TeamSetupProps) {
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddTeam(name.trim()); // Let the hook assign a random unused emoji
    setName('');
  };

  const codeChars = gameCode.padEnd(4, ' ').split('');

  // Wait animation dots for projector
  const [dots, setDots] = useState('');
  useEffect(() => {
    if (!projectorMode) return;
    const i = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(i);
  }, [projectorMode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full mx-auto flex flex-col justify-center items-center py-10 px-4 ${projectorMode ? 'max-w-[1200px]' : 'max-w-5xl'}`}
    >
      <div className="w-full flex flex-col pt-8">
        <div className={`grid items-start ${projectorMode ? 'grid-cols-[400px_1fr]' : 'grid-cols-[340px_1fr]'}`}>
          {/* Left Column */}
          <div className="px-8 border-r border-[#adbbff]/10 flex flex-col items-center justify-start gap-5 pt-4">
            <div className="text-muted-foreground/80 text-[11px] tracking-[2px] uppercase font-sugo">
              Scan to join
            </div>
            
            <div className={`bg-white rounded-[16px] p-[10px] flex items-center justify-center shadow-[0_0_40px_rgba(173,187,255,0.15)] ${projectorMode ? 'w-[220px] h-[220px]' : 'w-[160px] h-[160px]'}`}>
              <QRCodeSVG
                value={`${window.location.origin}/join?code=${gameCode}`}
                size={projectorMode ? 200 : 140}
                className="opacity-95"
              />
            </div>
            
            <div className="text-muted-foreground/60 text-[10px] tracking-[2px] mt-3 uppercase font-sugo">
              — or type the code —
            </div>
            
            <div className="flex gap-2.5">
              {codeChars.map((char, i) => (
                <div key={i} className={`bg-card/40 border-2 border-primary/40 rounded-xl flex items-center justify-center font-black text-primary font-mono shadow-[0_0_15px_hsla(185,90%,50%,0.3)] w-[52px] h-[60px] text-[28px]`}>
                  {char}
                </div>
              ))}
            </div>
            
            <div className="text-muted-foreground/50 text-[11px] mt-2 font-mono tracking-widest">
              {window.location.host}/join
            </div>
          </div>

          {/* Right Column */}
          <div className={`px-8 flex flex-col justify-start ${projectorMode ? 'gap-8 pt-4' : 'gap-6 pt-4'}`}>
            <div className="flex items-center justify-start gap-4">
              <div className={`text-[#adbbff]/80 text-[11px] tracking-[2px] uppercase flex items-center gap-2 font-sugo ${projectorMode ? 'text-sm' : ''}`}>
                <Users className={`text-primary ${projectorMode ? 'w-5 h-5' : 'w-4 h-4'}`} />
                {projectorMode ? 'Teams joined' : 'Teams in lobby'}
              </div>
              
              {projectorMode && teams.length > 0 && (
                <div className="bg-primary/20 text-primary font-bungee text-[11px] px-2 py-0.5 rounded border border-primary/30 leading-none flex items-center h-[20px]">
                  {teams.length}
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-[#ff5050]/15 border border-[#ff5050]/20 rounded-full px-2 py-1 h-[20px] text-[9px] text-[#ff7070] font-bold tracking-[1.5px] uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff4444] animate-blinkSlow shadow-[0_0_8px_#ff4444]" />
                LIVE
              </div>
            </div>

            <div className="flex flex-wrap gap-3 overflow-y-auto max-h-[360px] content-start flex-1 no-scrollbar pb-4 pr-2">
              <AnimatePresence>
                {teams.map((team, i) => (
                  <motion.div
                    key={team.id}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.3, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className={`bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 relative shadow-xl ${projectorMode ? 'w-[84px] py-3 px-1' : 'w-[68px] py-2 px-1'}`}
                  >
                    <div 
                      className={`leading-none animate-bob ${projectorMode ? 'text-[46px]' : 'text-[38px]'}`}
                      style={{ animationDelay: `${(i % 5) * 0.35}s` }}
                    >
                      <Emoji3D emoji={team.emoji} />
                    </div>
                    <div className={`text-muted-foreground/80 text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap tracking-widest uppercase font-sugo ${projectorMode ? 'text-[11px]' : 'text-[9px]'}`}>
                      {team.name}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {!projectorMode && (
              <div className="mt-auto flex flex-col gap-3">
                <div className="text-muted-foreground/50 text-[10px] uppercase tracking-[2px] font-sugo pl-1">
                  {teams.length} {teams.length === 1 ? 'team' : 'teams'} waiting
                </div>

                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Team name..."
                    className="flex-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl py-3.5 px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors font-sugo tracking-wider"
                  />
                  <button 
                    onClick={handleAdd}
                    disabled={!name.trim()}
                    className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl w-[50px] h-[50px] text-[#adbbff] text-2xl flex items-center justify-center font-bold shrink-0 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start Button / Waiting Message row below columns */}
      <div className="w-full flex justify-center mt-12 mb-8">
        {!projectorMode ? (
          <button
            onClick={onStart}
            disabled={teams.length < 2}
            className="relative w-full max-w-[320px] bg-transparent border-2 border-primary rounded-xl py-3 px-6 text-primary text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 animate-borderPulse disabled:opacity-50 disabled:animate-none hover:bg-primary/10 transition-colors shadow-2xl mx-auto"
            style={teams.length < 2 ? { boxShadow: 'none', borderColor: 'rgba(173,187,255,0.2)' } : undefined}
          >
            <Play className={`w-5 h-5 fill-current ${teams.length >= 2 ? 'animate-iconPop' : ''}`} />
            Start Game
          </button>
        ) : (
          <div className="text-primary/80 font-sugo uppercase tracking-[4px] text-2xl flex items-center gap-4">
             <span className="w-12 text-right font-mono tracking-widest">{dots}</span>
             Waiting for host to start
             <span className="w-12 text-left font-mono tracking-widest">{dots}</span>
          </div>
        )}
      </div>

    </motion.div>
  );
}