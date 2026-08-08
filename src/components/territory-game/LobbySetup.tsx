import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Swords, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TerritoryPlayer, TerritoryMode, TerritoryMapDef } from '@/types/territory';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { TerritoryMapView } from './TerritoryMapView';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

interface LobbySetupProps {
  players: TerritoryPlayer[];
  requiredCount: number;
  mode: TerritoryMode;
  gameCode: string;
  packName: string;
  map: TerritoryMapDef;
  onAddPlayer: (name: string, emoji?: string) => void;
  onRemovePlayer: (id: string) => void;
  onStart: () => void;
}

export function LobbySetup({ players, requiredCount, mode, gameCode, packName, map, onAddPlayer, onRemovePlayer, onStart }: LobbySetupProps) {
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name.trim() || players.length >= requiredCount) return;
    onAddPlayer(name.trim());
    setName('');
  };

  const canStart = players.length === requiredCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full flex-1 flex flex-col items-center pt-8 pb-4 px-6 md:px-12"
    >
      <div className="text-center mb-6">
        <div
          className="inline-block font-bungee text-[12px] uppercase tracking-widest px-4 py-1.5 rounded-full mb-2"
          style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.4)}`, color: theme.color1 }}
        >
          {mode === 'duo' ? 'Duo Battle' : 'Trio Battle'} · {map.name}
        </div>
        <h1 className="font-bungee text-white text-xl">{packName}</h1>
      </div>

      <div className="w-full flex-1 grid grid-cols-1 md:grid-cols-[220px_1fr_220px] gap-8 min-h-0">
        <div className="flex flex-col items-center gap-4">
          <div
            className="bg-white rounded-[14px] p-[10px] flex items-center justify-center w-[150px] h-[150px]"
            style={{ boxShadow: `0 0 40px ${alpha(theme.color1, 0.15)}` }}
          >
            <QRCodeSVG value={`${window.location.origin}/territory/join?code=${gameCode}`} size={130} />
          </div>
          <div className="text-center">
            <div className="font-bungee text-[13px] uppercase tracking-widest" style={{ color: theme.color1 }}>Game PIN</div>
            <div className="font-mono font-extrabold text-2xl tracking-[.15em] text-white mt-1">{gameCode}</div>
          </div>
          <p className="text-muted-foreground/60 text-[10px] tracking-[2px] uppercase text-center max-w-[180px]">
            Scan or enter the PIN to join
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4">
          <div className="text-muted-foreground/80 text-[11px] tracking-[2px] uppercase flex items-center gap-2">
            <Users className="w-4 h-4" />
            Players ({players.length}/{requiredCount})
          </div>
          <div className="flex gap-4 flex-wrap justify-center">
            <AnimatePresence>
              {players.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.3, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="group bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-1 relative shadow-xl w-[86px] py-3.5 px-1.5"
                >
                  <button
                    onClick={() => onRemovePlayer(p.id)}
                    title={`Remove ${p.name}`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/70 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-red-500/80 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="leading-none animate-bob text-[32px]">
                    <Emoji3D emoji={p.emoji} />
                  </div>
                  <div className="text-muted-foreground/80 text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap tracking-widest uppercase text-[9px]">
                    {p.name}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {Array.from({ length: Math.max(0, requiredCount - players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="rounded-2xl border border-dashed border-white/15 w-[86px] h-[86px] flex items-center justify-center text-white/20 text-[10px] uppercase tracking-widest"
              >
                Waiting
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2.5 mt-2 w-full max-w-[300px]">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              disabled={players.length >= requiredCount}
              placeholder="Add a player manually..."
              className="flex-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-colors tracking-wider disabled:opacity-40"
            />
            <button
              onClick={handleAdd}
              disabled={!name.trim() || players.length >= requiredCount}
              className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl w-[46px] h-[46px] text-2xl flex items-center justify-center font-bold shrink-0 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: theme.color1 }}
            >
              +
            </button>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center gap-3">
          <div className="text-muted-foreground/60 text-[10px] tracking-[2px] uppercase">Map preview</div>
          <TerritoryMapView map={map} players={[]} size={200} />
        </div>
      </div>

      <div className="w-full flex justify-center pt-6 pb-5">
        <button
          onClick={onStart}
          disabled={!canStart}
          className="relative min-w-[260px] bg-transparent border-2 rounded-xl py-3 px-6 text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 disabled:opacity-50 transition-colors"
          style={{ color: theme.color1, borderColor: canStart ? theme.color1 : alpha(theme.color1, 0.2) }}
        >
          <Swords className="w-5 h-5" /> Start Capture
        </button>
      </div>
    </motion.div>
  );
}
