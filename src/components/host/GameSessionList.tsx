import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Trash2, Users, ChevronRight, Trophy, X } from 'lucide-react';
import { GameSession } from '@/types/host';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

interface LiveSession extends GameSession {
  teams?: { id: string; name: string; emoji: string; score: number }[];
  phase?: string;
}

interface GameSessionListProps {
  sessions: LiveSession[];
  onDelete: (id: string) => void;
}

const STATUS_CONFIG = {
  waiting: { label: 'Waiting', dot: 'oklch(75% 0.15 80)', badgeBg: 'oklch(75% 0.15 80 / .15)', badgeColor: 'oklch(45% 0.15 80)' },
  active: { label: 'Live', dot: 'oklch(70% 0.15 150)', badgeBg: 'oklch(70% 0.15 150 / .15)', badgeColor: 'oklch(40% 0.15 150)' },
  finished: { label: 'Finished', dot: 'oklch(75% 0.01 195)', badgeBg: 'oklch(90% 0.01 195)', badgeColor: 'oklch(45% 0.02 195)' },
};

function StandingsModal({ session, onClose }: { session: LiveSession; onClose: () => void }) {
  const sorted = [...(session.teams ?? [])].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(20,25,30,.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative px-6 pt-6 pb-4" style={{ borderBottom: '1px solid oklch(88% 0.015 195)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: alpha(theme.color1, 0.12), border: `1px solid ${alpha(theme.color1, 0.25)}` }}>
              <Trophy className="w-4 h-4" style={{ color: theme.color1 }} />
            </div>
            <div>
              <h3 className="font-bungee text-sm tracking-wider uppercase" style={{ color: 'oklch(20% 0.02 195)' }}>Final Standings</h3>
              <p className="text-xs tracking-wider mt-0.5 uppercase" style={{ color: 'oklch(55% 0.02 195)' }}>{session.packName}</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-5 right-5 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors">
            <X className="w-3.5 h-3.5" style={{ color: 'oklch(50% 0.02 195)' }} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {sorted.length === 0 ? (
            <p className="text-center uppercase tracking-widest text-sm py-6" style={{ color: 'oklch(70% 0.01 195)' }}>No teams recorded</p>
          ) : (
            sorted.map((team, i) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: i === 0 ? alpha(theme.color1, 0.08) : 'oklch(97% 0.005 195)', border: `1px solid ${i === 0 ? alpha(theme.color1, 0.2) : 'oklch(90% 0.01 195)'}` }}
              >
                <span className="text-lg w-6 text-center leading-none">
                  {medals[i] ?? <span className="font-bungee text-xs" style={{ color: 'oklch(60% 0.02 195)' }}>{i + 1}</span>}
                </span>
                <Emoji3D emoji={team.emoji} className="w-6 h-6" />
                <span className="flex-1 uppercase tracking-wider text-sm truncate" style={{ color: i === 0 ? theme.color1 : 'oklch(35% 0.02 195)' }}>{team.name}</span>
                <span className="font-bungee tabular-nums text-sm" style={{ color: i === 0 ? theme.color1 : 'oklch(50% 0.02 195)' }}>{team.score}</span>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function GameSessionList({ sessions, onDelete }: GameSessionListProps) {
  const navigate = useNavigate();
  const [standingsFor, setStandingsFor] = useState<LiveSession | null>(null);

  if (sessions.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'oklch(94% 0.01 195)', border: '1px solid oklch(88% 0.015 195)' }}>
          <Radio className="w-6 h-6" style={{ color: 'oklch(75% 0.01 195)' }} />
        </div>
        <h3 className="text-base font-bungee uppercase tracking-wider" style={{ color: 'oklch(55% 0.02 195)' }}>No sessions yet</h3>
        <p className="text-sm uppercase tracking-widest mt-1.5" style={{ color: 'oklch(70% 0.01 195)' }}>Start a game from a question pack</p>
      </motion.div>
    );
  }

  const groups = [
    { label: 'Live & Waiting', color: 'oklch(40% 0.15 150)', items: sessions.filter(s => s.status !== 'finished') },
    { label: 'Finished', color: 'oklch(50% 0.02 195)', items: sessions.filter(s => s.status === 'finished') },
  ].filter(g => g.items.length > 0);

  return (
    <>
      <div className="flex flex-col gap-6">
        {groups.map(group => (
          <div key={group.label} className="flex flex-col gap-2">
            <div className="font-bungee text-[10px] uppercase tracking-wide" style={{ color: group.color }}>{group.label}</div>
            <div className="flex flex-col gap-2">
              {group.items.map((session, i) => {
                const cfg = STATUS_CONFIG[session.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.waiting;
                const isActive = session.status === 'active' || session.status === 'waiting';
                const isFinished = session.status === 'finished';
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group flex items-center gap-3 rounded-xl px-4 py-3 bg-white hover:shadow-sm transition-shadow"
                    style={{ border: '1px solid oklch(88% 0.015 195)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                    <span className="font-bungee text-[12px] uppercase tracking-wide truncate flex-1 min-w-0" style={{ color: 'oklch(20% 0.02 195)' }}>
                      {session.packName}
                    </span>
                    <span className="font-bungee text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: cfg.badgeBg, color: cfg.badgeColor }}>
                      {cfg.label}
                    </span>
                    <span className="text-[11px] flex-shrink-0 hidden sm:inline" style={{ color: 'oklch(50% 0.02 195)' }}>
                      {session.teamCount ?? 0} teams · R{session.currentRound ?? 1}/6
                    </span>
                    {session.teams && session.teams.length > 0 && (
                      <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                        {session.teams.slice(0, 4).map(team => (
                          <div key={team.id} title={`${team.name} — ${team.score} pts`} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'oklch(94% 0.01 195)' }}>
                            <Emoji3D emoji={team.emoji} className="w-3.5 h-3.5" />
                          </div>
                        ))}
                        {session.teams.length > 4 && (
                          <span className="text-[10px]" style={{ color: 'oklch(60% 0.02 195)' }}>+{session.teams.length - 4}</span>
                        )}
                      </div>
                    )}
                    <span className="text-[11px] flex-shrink-0" style={{ color: 'oklch(55% 0.02 195)' }}>
                      {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isActive && (
                        <button
                          onClick={() => navigate(`/host/game?session=${session.id}&pack=${session.packId}`)}
                          className="font-bungee uppercase text-[9px] px-3 py-1.5 rounded-lg flex items-center hover:brightness-110 transition-[filter]"
                          style={{ background: theme.color1, color: theme.onColor1 }}
                        >
                          Rejoin <ChevronRight className="w-3 h-3 ml-0.5" />
                        </button>
                      )}
                      {isFinished && session.teams && session.teams.length > 0 && (
                        <button
                          onClick={() => setStandingsFor(session)}
                          className="font-bungee uppercase text-[9px] px-3 py-1.5 rounded-lg flex items-center"
                          style={{ border: '1px solid oklch(85% 0.01 195)', color: 'oklch(35% 0.02 195)' }}
                        >
                          <Trophy className="w-3 h-3 mr-1" /> Standings
                        </button>
                      )}
                      {isFinished && (
                        <button
                          onClick={() => navigate(`/host/game?session=${session.id}&pack=${session.packId}`)}
                          className="font-bungee uppercase text-[9px] px-3 py-1.5 rounded-lg"
                          style={{ border: '1px solid oklch(85% 0.01 195)', color: 'oklch(50% 0.02 195)' }}
                        >
                          Replay
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(session.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: 'oklch(60% 0.18 25)' }} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {standingsFor && <StandingsModal session={standingsFor} onClose={() => setStandingsFor(null)} />}
      </AnimatePresence>
    </>
  );
}
