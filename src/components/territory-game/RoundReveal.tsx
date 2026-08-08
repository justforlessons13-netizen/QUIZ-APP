import { motion } from 'framer-motion';
import { Skull, Flag, ChevronRight } from 'lucide-react';
import { TerritoryPlayer, TerritoryMapDef } from '@/types/territory';
import { TerritoryMapView, PLAYER_COLORS } from './TerritoryMapView';
import { TerritoryScoreBar } from './TerritoryScoreBar';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

interface RoundRevealProps {
  isCapturePhase: boolean;
  round: number;
  players: TerritoryPlayer[];
  map: TerritoryMapDef;
  lastCaptures: Record<string, string>;
  lastDefenders?: Record<string, string>;
  lastIncome?: Record<string, number>;
  eliminatedThisRound: string[];
  onContinue: () => void;
}

export function RoundReveal({
  isCapturePhase, round, players, map, lastCaptures, lastDefenders = {}, lastIncome = {}, eliminatedThisRound, onContinue,
}: RoundRevealProps) {
  const playerIndex = (id: string) => players.findIndex((p) => p.id === id);
  const attackEvents = !isCapturePhase
    ? Object.entries(lastCaptures)
      .filter(([attackerId]) => lastDefenders[attackerId])
      .map(([attackerId, nodeId]) => ({
        attacker: players.find((p) => p.id === attackerId)!,
        defender: players.find((p) => p.id === lastDefenders[attackerId])!,
        territoryName: map.nodes.find((n) => n.id === nodeId)?.name ?? '',
      }))
      .filter((e) => e.attacker && e.defender)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full flex-1 flex flex-col items-center px-6 py-6 gap-5"
    >
      <h1 className="font-bungee text-white uppercase text-xl tracking-wide">
        {isCapturePhase ? 'Bases Claimed!' : `Round ${round} Results`}
      </h1>

      {/* Versus-style banners for territory taken from an opponent — mirrors the reference's
          attacker/defender chevron bar, shown here (post-resolution) since captures in this
          game are decided by a simultaneous broadcast question, not a pre-declared 1v1 duel. */}
      {attackEvents.length > 0 && (
        <div className="w-full max-w-md flex flex-col gap-2">
          {attackEvents.map((e, i) => {
            const attackerColor = PLAYER_COLORS[playerIndex(e.attacker.id) % PLAYER_COLORS.length];
            const defenderColor = PLAYER_COLORS[playerIndex(e.defender.id) % PLAYER_COLORS.length];
            return (
              <div
                key={i}
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-2"
                style={{ background: 'rgba(0,0,0,.35)', border: '1px solid rgba(255,255,255,.12)' }}
              >
                <span className="font-bungee text-xs uppercase" style={{ color: attackerColor }}>{e.attacker.name}</span>
                <ChevronRight className="w-4 h-4 text-white/50" />
                <span className="font-bungee text-xs uppercase" style={{ color: defenderColor }}>{e.defender.name}</span>
                <span className="text-white/50 text-xs">— took {e.territoryName}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="w-full max-w-md flex flex-col gap-2.5">
        {players.map((p, i) => {
          const capturedId = lastCaptures[p.id];
          const capturedName = capturedId ? map.nodes.find((n) => n.id === capturedId)?.name : null;
          const eliminated = eliminatedThisRound.includes(p.id);
          const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
          const income = lastIncome[p.id];
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: p.eliminated ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.05)',
                border: `1px solid ${p.eliminated ? 'rgba(255,255,255,.08)' : alpha(color, 0.35)}`,
                opacity: p.eliminated ? 0.55 : 1,
              }}
            >
              <Emoji3D emoji={p.emoji} className="w-7 h-7" />
              <span className="flex-1 font-semibold text-white text-sm truncate">{p.name}</span>
              {isCapturePhase ? (
                capturedName ? (
                  <span className="text-xs font-bungee uppercase" style={{ color }}>Base: {capturedName}</span>
                ) : (
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>No base</span>
                )
              ) : eliminated ? (
                <span className="flex items-center gap-1 text-xs font-bungee uppercase" style={{ color: 'oklch(65% 0.2 25)' }}>
                  <Skull className="w-3.5 h-3.5" /> Eliminated
                </span>
              ) : capturedName ? (
                <span className="flex items-center gap-1 text-xs font-bungee uppercase" style={{ color }}>
                  <Flag className="w-3.5 h-3.5" /> {capturedName}
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>No capture</span>
              )}
              {!!income && (
                <span className="text-xs font-bungee tabular-nums" style={{ color: '#e8b84b' }}>+{income}</span>
              )}
            </div>
          );
        })}
      </div>

      <TerritoryMapView map={map} players={players} lastCaptures={lastCaptures} size={260} />

      <TerritoryScoreBar players={players} />

      <button
        onClick={onContinue}
        className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4"
        style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
      >
        Continue ▶
      </button>
    </motion.div>
  );
}
