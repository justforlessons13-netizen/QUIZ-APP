import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Trash2, Users, ChevronRight, Trophy, X } from 'lucide-react';
import { LiveBeeSession } from '@/hooks/useBeeSessions';
import { BeePlayer, compareBeePlayers } from '@/types/bee';

const GOLD = 'oklch(80% 0.16 92)';
const ON_GOLD = 'oklch(30% 0.03 60)';

interface BeeSessionListProps {
  sessions: LiveBeeSession[];
  onDelete: (id: string) => void;
}

const STATUS_CONFIG = {
  waiting: { label: 'Waiting', dot: 'oklch(75% 0.15 80)', badgeBg: 'oklch(75% 0.15 80 / .15)', badgeColor: 'oklch(75% 0.15 80)' },
  active: { label: 'Live', dot: 'oklch(70% 0.15 145)', badgeBg: 'oklch(70% 0.15 145 / .15)', badgeColor: 'oklch(70% 0.15 145)' },
  finished: { label: 'Finished', dot: 'rgba(255,255,255,.3)', badgeBg: 'rgba(255,255,255,.08)', badgeColor: 'rgba(255,255,255,.5)' },
};

function StandingsModal({ session, onClose }: { session: LiveBeeSession; onClose: () => void }) {
  const sorted = [...(session.players ?? [])].sort((a, b) => compareBeePlayers(a as BeePlayer, b as BeePlayer));
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'oklch(16% 0.02 70)', border: `1px solid ${GOLD}26` }}
        onClick={e => e.stopPropagation()}>
        <div className="relative px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}1a`, border: `1px solid ${GOLD}33` }}>
              <Trophy className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div>
              <h3 className="font-bungee text-white text-sm tracking-wider uppercase">Final Standings</h3>
              <p className="text-xs tracking-wider mt-0.5 uppercase" style={{ color: 'rgba(255,255,255,.4)' }}>{session.packName}</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-5 right-5 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {sorted.length === 0 ? (
            <p className="text-center text-white/30 uppercase tracking-widest text-sm py-6">No spellers recorded</p>
          ) : (
            sorted.map((player, i) => (
              <motion.div key={player.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
                style={{ background: i === 0 ? `${GOLD}14` : 'rgba(255,255,255,.03)', borderColor: i === 0 ? `${GOLD}33` : 'rgba(255,255,255,.06)' }}>
                <span className="text-lg w-6 text-center leading-none">
                  {medals[i] ?? <span className="text-white/30 font-bungee text-xs">{i + 1}</span>}
                </span>
                <span className="flex-1 uppercase tracking-wider text-sm truncate" style={{ color: i === 0 ? GOLD : 'rgba(255,255,255,.7)' }}>{player.name}</span>
                <span className={`font-bungee tabular-nums text-[10px] uppercase tracking-wider ${player.status === 'eliminated' ? 'text-white/30' : 'text-emerald-400'}`}>
                  {player.status === 'eliminated' ? 'Out' : 'Survived'}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function BeeSessionList({ sessions, onDelete }: BeeSessionListProps) {
  const navigate = useNavigate();
  const [standingsFor, setStandingsFor] = useState<LiveBeeSession | null>(null);

  if (sessions.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
          <Radio className="w-6 h-6 text-white/20" />
        </div>
        <h3 className="text-base font-bungee uppercase tracking-wider text-white/40">No sessions yet</h3>
        <p className="text-sm text-white/25 uppercase tracking-widest mt-1.5">Start a bee from a word pack</p>
      </motion.div>
    );
  }

  const groups = [
    { label: 'Live & Waiting', color: 'oklch(70% 0.15 145)', items: sessions.filter(s => s.status !== 'finished') },
    { label: 'Finished', color: 'rgba(255,255,255,.5)', items: sessions.filter(s => s.status === 'finished') },
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
                    className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                    style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                    <span className="font-bungee text-[12px] uppercase tracking-wide truncate flex-1 min-w-0 text-white">
                      {session.packName}
                    </span>
                    <span className="font-bungee text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: cfg.badgeBg, color: cfg.badgeColor }}>
                      {cfg.label}
                    </span>
                    <span className="text-[11px] flex-shrink-0 hidden sm:inline" style={{ color: 'rgba(255,255,255,.5)' }}>
                      {session.playerCount ?? 0} spellers
                    </span>
                    <span className="text-[11px] flex-shrink-0" style={{ color: 'rgba(255,255,255,.4)' }}>
                      {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isActive && (
                        <button
                          onClick={() => navigate(`/bee/game?session=${session.id}&pack=${session.packId}`)}
                          className="font-bungee uppercase text-[9px] px-3 py-1.5 rounded-lg flex items-center hover:brightness-110 transition-[filter]"
                          style={{ background: GOLD, color: ON_GOLD }}
                        >
                          Rejoin <ChevronRight className="w-3 h-3 ml-0.5" />
                        </button>
                      )}
                      {isFinished && session.players && session.players.length > 0 && (
                        <button
                          onClick={() => setStandingsFor(session)}
                          className="font-bungee uppercase text-[9px] px-3 py-1.5 rounded-lg flex items-center text-white"
                          style={{ border: '1px solid rgba(255,255,255,.15)' }}
                        >
                          <Trophy className="w-3 h-3 mr-1" /> Standings
                        </button>
                      )}
                      {isFinished && (
                        <button
                          onClick={() => navigate(`/bee/game?session=${session.id}&pack=${session.packId}`)}
                          className="font-bungee uppercase text-[9px] px-3 py-1.5 rounded-lg"
                          style={{ border: '1px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.5)' }}
                        >
                          Replay
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(session.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: 'oklch(65% 0.2 25)' }} />
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
