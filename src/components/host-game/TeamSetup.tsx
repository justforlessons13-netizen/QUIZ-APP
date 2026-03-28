import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Play, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveTeam, TEAM_EMOJIS } from '@/types/live-game';
import { QRCodeSVG } from 'qrcode.react'; //
import { Emoji3D } from '@/components/ui/Emoji3D'; //

interface TeamSetupProps {
  teams: LiveTeam[];
  onAddTeam: (name: string, emoji?: string) => void;
  onRemoveTeam: (id: string) => void;
  onStart: () => void;
  gameCode: string;
  projectorMode?: boolean;
}

export function TeamSetup({ teams, onAddTeam, onRemoveTeam, onStart, gameCode, projectorMode }: TeamSetupProps) {
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | undefined>();

  const usedEmojis = teams.map(t => t.emoji);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddTeam(name.trim(), selectedEmoji);
    setName('');
    setSelectedEmoji(undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center gap-6 w-full mx-auto px-4 ${projectorMode ? 'max-w-2xl' : 'max-w-lg'}`}
    >
      {/* Game code display with QR Code */}
      <div className="text-center flex flex-col items-center">
        <p className={`text-muted-foreground mb-4 ${projectorMode ? 'text-lg' : 'text-sm'}`}>
          Join at {window.location.host}/join
        </p>

        <div className="bg-white p-4 rounded-xl mb-6 shadow-lg">
          <QRCodeSVG
            value={`${window.location.origin}/join?code=${gameCode}`}
            size={projectorMode ? 250 : 180}
          />
        </div>

        <p className={`text-muted-foreground mb-1 ${projectorMode ? 'text-lg' : 'text-sm'}`}>
          Or enter code manually
        </p>
        <div className={`font-bold text-primary text-glow-primary tracking-[0.3em] font-mono ${projectorMode ? 'text-7xl' : 'text-4xl'}`}>
          {gameCode}
        </div>
      </div>

      <div className="w-full border-t border-border/50" />

      {/* Add team form */}
      <div className="w-full space-y-3">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Teams ({teams.length})
        </h3>

        {/* 3D Emoji picker */}
        <div className="flex flex-wrap gap-2 justify-center">
          {TEAM_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => setSelectedEmoji(selectedEmoji === emoji ? undefined : emoji)}
              disabled={usedEmojis.includes(emoji)}
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all
                ${selectedEmoji === emoji
                  ? 'bg-primary/20 border-2 border-primary scale-110 shadow-[0_0_15px_rgba(var(--primary),0.3)]'
                  : usedEmojis.includes(emoji)
                    ? 'opacity-30 cursor-not-allowed bg-muted grayscale'
                    : 'bg-card border border-border hover:border-primary/40'
                }`}
            >
              <Emoji3D emoji={emoji} className="w-8 h-8" />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Team name..."
            className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button onClick={handleAdd} disabled={!name.trim()} size="icon" className="h-12 w-12 rounded-xl">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Team list with 3D avatars */}
      <div className="w-full space-y-2">
        <AnimatePresence>
          {teams.map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-sm"
            >
              <Emoji3D emoji={team.emoji} className="w-8 h-8" />
              <span className="flex-1 font-semibold text-foreground">{team.name}</span>
              <button
                onClick={() => onRemoveTeam(team.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {teams.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-6 italic">
            Add at least 2 teams to start the game
          </p>
        )}
      </div>

      {/* Start button */}
      <Button
        onClick={onStart}
        disabled={teams.length < 2}
        className="w-full py-4 h-auto text-lg font-bold rounded-xl box-glow-primary mt-4"
      >
        <Play className="w-5 h-5 mr-2 fill-current" />
        Start Game ({teams.length} teams)
      </Button>
    </motion.div>
  );
}