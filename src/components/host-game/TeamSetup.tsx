import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, X } from 'lucide-react';
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
  packName?: string;
}

export function TeamSetup({ teams, onAddTeam, onRemoveTeam, onStart, gameCode, projectorMode, sessionId, packId, packName }: TeamSetupProps) {
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddTeam(name.trim()); // Let the hook assign a random unused emoji
    setName('');
  };

  const codeChars = gameCode.padEnd(4, ' ').split('');

  if (projectorMode) {
    return (
      <div
        className="absolute inset-0 flex flex-col"
        style={{ background: `radial-gradient(ellipse at 50% 0%, color-mix(in oklch, ${theme.color1} 22%, oklch(20% 0.04 195)) 0%, oklch(14% 0.03 195) 65%)` }}
      >
        {/* Team count badge, top-left */}
        <div
          className="absolute top-5 left-6 flex items-center gap-1.5 rounded-lg px-3 py-1.5"
          style={{ background: 'oklch(94% 0.01 195 / .12)', border: '1px solid oklch(94% 0.01 195 / .2)' }}
        >
          <Users className="w-3.5 h-3.5 text-white" />
          <span className="text-[13px] font-bold text-white">{teams.length}</span>
        </div>

        {/* Join card */}
        <div className="flex justify-center pt-[26px] pb-2">
          <div className="flex items-stretch bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 12px 40px rgba(0,0,0,.35)' }}>
            <div
              className="px-[22px] py-3.5 flex flex-col justify-center gap-0.5"
              style={{ borderRight: '2px solid oklch(20% 0.02 195 / .12)' }}
            >
              <span className="text-[11px]" style={{ color: 'oklch(30% 0.02 195)' }}>
                Join at <strong>{window.location.host}/join</strong>
              </span>
              <span className="text-[11px]" style={{ color: 'oklch(30% 0.02 195)' }}>
                or with the <strong>PlayHub</strong> app
              </span>
            </div>
            <div className="px-[22px] py-2.5 flex flex-col items-center justify-center gap-0.5">
              <span className="text-[10px] tracking-[.08em] uppercase font-bold" style={{ color: 'oklch(45% 0.02 195)' }}>
                Game PIN
              </span>
              <div className="flex gap-1.5 font-mono font-extrabold text-[26px] tracking-[.05em]" style={{ color: 'oklch(15% 0.02 195)' }}>
                {codeChars.map((c, i) => (
                  <span key={i}>{c}</span>
                ))}
              </div>
            </div>
            <div className="p-2.5 flex items-center" style={{ borderLeft: '2px solid oklch(20% 0.02 195 / .12)' }}>
              <QRCodeSVG value={`${window.location.origin}/join?code=${gameCode}`} size={64} />
            </div>
          </div>
        </div>

        {packName && (
          <div
            className="font-bungee text-[22px] tracking-[.05em] uppercase text-center"
            style={{ color: theme.color1, marginTop: '10px', marginBottom: '20px' }}
          >
            {packName}
          </div>
        )}

        {/* Team pills */}
        <div className="flex-1 flex flex-wrap content-start justify-center gap-3.5 px-[60px] py-2.5 overflow-auto">
          <AnimatePresence>
            {teams.map((team, i) => (
              <motion.div
                key={team.id}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="flex items-center gap-2.5 rounded-xl px-[18px] py-2.5"
                style={{ background: 'oklch(94% 0.01 195 / .1)', border: '1px solid oklch(94% 0.01 195 / .15)' }}
              >
                <span className="text-[26px] leading-none animate-bob" style={{ animationDelay: `${i * 100}ms` }}>
                  <Emoji3D emoji={team.emoji} />
                </span>
                <span className="text-sm font-bold text-white">{team.name}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Waiting pill */}
        <div className="flex justify-center pb-10">
          <div
            className="waiting-glow flex items-center gap-1.5 bg-white rounded-lg px-[22px] py-2.5"
            style={{ ['--glow-color' as string]: theme.color1 } as React.CSSProperties}
          >
            <span className="text-sm font-bold" style={{ color: 'oklch(20% 0.02 195)' }}>
              Waiting for players
            </span>
            <span className="flex gap-0.5">
              <span className="wdot w-1 h-1 rounded-full inline-block" style={{ background: 'oklch(20% 0.02 195)' }} />
              <span className="wdot w-1 h-1 rounded-full inline-block" style={{ background: 'oklch(20% 0.02 195)' }} />
              <span className="wdot w-1 h-1 rounded-full inline-block" style={{ background: 'oklch(20% 0.02 195)' }} />
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex-1 flex flex-col items-center pt-8 pb-4 px-6 md:px-12"
    >
      <div className="w-full flex-1 flex flex-col pt-8 min-h-0">
        <div className="grid grid-cols-[280px_1fr] flex-1">
          {/* Left Column */}
          <div className="px-8 border-r border-white/10 flex flex-col items-center justify-start gap-5 pt-4">
            <div className="text-muted-foreground/80 text-[11px] tracking-[2px] uppercase flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="20" rx="4"></rect><circle cx="12" cy="7" r="1.2" fill="currentColor" stroke="none"></circle><line x1="12" y1="12" x2="12" y2="16"></line></svg>
              Remote control
            </div>

            <div
              className="bg-white rounded-[14px] p-[10px] flex items-center justify-center w-[150px] h-[150px]"
              style={{ boxShadow: `0 0 40px ${alpha(theme.color1, 0.15)}` }}
            >
              <QRCodeSVG
                value={`${window.location.origin}/host/game?session=${sessionId}&pack=${packId || ''}&remote=true`}
                size={130}
                className="opacity-95"
              />
            </div>

            <div className="text-muted-foreground/50 text-[10px] tracking-[2px] mt-2 uppercase text-center max-w-[180px]">
              Scan to drive this screen from your phone
            </div>
          </div>

          {/* Right Column */}
          <div className="px-8 flex flex-col justify-start gap-6 pt-4">
            <div className="flex items-center justify-start gap-4">
              <div className="text-muted-foreground/80 text-[11px] tracking-[2px] uppercase flex items-center gap-2">
                <Users className="w-4 h-4" />
                Teams in lobby
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
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="group bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 relative shadow-xl w-[76px] py-3 px-1.5"
                  >
                    <button
                      onClick={() => onRemoveTeam(team.id)}
                      title={`Remove ${team.name}`}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/70 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-red-500/80 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div
                      className="leading-none animate-bob text-[30px]"
                      style={{ animationDelay: `${(i % 5) * 0.35}s` }}
                    >
                      <Emoji3D emoji={team.emoji} />
                    </div>
                    <div className="text-muted-foreground/80 text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap tracking-widest uppercase text-[9px]">
                      {team.name}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-auto flex flex-col gap-3 max-w-[420px] w-full">
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
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="w-full flex justify-center pt-3.5 pb-5">
        <button
          onClick={onStart}
          disabled={teams.length < 2}
          className="relative min-w-[260px] bg-transparent border-2 rounded-xl py-3 px-6 text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 disabled:opacity-50 transition-colors"
          style={{
            color: theme.color1,
            borderColor: teams.length < 2 ? alpha(theme.color1, 0.2) : theme.color1,
          }}
          onMouseEnter={(e) => teams.length >= 2 && (e.currentTarget.style.background = alpha(theme.color1, 0.1))}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Play className="w-5 h-5 fill-current" />
          Start Game
        </button>
      </div>
    </motion.div>
  );
}
