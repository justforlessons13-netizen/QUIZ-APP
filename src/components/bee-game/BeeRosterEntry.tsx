// Replaces src/components/bee-game/BeeRosterEntry.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { beeInitials, beeAvatarColor } from '@/lib/beeAvatar';

interface BeeRosterEntryProps {
  rules?: string;
  onStart: (playerNames: string[]) => void;
}

const GOLD = 'oklch(80% 0.16 92)';

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
      className="w-full max-w-[480px] mx-auto flex flex-col items-center py-10 px-4 gap-[22px] text-center"
    >
      {/* Title */}
      <div>
        <h1 className="font-bungee text-white uppercase" style={{ fontSize: 24 }}>
          Spelling Bee
        </h1>
        <p
          className="mt-1.5 uppercase tracking-[.15em]"
          style={{ fontSize: 11, color: 'oklch(70% 0.02 92)' }}
        >
          Enter today's spellers
        </p>
      </div>

      {/* Rules (optional) */}
      {rules && (
        <div
          className="w-full p-4 rounded-xl text-sm text-left whitespace-pre-line"
          style={{
            background: 'rgba(0,0,0,.3)',
            border: `1px solid ${GOLD}33`,
            color: 'oklch(70% 0.02 92)',
          }}
        >
          {rules}
        </div>
      )}

      {/* Roster section */}
      <div className="w-full flex flex-col gap-3 items-start text-left">
        {/* "ROSTER" label — no icon */}
        <div
          className="uppercase tracking-[.15em]"
          style={{ fontSize: 11, color: `${GOLD}cc` }}
        >
          Roster
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 min-h-[40px] w-full">
          <AnimatePresence>
            {names.map(n => {
              const color = beeAvatarColor(n);
              const initials = beeInitials(n);
              return (
                <motion.div
                  key={n}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="flex items-center gap-2"
                  style={{
                    background: 'rgba(0,0,0,.4)',
                    border: `1px solid ${GOLD}33`,
                    borderRadius: 20,
                    padding: '6px 8px 6px 6px',
                    fontSize: 13,
                    color: '#fff',
                  }}
                >
                  {/* Avatar circle */}
                  <span
                    className="font-bungee shrink-0 flex items-center justify-center"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: `${color}22`,
                      border: `1.5px solid ${color}`,
                      fontSize: 9,
                      color,
                    }}
                  >
                    {initials}
                  </span>
                  {n}
                  <button
                    onClick={() => handleRemove(n)}
                    className="flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,.06)',
                      border: 'none',
                      color: 'oklch(70% 0.01 195)',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    ✕
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2.5 w-full">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Speller's name..."
            className="flex-1 focus:outline-none"
            style={{
              background: 'rgba(0,0,0,.4)',
              border: `1px solid ${GOLD}33`,
              borderRadius: 12,
              padding: 14,
              color: '#fff',
              fontSize: 14,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="shrink-0 flex items-center justify-center text-2xl transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              width: 50,
              height: 50,
              background: 'rgba(0,0,0,.4)',
              border: `1px solid ${GOLD}33`,
              borderRadius: 12,
              color: GOLD,
              cursor: 'pointer',
            }}
          >
            +
          </button>
        </div>

        {/* Count */}
        <div
          className="uppercase tracking-[.15em] pl-0.5"
          style={{ fontSize: 10, color: 'oklch(60% 0.02 92)' }}
        >
          {names.length} speller{names.length === 1 ? '' : 's'} ready
        </div>
      </div>

      {/* Start button — outlined gold */}
      <button
        onClick={() => onStart(names)}
        disabled={names.length < 2}
        className="w-full font-bungee uppercase transition-[filter] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          maxWidth: 280,
          padding: '14px',
          borderRadius: 12,
          background: 'transparent',
          border: `2px solid ${GOLD}`,
          color: GOLD,
          fontSize: 14,
          letterSpacing: '.04em',
        }}
      >
        Start Bee ▶
      </button>
    </motion.div>
  );
}
