import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { PlayerGame } from '@/components/game/PlayerGame';
import { TEAM_EMOJIS, LiveGameState } from '@/types/live-game';
import { Emoji3D } from '@/components/ui/Emoji3D';

// ─── localStorage key ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'qgame-player-session';

interface SavedSession {
  sessionId: string;
  teamId: string;
  teamName: string;
  code: string;
}

function saveSession(session: SavedSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JoinGame() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(TEAM_EMOJIS[0]);
  const [takenEmojis, setTakenEmojis] = useState<string[]>([]);
  const [found, setFound] = useState<{ sessionId: string; packName: string } | null>(null);
  const [joined, setJoined] = useState<SavedSession | null>(null);
  const [restoring, setRestoring] = useState(true);

  // ── On mount: restore session from localStorage ──
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      // Verify the game still exists in Firestore before restoring
      const db = getFirestore();
      getDoc(doc(db, 'games', saved.sessionId))
        .then((snap) => {
          if (snap.exists()) {
            const state = snap.data() as LiveGameState;
            // Make sure our team is still in the game
            const stillInGame = state.teams.some(t => t.id === saved.teamId);
            if (stillInGame) {
              setJoined(saved);
            } else {
              // Team was removed (e.g. host reset), clear session
              clearSession();
            }
          } else {
            // Game ended or doesn't exist anymore
            clearSession();
          }
        })
        .catch(() => clearSession())
        .finally(() => setRestoring(false));
    } else {
      setRestoring(false);
    }
  }, []);

  // Live monitor for emojis that are already taken by other teams
  useEffect(() => {
    if (!found) return;
    const db = getFirestore();
    const gameRef = doc(db, 'games', found.sessionId);
    
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const state = docSnap.data() as LiveGameState;
        const taken = state.teams.map(t => t.emoji);
        setTakenEmojis(taken);
        
        // If the current selection was just taken by someone else, auto-select a free one
        setSelectedEmoji(current => {
          if (taken.includes(current)) {
            return TEAM_EMOJIS.find(e => !taken.includes(e)) || current;
          }
          return current;
        });
      }
    });

    return () => unsubscribe();
  }, [found]);

  const handleLookup = async () => {
    const db = getFirestore();
    const codeDocRef = doc(db, 'game-codes', code.toUpperCase());
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
        toast({ title: 'Game not active', description: "The host hasn't started the session yet.", variant: 'destructive' });
        return;
      }

      const state = gameDoc.data() as LiveGameState;

      if (state.teams.some(t => t.name.toLowerCase() === teamName.trim().toLowerCase())) {
        toast({ title: 'Name taken', description: 'That team name is already in use.', variant: 'destructive' });
        return;
      }

      if (state.teams.some(t => t.emoji === selectedEmoji)) {
        toast({ title: 'Emoji taken', description: 'That emoji is already in use by another team.', variant: 'destructive' });
        return;
      }

      const teamId = crypto.randomUUID();
      const newTeam = {
        id: teamId,
        name: teamName.trim(),
        emoji: selectedEmoji,
        score: 0,
        roundScores: [],
      };

      await updateDoc(gameRef, { teams: arrayUnion(newTeam) });

      const session: SavedSession = {
        sessionId: found.sessionId,
        teamId,
        teamName: teamName.trim(),
        code: code.toUpperCase(),
      };

      // ── Save to localStorage so reload restores the session ──
      saveSession(session);
      setJoined(session);

    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not join game.', variant: 'destructive' });
    }
  };

  const handleLeave = () => {
    clearSession();
    setJoined(null);
    setFound(null);
    setCode('');
    setTeamName('');
  };

  // ── Show nothing while checking localStorage ──
  if (restoring) {
    return (
      <div className="min-h-screen bg-radial-dark flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[#adbbff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Active game view ──
  if (joined) {
    return (
      <div className="min-h-screen bg-radial-dark flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-border/50">
          <span className="text-sm text-muted-foreground font-bungee tracking-wide uppercase">
            {joined.teamName}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground/60 font-mono">
              {joined.code}
            </span>
            <button
              onClick={handleLeave}
              className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-destructive transition-colors font-bungee uppercase tracking-wide"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave
            </button>
          </div>
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

  // ── Join flow ──
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
          className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto"
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
                className="w-full px-6 py-4 bg-card border border-border rounded-xl text-foreground text-center text-3xl font-mono tracking-[0.4em] placeholder:text-muted-foreground placeholder:text-lg placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/50"
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

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center font-medium">Choose your avatar</p>
                <div className="flex flex-wrap justify-center gap-3 w-full">
                  {TEAM_EMOJIS.map(emoji => {
                    const isTaken = takenEmojis.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        onClick={() => !isTaken && setSelectedEmoji(emoji)}
                        disabled={isTaken}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                          isTaken 
                            ? 'bg-card/30 border border-border/20 opacity-30 cursor-not-allowed grayscale' 
                            : selectedEmoji === emoji
                              ? 'bg-primary/20 border-2 border-primary scale-110 shadow-[0_0_15px_rgba(var(--primary),0.3)]'
                              : 'bg-card border border-border hover:border-primary/40'
                          }`}
                        title={isTaken ? "Already taken" : undefined}
                      >
                        <Emoji3D emoji={emoji} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Your team name..."
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-lg"
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