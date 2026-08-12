import { motion } from 'framer-motion';
import { TerritoryPlayer, TerritoryRoundKind } from '@/types/territory';
import { TerritoryScoreBar } from './TerritoryScoreBar';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

const ROUND_LABEL: Record<TerritoryRoundKind, string> = {
  'base-capture': 'Base Capture',
  'land-capture': 'Land Capture',
  battle: 'Battle',
};

interface TerritoryPickScreenProps {
  roundKind: TerritoryRoundKind;
  picker: TerritoryPlayer;
  attacker: TerritoryPlayer | null;
  players: TerritoryPlayer[];
  availablePickIds: string[];
}

// Host-side spectator view while phase === 'pick' — the host never picks, only the designated
// player does, from their own device. This screen just shows whose turn it is and what's up for
// grabs; the map itself (with the picker's territory outlined and available targets pulsing) is
// rendered once as a shared full-bleed backdrop by TerritoryGameController.
export function TerritoryPickScreen({ roundKind, picker, attacker, players, availablePickIds }: TerritoryPickScreenProps) {
  const verb = roundKind === 'base-capture' ? 'choosing a base' : roundKind === 'land-capture' ? 'choosing land to claim' : 'choosing a target to attack';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-0 flex flex-col items-center justify-between px-4 py-4 md:py-8"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="font-bungee text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full"
          style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.4)}`, color: theme.color1 }}
        >
          {ROUND_LABEL[roundKind]}
          {roundKind === 'battle' && attacker && ` · ${attacker.name}'s turn`}
        </div>

        <div className="flex items-center gap-3">
          <Emoji3D emoji={picker.emoji} className="w-9 h-9 animate-bob" />
          <h1 className="font-bungee text-white text-lg">{picker.name} is {verb}…</h1>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.5)' }}>
          {availablePickIds.length} option{availablePickIds.length === 1 ? '' : 's'} available
        </p>
        <TerritoryScoreBar players={players} />
      </div>
    </motion.div>
  );
}
