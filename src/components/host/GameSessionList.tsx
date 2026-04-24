import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Trash2, Users, ChevronRight, Trophy, X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameSession } from '@/types/host';
import { Emoji3D } from '@/components/ui/Emoji3D';

interface LiveSession extends GameSession {
  teams?: { id: string; name: string; emoji: string; score: number }[];
  phase?: string;
}

interface GameSessionListProps {
  sessions: LiveSession[];
  onDelete: (id: string) => void;
}

const STATUS_CONFIG = {
  waiting: {
    label: 'Waiting',
    dot: 'bg-amber-400',
    badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  },
  active: {
    label: 'Live',
    dot: 'bg-emerald-400 animate-pulse',
    badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  },
  finished: {
    label: 'Finished',
    dot: 'bg-white/30',
    badge: 'text-white/40 bg-white/5 border-white/10',
  },
};

function StandingsModal({
  session,
  onClose,
}: {
  session: LiveSession;
  onClose: () => void;
}) {
  const sorted = [...(session.teams ?? [])].sort((a, b) => b.score - a.score);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm bg-[#1a1830] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#adbbff]/10 border border-[#adbbff]/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[#adbbff]" />
            </div>
            <div>
              <h3 className="font-bungee text-white text-sm tracking-wider uppercase">Final Standings</h3>
              <p className="text-white/40 text-xs font-sugo tracking-wider mt-0.5 uppercase">{session.packName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        {/* Standings */}
        <div className="p-4 space-y-2">
          {sorted.length === 0 ? (
            <p className="text-center text-white/30 font-sugo uppercase tracking-widest text-sm py-6">
              No teams recorded
            </p>
          ) : (
            sorted.map((team, i) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  i === 0
                    ? 'bg-[#adbbff]/8 border-[#adbbff]/20'
                    : 'bg-white/3 border-white/6'
                }`}
              >
                <span className="text-lg w-6 text-center leading-none">
                  {medals[i] ?? <span className="text-white/30 font-bungee text-xs">{i + 1}</span>}
                </span>
                <Emoji3D emoji={team.emoji} className="w-6 h-6" />
                <span className={`flex-1 font-sugo uppercase tracking-wider text-sm truncate ${i === 0 ? 'text-[#adbbff]' : 'text-white/70'}`}>
                  {team.name}
                </span>
                <span className={`font-bungee tabular-nums text-sm ${i === 0 ? 'text-[#adbbff]' : 'text-white/50'}`}>
                  {team.score}
                </span>
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
          <Radio className="w-6 h-6 text-white/20" />
        </div>
        <h3 className="text-base font-bungee uppercase tracking-wider text-white/40">No sessions yet</h3>
        <p className="text-sm text-white/25 font-sugo uppercase tracking-widest mt-1.5">
          Start a game from a question pack
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sessions.map((session, i) => {
          const cfg = STATUS_CONFIG[session.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.waiting;
          const isActive = session.status === 'active' || session.status === 'waiting';
          const isFinished = session.status === 'finished';

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group relative rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/12 transition-all overflow-hidden"
            >
              {/* Active pulse bar */}
              {session.status === 'active' && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-400/80 to-emerald-500/0" />
              )}

              <div className="p-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <h3 className="font-bungee text-white text-sm uppercase tracking-wider truncate">
                        {session.packName}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bungee uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className="text-white/25 text-[11px] font-sugo uppercase tracking-widest">
                        {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDelete(session.id)}
                    className="w-7 h-7 rounded-lg bg-white/0 hover:bg-red-500/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400/60 hover:text-red-400" />
                  </button>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-white/50 text-xs font-sugo uppercase tracking-widest">
                      {session.teamCount ?? 0} teams
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/25 text-[10px] font-bungee">R</span>
                    <span className="text-white/50 text-xs font-sugo uppercase tracking-widest">
                      Round {session.currentRound ?? 1} / 6
                    </span>
                  </div>
                  {session.phase && (
                    <span className="text-white/25 text-[10px] font-sugo uppercase tracking-widest">
                      {session.phase.replace(/-/g, ' ')}
                    </span>
                  )}
                </div>

                {/* Team avatars */}
                {session.teams && session.teams.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                    {session.teams.slice(0, 8).map(team => (
                      <div
                        key={team.id}
                        title={`${team.name} — ${team.score} pts`}
                        className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center"
                      >
                        <Emoji3D emoji={team.emoji} className="w-4 h-4" />
                      </div>
                    ))}
                    {session.teams.length > 8 && (
                      <span className="text-white/25 text-[10px] font-sugo uppercase tracking-widest">
                        +{session.teams.length - 8}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {isActive && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/host/game?session=${session.id}&pack=${session.packId}`)}
                      className="flex-1 h-8 text-xs font-bungee uppercase tracking-wider bg-[#adbbff] hover:bg-[#c5ceff] text-[#120524] rounded-lg"
                    >
                      Rejoin
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                  {isFinished && session.teams && session.teams.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setStandingsFor(session)}
                      className="flex-1 h-8 text-xs font-bungee uppercase tracking-wider rounded-lg border border-white/10"
                    >
                      <Trophy className="w-3.5 h-3.5 mr-1.5" />
                      Standings
                    </Button>
                  )}
                  {isFinished && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/host/game?session=${session.id}&pack=${session.packId}`)}
                      variant="outline"
                      className="h-8 text-xs font-bungee uppercase tracking-wider rounded-lg border-white/10 text-white/50 hover:text-white"
                    >
                      Replay
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {standingsFor && (
          <StandingsModal
            session={standingsFor}
            onClose={() => setStandingsFor(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
