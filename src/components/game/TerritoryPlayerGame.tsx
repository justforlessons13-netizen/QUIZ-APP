import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Skull, Swords, Trophy } from 'lucide-react';
import { getFirestore, doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { TerritoryGameState, TerritoryPack, compareTerritoryPlayers } from '@/types/territory';
import { getMapById } from '@/data/territory-maps';
import { TerritoryMapView } from '@/components/territory-game/TerritoryMapView';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

interface TerritoryPlayerGameProps {
  sessionId: string;
  playerId: string;
  playerName: string;
}

export function TerritoryPlayerGame({ sessionId, playerId, playerName }: TerritoryPlayerGameProps) {
  const [game, setGame] = useState<TerritoryGameState | null>(null);
  const [pack, setPack] = useState<TerritoryPack | null>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const submitInFlight = useRef(false);
  const [lastQuestionId, setLastQuestionId] = useState<number | null | undefined>(undefined);

  const [displayTime, setDisplayTime] = useState(0);
  const timerActiveRef = useRef(false);
  const localTimeRef = useRef(0);

  // ── Subscribe to the live game doc ──────────────────────────────────────
  useEffect(() => {
    const db = getFirestore();
    const gameRef = doc(db, 'territory-games', sessionId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        setGame(docSnap.data() as TerritoryGameState);
      }
    });
    return () => unsubscribe();
  }, [sessionId]);

  // ── Fetch the question pack once we know which one this game uses ──────
  useEffect(() => {
    if (!game?.packId || pack?.id === game.packId) return;
    const db = getFirestore();
    getDoc(doc(db, 'territoryPacks', game.packId)).then((snap) => {
      if (snap.exists()) setPack(snap.data() as TerritoryPack);
    });
  }, [game?.packId, pack?.id]);

  // ── Local smooth timer, syncing to server only when meaningfully off ───
  useEffect(() => {
    if (!game) return;
    const serverActive = game.timerActive;
    const serverTime = game.timeLeft;

    if (!serverActive) {
      timerActiveRef.current = false;
      localTimeRef.current = serverTime;
      setDisplayTime(serverTime);
      return;
    }

    if (!timerActiveRef.current) {
      timerActiveRef.current = true;
      localTimeRef.current = serverTime;
      setDisplayTime(serverTime);
    } else {
      const drift = localTimeRef.current - serverTime;
      if (Math.abs(drift) > 2) {
        localTimeRef.current = serverTime;
        setDisplayTime(serverTime);
      }
    }
  }, [game?.timerActive, game?.timeLeft]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!timerActiveRef.current) return;
      localTimeRef.current = Math.max(0, localTimeRef.current - 1);
      setDisplayTime(localTimeRef.current);
      if (localTimeRef.current <= 0) timerActiveRef.current = false;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Reset local answer state when the question changes ─────────────────
  useEffect(() => {
    if (!game) return;
    if (game.currentQuestionId !== lastQuestionId) {
      setMyAnswer('');
      setSubmitState('idle');
      submitInFlight.current = false;
      setLastQuestionId(game.currentQuestionId);
    }
  }, [game?.currentQuestionId, lastQuestionId]);

  // ── Submit answer: a single targeted field-path write to answers.{playerId} ──
  // Every player writes only their own slot, so simultaneous submissions never
  // contend for the same field the way a whole-document read-modify-write would.
  const submitAnswer = useCallback(async () => {
    if (!game || !myAnswer.trim()) return;
    if (submitInFlight.current || submitState !== 'idle') return;

    submitInFlight.current = true;
    setSubmitState('pending');

    const db = getFirestore();
    const gameRef = doc(db, 'territory-games', sessionId);
    const revealedAt = game.questionRevealedAt ?? Date.now();

    try {
      await updateDoc(gameRef, {
        [`answers.${playerId}`]: {
          answer: myAnswer.trim(),
          isCorrect: null,
          elapsedMs: Date.now() - revealedAt,
        },
      });
      setSubmitState('confirmed');
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitState('failed');
      submitInFlight.current = false;
    }
  }, [game, myAnswer, playerId, sessionId, submitState]);

  const retrySubmit = () => {
    setSubmitState('idle');
    submitInFlight.current = false;
  };

  if (!game) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.color1 }} />
        <p className="text-white/50">Connecting to battle...</p>
      </div>
    );
  }

  const me = game.players.find((p) => p.id === playerId);
  const map = getMapById(game.mapId);
  const question = pack?.questions.find((q) => q.id === game.currentQuestionId) ?? null;
  const isTimeUp = displayTime === 0;
  const isSubmitted = submitState === 'confirmed' || submitState === 'pending';
  const iAmEliminated = me?.eliminated ?? false;

  // ── Lobby ─────────────────────────────────────────────────────────────
  if (game.phase === 'lobby') {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="text-6xl animate-bob">{me?.emoji ?? '🎮'}</div>
        <h2 className="font-bungee text-white text-xl">{playerName}</h2>
        <p className="text-white/50 text-sm">{game.players.length} in the lobby</p>
        <div className="flex flex-wrap justify-center gap-2 max-w-xs">
          {game.players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border"
              style={{
                background: p.id === playerId ? alpha(theme.color1, 0.15) : 'rgba(255,255,255,.05)',
                borderColor: p.id === playerId ? alpha(theme.color1, 0.4) : 'rgba(255,255,255,.1)',
                color: p.id === playerId ? theme.color1 : 'rgba(255,255,255,.6)',
              }}
            >
              <Emoji3D emoji={p.emoji} className="w-4 h-4" />
              {p.name}
            </div>
          ))}
        </div>
        <p className="font-bungee text-sm tracking-widest uppercase" style={{ color: theme.color1 }}>
          Waiting for host
        </p>
      </div>
    );
  }

  // ── Capture / Battle question ────────────────────────────────────────
  if (game.phase === 'capture' || game.phase === 'battle') {
    if (iAmEliminated) {
      return (
        <div className="flex-1 w-full flex flex-col items-center justify-center gap-4 p-8 text-center">
          <Skull className="w-12 h-12 text-white/30" />
          <h2 className="font-bungee text-white/70 text-lg">You've been eliminated</h2>
          <p className="text-white/40 text-sm">Watch the battle play out.</p>
          {map && <TerritoryMapView map={map} players={game.players} size={220} />}
        </div>
      );
    }

    return (
      <motion.div
        key={`q-${game.currentQuestionId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 w-full flex flex-col min-h-0"
      >
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-bungee text-lg"
            style={{ border: `2px solid ${isTimeUp ? '#f87171' : theme.color1}`, color: isTimeUp ? '#f87171' : theme.color1 }}
          >
            {displayTime}
          </div>
          <span
            className="font-bungee text-[11px] uppercase tracking-widest px-3.5 py-2 rounded-2xl"
            style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.4)}`, color: theme.color1 }}
          >
            {game.phase === 'capture' ? 'Capture' : `Round ${game.currentRound}`}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-6 overflow-auto min-h-0 max-w-md mx-auto w-full">
          <h2 className="text-xl md:text-2xl font-bold text-center leading-tight text-white">
            {question?.text ?? 'Loading question...'}
          </h2>

          {isTimeUp && submitState === 'idle' && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold w-full text-center">
              Time's Up!
            </div>
          )}

          <AnimatePresence mode="wait">
            {isSubmitted ? (
              <motion.div
                key="submitted"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3 p-6 rounded-xl w-full"
                style={{
                  background: submitState === 'pending' ? alpha(theme.color1, 0.06) : alpha(theme.color1, 0.12),
                  border: `1px solid ${alpha(theme.color1, submitState === 'pending' ? 0.15 : 0.3)}`,
                }}
              >
                {submitState === 'pending' ? (
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.color1 }} />
                ) : (
                  <CheckCircle2 className="w-10 h-10" style={{ color: theme.color1 }} />
                )}
                <p className="font-bold" style={{ color: theme.color1 }}>
                  {submitState === 'pending' ? 'Locking in...' : 'Answer Locked In!'}
                </p>
              </motion.div>
            ) : submitState === 'failed' ? (
              <motion.div
                key="failed"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3 p-5 rounded-xl bg-red-500/10 border border-red-500/20 w-full text-center"
              >
                <p className="font-bold text-red-400 text-sm">Submission failed — tap to retry</p>
                <button
                  onClick={retrySubmit}
                  className="px-4 py-2 rounded-lg font-bungee text-xs uppercase"
                  style={{ background: theme.color1, color: theme.onColor1 }}
                >
                  Try Again
                </button>
              </motion.div>
            ) : (
              <motion.div key="input" className="w-full flex flex-col gap-4">
                {question?.type === 'choice' && question.options ? (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {question.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => setMyAnswer(option)}
                        disabled={isTimeUp}
                        className="p-4 rounded-xl border-2 text-sm font-medium transition-all"
                        style={{
                          borderColor: myAnswer === option ? theme.color1 : 'rgba(255,255,255,.15)',
                          background: myAnswer === option ? alpha(theme.color1, 0.15) : 'rgba(255,255,255,.05)',
                          color: myAnswer === option ? theme.color1 : 'rgba(255,255,255,.85)',
                          opacity: isTimeUp ? 0.5 : 1,
                          cursor: isTimeUp ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode={question?.type === 'quiz' ? 'decimal' : 'text'}
                    value={myAnswer}
                    onChange={(e) => setMyAnswer(e.target.value)}
                    placeholder={isTimeUp ? 'Too late!' : question?.type === 'quiz' ? 'Type a number...' : 'Type your answer...'}
                    disabled={isTimeUp}
                    className="w-full px-4 py-3 rounded-xl text-center text-lg focus:outline-none"
                    style={{
                      background: 'rgba(255,255,255,.05)',
                      border: `1.5px solid ${theme.color1}`,
                      color: '#fff',
                      opacity: isTimeUp ? 0.5 : 1,
                    }}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && myAnswer.trim() && !isTimeUp && submitAnswer()}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isSubmitted && submitState !== 'failed' && (
          <div className="flex-shrink-0 flex justify-center border-t border-white/10 py-4">
            <button
              onClick={submitAnswer}
              disabled={!myAnswer.trim() || isTimeUp}
              className="w-full max-w-md mx-6 py-3.5 rounded-xl font-bungee text-sm uppercase tracking-wide disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: theme.color1, color: theme.onColor1 }}
            >
              <Swords className="w-4 h-4" /> Lock In Answer
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // ── Round reveal ─────────────────────────────────────────────────────
  if (game.phase === 'round-reveal') {
    const isCapturePhase = game.currentRound === 0;
    const capturedId = game.lastCaptures?.[playerId];
    const capturedName = capturedId ? map?.nodes.find((n) => n.id === capturedId)?.name : null;
    const wasEliminated = game.eliminatedThisRound?.includes(playerId) ?? false;

    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-5 p-8 text-center">
        {iAmEliminated ? (
          <>
            <Skull className="w-12 h-12 text-white/30" />
            <h2 className="font-bungee text-white/70 text-lg">You've been eliminated</h2>
          </>
        ) : wasEliminated ? (
          <>
            <Skull className="w-12 h-12" style={{ color: '#f87171' }} />
            <h2 className="font-bungee text-lg" style={{ color: '#f87171' }}>Your base was captured!</h2>
          </>
        ) : capturedName ? (
          <>
            <div className="text-5xl">🚩</div>
            <h2 className="font-bungee text-lg" style={{ color: theme.color1 }}>
              {isCapturePhase ? `Base claimed: ${capturedName}` : `Captured ${capturedName}!`}
            </h2>
          </>
        ) : (
          <>
            <div className="text-5xl">🛡️</div>
            <h2 className="font-bungee text-white/70 text-lg">No capture this round</h2>
          </>
        )}
        {map && <TerritoryMapView map={map} players={game.players} lastCaptures={game.lastCaptures ?? {}} size={220} />}
        <p className="text-xs text-white/40 uppercase tracking-widest animate-pulse">Waiting for host...</p>
      </div>
    );
  }

  // ── Final standings ──────────────────────────────────────────────────
  if (game.phase === 'final-standings' || game.phase === 'finished') {
    const ranked = [...game.players].sort(compareTerritoryPlayers);
    const myRank = ranked.findIndex((p) => p.id === playerId) + 1;
    const isWinner = myRank === 1;

    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Trophy className="w-16 h-16" style={{ color: isWinner ? theme.color1 : 'rgba(255,255,255,.3)' }} />
        <h2 className="font-bungee text-white text-2xl">{isWinner ? 'Victory!' : 'Battle Over'}</h2>
        <p className="text-white/50">{isWinner ? 'You conquered the map!' : `Well played, ${playerName}.`}</p>
        <div className="w-full max-w-xs rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}>
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Final Position</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-black" style={{ color: isWinner ? theme.color1 : '#fff' }}>#{myRank}</span>
              <span className="text-lg text-white/40 font-medium">/ {ranked.length}</span>
            </div>
          </div>
          <div className="w-full h-px bg-white/10" />
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Territories / Score</p>
            <p className="text-2xl font-bold text-white">{me?.ownedNodeIds.length ?? 0} <span className="text-sm font-normal text-white/40">territories</span></p>
            <p className="text-lg font-bold" style={{ color: theme.color1 }}>{me?.score ?? 0} pts</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <Loader2 className="w-6 h-6 animate-spin text-white/50" />
      <p className="text-white/40">Waiting for host...</p>
    </div>
  );
}
