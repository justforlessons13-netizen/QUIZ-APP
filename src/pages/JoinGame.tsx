import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ArrowLeft, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { PlayerGame } from '@/components/game/PlayerGame';
import { TEAM_EMOJIS, LiveGameState } from '@/types/live-game';
import { Emoji3D } from '@/components/ui/Emoji3D';

export default function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); //

  // Initialize with the URL 'code' parameter if available
  const [code, setCode] = useState(() => searchParams.get('code')?.toUpperCase() || '');
  const [teamName, setTeamName] = useState('');

  // Antigravity standardizes on TEAM_EMOJIS[0] for initial selection
  const [selectedEmoji, setSelectedEmoji] = useState(TEAM_EMOJIS[0]);

  const [found, setFound] = useState<{ sessionId: string; packName: string } | null>(null);
  const [joined, setJoined] = useState<{ sessionId: string; teamId: string; teamName: string } | null>(null);

  const handleLookup = async () => {
    const db = getFirestore();

    // Antigravity's regex to strip spaces and ensure clean validation
    const cleanCode = code.replace(/\s+/g, '').toUpperCase();

    if (!cleanCode) {
      toast({
        title: 'Invalid code',
        description: 'Please enter a game code.',
        variant: 'destructive'
      });
      return;
    }

    const codeDocRef = doc(db, 'game-codes', cleanCode); //
    try {
      const codeDoc = await getDoc(codeDocRef);
      if (codeDoc.exists()) {
        const data = codeDoc.data();
        setFound({ sessionId: data.sessionId, packName: data.packName });
      } else {
        toast({ title: 'Game not found', description: 'Check the code and try again.', variant: 'destructive' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not look up game.', variant: 'destructive' });
    }
  };

  const handleJoin = async () => {
    if (!teamName.trim() || !found) return;
    const db = getFirestore();
    const gameRef = doc(db, 'games', found.sessionId);

    try {
      const gameDoc = await getDoc(gameRef);
      if (!gameDoc.exists()) {
        toast({ title: 'Game not active', description: 'The host hasn\'t started the session yet.', variant: 'destructive' });
        return;
      }

      const state = gameDoc.data() as LiveGameState;

      // 1. Validate Team Name
      if (state.teams.some(t => t.name.toLowerCase() === teamName.trim().toLowerCase())) {
        toast({ title: 'Name taken', description: 'That team name is already in use.', variant: 'destructive' });
        return;
      }

      // 2. Validate Emoji
      if (state.teams.some(t => t.emoji === selectedEmoji)) {
        toast({
          title: 'Emoji taken',
          description: 'That emoji is already in use. Please choose a different one.',
          variant: 'destructive'
        });
        return;
      }

      const teamId = crypto.randomUUID();
      const newTeam = {
        id: teamId,
        name: teamName.trim(),
        emoji: selectedEmoji, //
        score: 0,
        roundScores: [],
      };

      await updateDoc(gameRef, { teams: arrayUnion(newTeam) });

      setJoined({ sessionId: found.sessionId, teamId, teamName: teamName.trim() });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not join game.', variant: 'destructive' });
    }
  };

  if (joined) {
    return (
      <div className="min-h-screen bg-radial-dark flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-border/50">
          <span className="text-sm text-muted-foreground">{joined.teamName}</span>
          <span className="text-xs text-muted-foreground/60">Code: {code}</span>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <PlayerGame
            sessionId={joined.sessionId}
            teamId={joined.teamId}
            teamName={joined.teamName}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-radial-dark flex flex-col">
      <header className="flex items-center p-4 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Home
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 w-full max-sm mx-auto"
        >
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary">Join Game</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Enter the game code shown on the host's screen
            </p>
          </div>

          {!found ? (
            <>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="GAME CODE"
                maxLength={4}
                className="w-full px-6 py-4 bg-card border border-border rounded-xl text-foreground text-center text-3xl font-mono tracking-[0.4em] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && code.length >= 4 && handleLookup()}
              />
              <Button
                onClick={handleLookup}
                disabled={code.length < 4}
                className="w-full py-3 h-auto text-base font-bold rounded-xl"
              >
                Find Game
              </Button>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-5"
            >
              <div className="p-4 rounded-xl bg-card border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground">Found game</p>
                <p className="text-xl font-bold text-primary mt-1">{found.packName}</p>
              </div>

              {/* Emoji Picker Section with Emoji3D support */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center font-medium">Choose your avatar</p>
                <div className="flex flex-wrap justify-center gap-3 w-full">
                  {TEAM_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setSelectedEmoji(e)}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${selectedEmoji === e
                        ? 'bg-primary/20 border-2 border-primary scale-110 shadow-[0_0_15px_rgba(var(--primary),0.3)]'
                        : 'bg-card border border-border hover:border-primary/40'
                        }`}
                    >
                      <Emoji3D emoji={e} size="sm" />
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Your team name..."
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && teamName.trim() && handleJoin()}
              />

              <Button
                onClick={handleJoin}
                disabled={!teamName.trim()}
                className="w-full py-3 h-auto text-base font-bold rounded-xl"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Join Game
              </Button>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}