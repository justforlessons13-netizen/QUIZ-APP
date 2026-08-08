import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TerritoryPlayerGame } from '@/components/game/TerritoryPlayerGame';
import { PLAYER_EMOJIS, TerritoryGameState, TerritoryPlayer, playerCountFor } from '@/types/territory';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

// ─── localStorage key ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'territory-player-session';

interface SavedSession {
  sessionId: string;
  playerId: string;
  playerName: string;
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

export default function TerritoryJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [code, setCode] = useState(initialCode);
  const [playerName, setPlayerName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(PLAYER_EMOJIS[0]);
  const [takenEmojis, setTakenEmojis] = useState<string[]>([]);
  const [found, setFound] = useState<{ sessionId: string; packName: string } | null>(null);
  const [joined, setJoined] = useState<SavedSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── On mount: restore session from localStorage ──
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      const db = getFirestore();
      getDoc(doc(db, 'territory-games', saved.sessionId))
        .then((snap) => {
          if (snap.exists()) {
            const state = snap.data() as TerritoryGameState;
            const stillInGame = state.players.some((p) => p.id === saved.playerId);
            if (stillInGame) {
              setJoined(saved);
            } else {
              clearSession();
            }
          } else {
            clearSession();
          }
        })
        .catch(() => clearSession())
        .finally(() => setRestoring(false));
    } else {
      setRestoring(false);
      if (initialCode && initialCode.length >= 4) {
        handleLookup(initialCode);
      }
    }
  }, []);

  // Live monitor for emojis already taken by other players
  useEffect(() => {
    if (!found) return;
    const db = getFirestore();
    const gameRef = doc(db, 'territory-games', found.sessionId);

    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const state = docSnap.data() as TerritoryGameState;
        const taken = state.players.map((p) => p.emoji);
        setTakenEmojis(taken);

        setSelectedEmoji((current) => {
          if (taken.includes(current)) {
            return PLAYER_EMOJIS.find((e) => !taken.includes(e)) || current;
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
    const codeDocRef = doc(db, 'territory-codes', lookupCode.toUpperCase());
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
    if (!playerName.trim() || !found) return;
    const db = getFirestore();
    const gameRef = doc(db, 'territory-games', found.sessionId);

    try {
      const gameDoc = await getDoc(gameRef);
      if (!gameDoc.exists()) {
        toast({ title: 'Game not active', description: "The host hasn't started the session yet.", variant: 'destructive' });
        return;
      }

      const state = gameDoc.data() as TerritoryGameState;

      if (state.phase !== 'lobby') {
        toast({ title: 'Already started', description: 'This battle is already underway.', variant: 'destructive' });
        return;
      }

      if (state.players.length >= playerCountFor(state.mode)) {
        toast({ title: 'Game full', description: 'This battle already has all its players.', variant: 'destructive' });
        return;
      }

      if (state.players.some((p) => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
        toast({ title: 'Name taken', description: 'That name is already in use.', variant: 'destructive' });
        return;
      }

      if (state.players.some((p) => p.emoji === selectedEmoji)) {
        toast({ title: 'Emoji taken', description: 'That emoji is already in use by another player.', variant: 'destructive' });
        return;
      }

      const playerId = crypto.randomUUID();
      const newPlayer: TerritoryPlayer = {
        id: playerId,
        name: playerName.trim(),
        emoji: selectedEmoji,
        baseNodeId: null,
        ownedNodeIds: [],
        score: 0,
        eliminated: false,
      };

      await updateDoc(gameRef, { players: arrayUnion(newPlayer) });

      const session: SavedSession = {
        sessionId: found.sessionId,
        playerId,
        playerName: playerName.trim(),
        code: code.toUpperCase(),
        emoji: selectedEmoji,
      };

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
    setPlayerName('');
  };

  // ── Show nothing while checking localStorage ──
  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(10% 0.02 40)' }}>
        <div className="w-8 h-8 border-[3px] rounded-full animate-spin" style={{ borderColor: theme.color1, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // ── Active game view ──
  if (joined) {
    return (
      <div className="min-h-screen relative flex flex-col text-foreground" style={{ background: 'oklch(10% 0.02 40)' }}>
        <header
          className="flex items-center justify-between p-4 border-b backdrop-blur-md relative z-10"
          style={{ borderColor: alpha(theme.color1, 0.2), background: 'rgba(0,0,0,0.4)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 flex items-center justify-center rounded-md"
              style={{ background: alpha(theme.color1, 0.12), border: `1px solid ${alpha(theme.color1, 0.3)}` }}
            >
              <Emoji3D emoji={joined.emoji || '🎮'} className="w-6 h-6" />
            </div>
            <span className="text-sm font-bungee tracking-wide uppercase truncate max-w-[140px]" style={{ color: theme.color1 }}>
              {joined.playerName}
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
          <TerritoryPlayerGame
            sessionId={joined.sessionId}
            playerId={joined.playerId}
            playerName={joined.playerName}
          />
        </main>
      </div>
    );
  }

  // ── Join flow ──
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'oklch(10% 0.02 40)' }}>
      <nav className="flex items-center gap-4 px-6 sm:px-12 py-5">
        <button
          onClick={() => navigate('/')}
          title="Back"
          className="w-[34px] h-[34px] rounded-full border flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10"
          style={{ borderColor: alpha(theme.color1, 0.35), color: theme.color1 }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-bungee text-base tracking-wide" style={{ color: theme.color1 }}>
          PLAYHUB
        </span>
      </nav>

      <main className="flex-1 flex items-start mt-4 md:items-center md:mt-0 justify-center p-2 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5 w-full max-w-[420px] mx-auto"
        >
          <div className="text-center">
            <h1 className="font-bungee uppercase text-[30px] mb-2 text-white">
              Join the battle
            </h1>
            <p className="text-[13.5px] text-white/50">
              {found ? 'Choose your name and avatar' : "Enter the code shown on the host's screen"}
            </p>
          </div>

          {!found ? (
            <div className="flex gap-3 justify-center w-full">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  value={code[index] || ''}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
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
                    const newArr = [0, 1, 2, 3].map((idx) => code[idx] || '');
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
                  maxLength={4}
                  className="text-center font-bungee focus:outline-none transition-all uppercase rounded-lg"
                  style={{
                    width: 64,
                    height: 78,
                    fontSize: 30,
                    color: '#fff',
                    background: 'rgba(255,255,255,.05)',
                    border: `1.5px solid ${theme.color1}`,
                  }}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-4"
            >
              <div
                className="p-4 rounded-xl flex flex-col items-center justify-center gap-1 text-center"
                style={{ background: alpha(theme.color1, 0.1), border: `1px solid ${alpha(theme.color1, 0.33)}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: 'oklch(55% 0.14 150)' }} />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                    Game found
                  </span>
                </div>
                <p className="font-bungee text-[19px] uppercase text-white">{found.packName}</p>
              </div>

              <div className="space-y-2.5">
                <p className="text-[11.5px] font-bold text-center uppercase tracking-widest text-white/60">
                  Choose your avatar
                </p>
                <div className="grid grid-cols-6 gap-2 w-full">
                  {PLAYER_EMOJIS.map((emoji) => {
                    const isTaken = takenEmojis.includes(emoji);
                    const isSelected = selectedEmoji === emoji;
                    return (
                      <button
                        key={emoji}
                        onClick={() => !isTaken && setSelectedEmoji(emoji)}
                        disabled={isTaken}
                        title={isTaken ? 'Already taken' : undefined}
                        className="aspect-square rounded-[10px] flex items-center justify-center transition-all"
                        style={{
                          background: isSelected ? alpha(theme.color1, 0.15) : 'rgba(255,255,255,.05)',
                          border: `1.5px solid ${isSelected ? theme.color1 : 'rgba(255,255,255,.15)'}`,
                          opacity: isTaken ? 0.3 : 1,
                          cursor: isTaken ? 'not-allowed' : 'pointer',
                          filter: isTaken ? 'grayscale(1)' : 'none',
                        }}
                      >
                        <div className="w-[60%] h-[60%] flex items-center justify-center">
                          <Emoji3D emoji={emoji} className="w-full h-full object-contain" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="YOUR NAME"
                className="w-full px-4 py-3.5 rounded-lg text-center text-xl font-bungee focus:outline-none transition-all uppercase tracking-wide"
                style={{
                  color: '#fff',
                  background: 'rgba(255,255,255,.05)',
                  border: `1.5px solid ${theme.color1}`,
                }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && playerName.trim() && handleJoin()}
              />

              <button
                onClick={handleJoin}
                disabled={!playerName.trim() || !selectedEmoji}
                className="w-full flex items-center justify-center font-bungee uppercase text-sm rounded-[10px] py-4 transition-[filter,opacity] hover:brightness-110 disabled:opacity-40"
                style={{ background: theme.color1, color: theme.onColor1 }}
              >
                <LogIn className="w-5 h-5 mr-2.5" />
                Join Battle
              </button>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
