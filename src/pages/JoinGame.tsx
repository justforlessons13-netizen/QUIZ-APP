import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { PlayerGame } from '@/components/game/PlayerGame';
import { TEAM_EMOJIS, LiveGameState } from '@/types/live-game';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { DynamicBackground } from '@/components/layout/DynamicBackground';

// ─── localStorage key ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'qgame-player-session';

interface SavedSession {
  sessionId: string;
  teamId: string;
  teamName: string;
  code: string;
  emoji: string;
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
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [code, setCode] = useState(initialCode);
  const [teamName, setTeamName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(TEAM_EMOJIS[0]);
  const [takenEmojis, setTakenEmojis] = useState<string[]>([]);
  const [found, setFound] = useState<{ sessionId: string; packName: string } | null>(null);
  const [joined, setJoined] = useState<SavedSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      // Auto-lookup if code was in URL
      if (initialCode && initialCode.length >= 4) {
        handleLookup(initialCode);
      }
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

  const handleLookup = async (codeToLookup?: string) => {
    const lookupCode = codeToLookup || code;
    const db = getFirestore();
    const codeDocRef = doc(db, 'game-codes', lookupCode.toUpperCase());
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
        emoji: selectedEmoji,
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
      <div className="min-h-screen relative flex flex-col text-foreground">
        <DynamicBackground phase="team-setup" />
        <header className="flex items-center justify-between p-4 border-b border-border/20 bg-black/40 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-card rounded-md border border-border/50">
              <Emoji3D emoji={joined.emoji || '🎮'} className="w-6 h-6" />
            </div>
            <span className="text-sm text-white font-bungee tracking-wide uppercase truncate max-w-[140px]">
              {joined.teamName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-mono">
              {joined.code}
            </span>
            <button
              onClick={handleLeave}
              className="flex items-center gap-1.5 text-xs text-red-500/80 hover:text-red-500 transition-colors font-bungee uppercase tracking-wide bg-red-500/10 px-2 py-1 rounded-md"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave
            </button>
          </div>
        </header>
        <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
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
    <div className="min-h-screen relative flex flex-col text-foreground">
      <DynamicBackground phase="team-setup" />
      <header className="flex items-center p-4 relative z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white hover:bg-white/10">
          <ArrowLeft className="w-4 h-4 mr-1" /> Home
        </Button>
      </header>

      <main className="flex-1 flex items-start mt-4 md:items-center md:mt-0 justify-center p-2 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 w-full max-w-[480px] mx-auto"
        >
          <div className="text-center">
            <h1 className="text-4xl font-bungee text-primary drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">Join Game</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {found ? "Choose your team and avatar" : "Enter the game code shown on the host's screen"}
            </p>
          </div>

          {!found ? (
            <>
              <div className="flex gap-4 justify-center w-full">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    value={code[index] || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      // Handle paste
                      if (val.length > 1) {
                        const pasted = val.replace(/[^A-Z0-9]/g, '').slice(0, 4);
                        if (pasted) {
                          setCode(pasted);
                          if (pasted.length === 4) {
                            handleLookup(pasted);
                          } else {
                            inputRefs.current[pasted.length]?.focus();
                          }
                        }
                        return;
                      }
                      const newArr = [0, 1, 2, 3].map(idx => code[idx] || '');
                      newArr[index] = val;
                      const newCode = newArr.join('');
                      setCode(newCode);
                      if (val && index < 3) {
                        inputRefs.current[index + 1]?.focus();
                      }
                      if (newCode.length === 4 && val) {
                        handleLookup(newCode);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        if (!code[index] && index > 0) {
                          inputRefs.current[index - 1]?.focus();
                        }
                      } else if (e.key === 'Enter') {
                        if (code.length >= 4) {
                          handleLookup();
                        }
                      }
                    }}
                    maxLength={4} // Allow paste to bring in more, but manually slice it
                    className="w-16 h-20 bg-card border-2 border-primary rounded-xl text-primary text-center text-4xl font-bungee shadow-[0_0_15px_rgba(0,255,255,0.2)] focus:shadow-[0_0_20px_rgba(0,255,255,0.5)] focus:outline-none transition-all uppercase"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-4"
            >
              <div className="p-4 rounded-xl bg-black/60 border border-success/50 shadow-[0_0_15px_rgba(0,255,0,0.15)] flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Game found</span>
                </div>
                <p className="text-2xl font-bungee text-primary">{found.packName}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-primary text-center font-bungee uppercase tracking-widest">Choose your avatar</p>
                <div className="grid grid-cols-6 gap-2 w-full max-w-[460px] mx-auto">
                  {TEAM_EMOJIS.map((emoji, idx) => {
                    const isTaken = takenEmojis.includes(emoji);
                    return (
                      <motion.button
                        key={emoji}
                        initial={{ y: 0 }}
                        animate={isTaken ? {} : { y: [0, -5, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: idx * 0.1,
                        }}
                        onClick={() => !isTaken && setSelectedEmoji(emoji)}
                        disabled={isTaken}
                        className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                          isTaken 
                            ? 'bg-card/20 border border-border/10 opacity-30 cursor-not-allowed grayscale' 
                            : selectedEmoji === emoji
                              ? 'bg-card border-2 border-primary scale-110 animate-borderPulse'
                              : 'bg-card border border-border hover:border-primary/40 hover:bg-card/80'
                          }`}
                        title={isTaken ? "Already taken" : undefined}
                      >
                        <div className="w-[60%] h-[60%] flex items-center justify-center">
                          <Emoji3D emoji={emoji} className="w-full h-full object-contain" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="YOUR TEAM NAME"
                className="w-full px-4 py-3 bg-card border-2 border-primary rounded-xl text-primary text-center text-xl font-bungee shadow-[0_0_15px_rgba(0,255,255,0.2)] placeholder:text-primary/30 focus:shadow-[0_0_20px_rgba(0,255,255,0.5)] focus:outline-none transition-all uppercase"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && teamName.trim() && handleJoin()}
              />

              <Button
                onClick={handleJoin}
                disabled={!teamName.trim() || !selectedEmoji}
                className="w-full py-4 h-auto text-lg font-bungee rounded-xl bg-transparent border-2 border-primary text-primary hover:bg-primary/10 animate-borderPulse disabled:opacity-50 disabled:animate-none transition-all"
              >
                <LogIn className="w-5 h-5 mr-3" />
                Join Game
              </Button>
            </motion.div>
          )}
        </motion.div>
      </main>

    </div>
  );
}