import { TerritoryPlayer } from '@/types/territory';
import { PLAYER_COLORS } from './TerritoryMapView';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { alpha } from '@/lib/game-themes';

interface TerritoryScoreBarProps {
  players: TerritoryPlayer[];
  lastIncome?: Record<string, number>;
}

export function TerritoryScoreBar({ players, lastIncome = {} }: TerritoryScoreBarProps) {
  return (
    <div className="w-full flex justify-center gap-3 flex-wrap px-4 pb-2">
      {players.map((p, i) => {
        const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
        const income = lastIncome[p.id];
        return (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-xl px-3 py-2 relative"
            style={{
              background: alpha(color, 0.14),
              border: `1px solid ${alpha(color, p.eliminated ? 0.15 : 0.4)}`,
              opacity: p.eliminated ? 0.45 : 1,
            }}
          >
            <Emoji3D emoji={p.emoji} className="w-5 h-5" />
            <span className="text-xs font-bungee uppercase truncate max-w-[80px]" style={{ color }}>{p.name}</span>
            <span className="text-sm font-bungee tabular-nums text-white">{p.score}</span>
            {!!income && (
              <span
                className="absolute -top-2 -right-2 text-[10px] font-bungee px-1.5 py-0.5 rounded-full"
                style={{ background: color, color: '#1a0f05' }}
              >
                +{income}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
