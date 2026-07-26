// Replaces src/components/bee-game/BeeRosterEntry.tsx
// Fixes the same leftover-QGame-purple issue as BeeGame-color-fixes.tsx: three
// spots hardcode #adbbff instead of the theme-relative "primary" token every
// other Bee screen already uses. This is the file the screenshot showed still
// on the old blue/teal look — swap it in for the gold theme.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, X } from 'lucide-react';

interface BeeRosterEntryProps {
  rules?: string;
  onStart: (playerNames: string[]) => void;
}

export function BeeRosterEntry({ rules, onStart }: BeeRosterEntryProps) {
  const [names, setNames] = useState<string[]>([]);
  const [name, setName] = useState('');

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (names.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      setName('');
      return;
    }
    setNames(prev => [...prev, trimmed]);
    setName('');
  };

  const handleRemove = (target: string) => {
    setNames(prev => prev.filter(n => n !== target));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg mx-auto flex flex-col items-center py-10 px-4 gap-6"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bungee text-white uppercase tracking-wide">Spelling Bee</h1>
        <p className="text-muted-foreground text-sm mt-1 font-sugo uppercase tracking-widest">
          Enter today's spellers
        </p>
      </div>

      {rules && (
        <div className="w-full p-4 rounded-xl border border-border bg-card text-sm text-muted-foreground whitespace-pre-line">
          {rules}
        </div>
      )}

      <div className="w-full flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[2px] text-primary/80 font-sugo">
          <Users className="w-4 h-4 text-primary" />
          Roster
        </div>

        <div className="flex flex-wrap gap-2 min-h-[44px]">
          <AnimatePresence>
            {names.map(n => (
              <motion.div
                key={n}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full pl-3 pr-1.5 py-1.5 text-sm text-foreground font-sugo tracking-wide"
              >
                {n}
                <button
                  onClick={() => handleRemove(n)}
                  className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Speller's name..."
            className="flex-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl py-3.5 px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors font-sugo tracking-wider"
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl w-[50px] h-[50px] text-primary text-2xl flex items-center justify-center font-bold shrink-0 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>

        <div className="text-muted-foreground/50 text-[10px] uppercase tracking-[2px] font-sugo pl-1">
          {names.length} speller{names.length === 1 ? '' : 's'} ready
        </div>
      </div>

      <button
        onClick={() => onStart(names)}
        disabled={names.length < 2}
        className="relative w-full max-w-[320px] bg-transparent border-2 border-primary rounded-xl py-3 px-6 text-primary text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 animate-borderPulse disabled:opacity-50 disabled:animate-none hover:bg-primary/10 transition-colors shadow-2xl mx-auto"
        style={names.length < 2 ? { boxShadow: 'none', borderColor: 'hsl(var(--primary) / 0.2)' } : undefined}
      >
        <Play className={`w-5 h-5 fill-current ${names.length >= 2 ? 'animate-iconPop' : ''}`} />
        Start Bee
      </button>
    </motion.div>
  );
}
