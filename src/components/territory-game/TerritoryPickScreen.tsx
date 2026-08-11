import { motion } from 'framer-motion';
import { TerritoryMapDef, TerritoryPlayer, TerritoryRoundKind } from '@/types/territory';
import { TerritoryMapView } from './TerritoryMapView';
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
  map: TerritoryMapDef;
  players: TerritoryPlayer[];
  availablePickIds: string[];
}

// Host-side spectator view while phase === 'pick' — the host never picks, only the designated
// player does, from their own device. This screen just shows whose turn it is and what's up for grabs.
export function TerritoryPickScreen({ roundKind, picker, attacker, map, players, availablePickIds }: TerritoryPickScreenProps) {
  const verb = roundKind === 'base-capture' ? 'choosing a base' : roundKind === 'land-capture' ? 'choosing land to claim' : 'choosing a target to attack';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full flex-1 flex flex-col items-center px-6 py-6 gap-5"
    >
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

      <TerritoryMapView map={map} players={players} highlightedNodeIds={availablePickIds} size={560} />

      <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.5)' }}>
        {availablePickIds.length} option{availablePickIds.length === 1 ? '' : 's'} available
      </p>
    </motion.div>
  );
}
