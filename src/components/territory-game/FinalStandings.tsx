import { motion } from 'framer-motion';
import { Trophy, RotateCcw, LayoutDashboard, Skull } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { TerritoryPlayer, TerritoryMapDef } from '@/types/territory';
import { TerritoryMapView, PLAYER_COLORS } from './TerritoryMapView';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { Button } from '@/components/ui/button';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

interface FinalStandingsProps {
  ranked: TerritoryPlayer[];
  map: TerritoryMapDef;
  onPlayAgain: () => void;
  onDashboard: () => void;
}

export function FinalStandings({ ranked, map, onPlayAgain, onDashboard }: FinalStandingsProps) {
  const winner = ranked[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex-1 flex flex-col items-center px-6 py-8 gap-6 relative overflow-hidden"
    >
      {winner && (
        <DotLottieReact
          src="https://lottie.host/79266ebc-8b4a-4b7c-a1a0-326ac1057a23/JU5NbpIPAL.lottie"
          autoplay
          style={{
            position: 'absolute', top: '20%', left: '50%', width: '100%', height: '100%',
            minWidth: '110vh', minHeight: '110vh', transform: 'translate(-50%,-50%) rotate(90deg)',
            pointerEvents: 'none', zIndex: 0,
          }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-2">
        <Trophy className="w-10 h-10" style={{ color: theme.color1 }} />
        <h1 className="font-bungee text-white uppercase text-2xl tracking-wide">Battle Over</h1>
        {winner && (
          <p className="font-bungee text-lg" style={{ color: theme.color1 }}>
            {winner.name} conquers the map!
          </p>
        )}
      </div>

      <TerritoryMapView map={map} players={ranked} size={280} />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-2.5">
        {ranked.map((p, i) => {
          const color = PLAYER_COLORS[ranked.indexOf(p) % PLAYER_COLORS.length];
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: i === 0 ? alpha(theme.color1, 0.12) : 'rgba(255,255,255,.05)',
                border: `1px solid ${i === 0 ? alpha(theme.color1, 0.4) : 'rgba(255,255,255,.1)'}`,
              }}
            >
              <span className="font-bungee text-sm w-5 text-center" style={{ color: i === 0 ? theme.color1 : 'rgba(255,255,255,.5)' }}>{i + 1}</span>
              <Emoji3D emoji={p.emoji} className="w-7 h-7" />
              <span className="flex-1 font-semibold text-white text-sm truncate">{p.name}</span>
              {p.eliminated && <Skull className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,.4)' }} />}
              <span className="text-xs" style={{ color }}>{p.ownedNodeIds.length} territories</span>
              <span className="font-bungee tabular-nums text-sm text-white">{p.score}</span>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex gap-3 w-full max-w-md">
        <Button variant="secondary" onClick={onPlayAgain} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" /> Play Again
        </Button>
        <Button variant="outline" onClick={onDashboard} className="flex-1">
          <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
        </Button>
      </div>
    </motion.div>
  );
}
