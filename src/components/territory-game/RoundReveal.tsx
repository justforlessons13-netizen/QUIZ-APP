import { motion } from 'framer-motion';
import { Flag } from 'lucide-react';
import { TerritoryPlayer, TerritoryMapDef, TerritoryRoundKind } from '@/types/territory';
import { TerritoryMapView, PLAYER_COLORS } from './TerritoryMapView';
import { TerritoryScoreBar } from './TerritoryScoreBar';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

interface RoundRevealProps {
  roundKind: TerritoryRoundKind; // only 'base-capture' | 'land-capture' ever reach this screen
  players: TerritoryPlayer[];
  map: TerritoryMapDef;
  lastCaptures: Record<string, string[]>;
  lastIncome?: Record<string, number>;
  onContinue: () => void;
}

// Base-capture/land-capture never take territory from an opponent (that's Battle's job
// exclusively), so unlike the old version, there's no attacker/defender versus banner here —
// every capture on this screen is neutral land or an unclaimed base.
export function RoundReveal({ roundKind, players, map, lastCaptures, lastIncome = {}, onContinue }: RoundRevealProps) {
  const isBaseCapture = roundKind === 'base-capture';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full flex-1 flex flex-col items-center px-6 py-6 gap-5"
    >
      <h1 className="font-bungee text-white uppercase text-xl tracking-wide">
        {isBaseCapture ? 'Bases Claimed!' : 'Land Claimed!'}
      </h1>

      <div className="w-full max-w-md flex flex-col gap-2.5">
        {players.map((p, i) => {
          const capturedIds = lastCaptures[p.id] ?? [];
          const capturedNames = capturedIds.map((id) => map.nodes.find((n) => n.id === id)?.name).filter(Boolean) as string[];
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
              {capturedNames.length > 0 ? (
                <span className="flex items-center gap-1 text-xs font-bungee uppercase text-right" style={{ color }}>
                  <Flag className="w-3.5 h-3.5 flex-shrink-0" /> {isBaseCapture ? `Base: ${capturedNames[0]}` : capturedNames.join(', ')}
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'rgba(255,255,255,.4)' }}>{isBaseCapture ? 'No base' : 'No capture'}</span>
              )}
              {!!income && (
                <span className="text-xs font-bungee tabular-nums flex-shrink-0" style={{ color: '#e8b84b' }}>+{income}</span>
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
