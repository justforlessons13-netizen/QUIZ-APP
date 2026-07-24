import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, Smartphone } from 'lucide-react';
import { LiveTeam } from '@/types/live-game';
import { QRCodeSVG } from 'qrcode.react';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

interface TeamSetupProps {
  teams: LiveTeam[];
  onAddTeam: (name: string, emoji?: string) => void;
  onRemoveTeam: (id: string) => void;
  onStart: () => void;
  gameCode: string;
  projectorMode?: boolean;
  sessionId: string;
  packId?: string;
}

export function TeamSetup({ teams, onAddTeam, onRemoveTeam, onStart, gameCode, projectorMode, sessionId, packId }: TeamSetupProps) {
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
      className="w-full flex flex-col justify-center items-center py-10 px-6 md:px-12"
    >
      <div className="w-full flex flex-col pt-8">
        <div className={`grid items-start ${projectorMode ? 'grid-cols-[400px_1fr]' : 'grid-cols-[280px_1fr]'}`}>
          {/* Left Column */}
          <div className="px-8 border-r border-white/10 flex flex-col items-center justify-start gap-5 pt-4">
            {projectorMode ? (
              <>
                <div className="text-muted-foreground/80 text-[11px] tracking-[2px] uppercase">
                  Scan to join
                </div>

                <div
                  className="bg-white rounded-[16px] p-[10px] flex items-center justify-center w-[220px] h-[220px]"
                  style={{ boxShadow: `0 0 40px ${alpha(theme.color1, 0.15)}` }}
                >
                  <QRCodeSVG
                    value={`${window.location.origin}/join?code=${gameCode}`}
                    size={200}
                    className="opacity-95"
                  />
                </div>

                <div className="text-muted-foreground/60 text-[10px] tracking-[2px] mt-3 uppercase">
                  — or type the code —
                </div>

                <div className="flex gap-2.5">
                  {codeChars.map((char, i) => (
                    <div
                      key={i}
                      className="bg-card/40 border-2 rounded-xl flex items-center justify-center font-black font-mono w-[52px] h-[60px] text-[28px]"
                      style={{ borderColor: alpha(theme.color1, 0.4), color: theme.color1, boxShadow: `0 0 15px ${alpha(theme.color1, 0.3)}` }}
                    >
                      {char}
                    </div>
                  ))}
                </div>

                <div className="text-muted-foreground/50 text-[11px] mt-2 font-mono tracking-widest">
                  {window.location.host}/join
                </div>
              </>
            ) : (
              <>
                <div className="text-muted-foreground/80 text-[11px] tracking-[2px] uppercase flex items-center gap-2">
                  <Smartphone className="w-4 h-4" style={{ color: theme.color1 }} />
                  Remote control
                </div>

                <div
                  className="bg-white rounded-[16px] p-[10px] flex items-center justify-center w-[160px] h-[160px]"
                  style={{ boxShadow: `0 0 40px ${alpha(theme.color1, 0.15)}` }}
                >
                  <QRCodeSVG
                    value={`${window.location.origin}/host/game?session=${sessionId}&pack=${packId || ''}&remote=true`}
                    size={140}
                    className="opacity-95"
                  />
                </div>

                <div className="text-muted-foreground/50 text-[10px] tracking-[2px] mt-2 uppercase text-center max-w-[180px]">
                  Scan to drive this screen from your phone
                </div>
              </>
            )}
          </div>

          {/* Right Column */}
          <div className={`px-8 flex flex-col justify-start ${projectorMode ? 'gap-8 pt-4' : 'gap-6 pt-4'}`}>
            <div className="flex items-center justify-start gap-4">
              <div
                className={`text-[11px] tracking-[2px] uppercase flex items-center gap-2 ${projectorMode ? 'text-sm' : ''}`}
                style={{ color: alpha(theme.color1, 0.8) }}
              >
                <Users className={projectorMode ? 'w-5 h-5' : 'w-4 h-4'} style={{ color: theme.color1 }} />
                {projectorMode ? 'Teams joined' : 'Teams in lobby'}
              </div>

              <div
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-md leading-none flex items-center h-[20px]"
                style={{ background: alpha(theme.color1, 0.13), color: theme.color1 }}
              >
                {teams.length}
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
                    <div className={`text-muted-foreground/80 text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap tracking-widest uppercase ${projectorMode ? 'text-[11px]' : 'text-[9px]'}`}>
                      {team.name}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {!projectorMode && (
              <div className="mt-auto flex flex-col gap-3">
                <div className="text-muted-foreground/50 text-[10px] uppercase tracking-[2px] pl-1">
                  {teams.length} {teams.length === 1 ? 'team' : 'teams'} waiting
                </div>

                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Team name..."
                    className="flex-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl py-3.5 px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-colors tracking-wider"
                    onFocus={(e) => (e.currentTarget.style.borderColor = alpha(theme.color1, 0.5))}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '')}
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!name.trim()}
                    className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl w-[50px] h-[50px] text-2xl flex items-center justify-center font-bold shrink-0 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: theme.color1 }}
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
            className="relative w-full max-w-[320px] bg-transparent border-2 rounded-xl py-3 px-6 text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 animate-borderPulse disabled:opacity-50 disabled:animate-none transition-colors shadow-2xl mx-auto"
            style={{
              color: theme.color1,
              borderColor: teams.length < 2 ? alpha(theme.color1, 0.2) : theme.color1,
              boxShadow: teams.length < 2 ? 'none' : undefined,
            }}
            onMouseEnter={(e) => teams.length >= 2 && (e.currentTarget.style.background = alpha(theme.color1, 0.1))}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Play className={`w-5 h-5 fill-current ${teams.length >= 2 ? 'animate-iconPop' : ''}`} />
            Start Game
          </button>
        ) : (
          <div className="font-sugo uppercase tracking-[4px] text-2xl flex items-center gap-4" style={{ color: alpha(theme.color1, 0.8) }}>
             <span className="w-12 text-right font-mono tracking-widest">{dots}</span>
             Waiting for host to start
             <span className="w-12 text-left font-mono tracking-widest">{dots}</span>
          </div>
        )}
      </div>

    </motion.div>
  );
}
