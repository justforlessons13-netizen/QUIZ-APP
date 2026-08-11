import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Skull, Swords, Trophy, Eye } from 'lucide-react';
import { getFirestore, doc, onSnapshot, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { TerritoryGameState, TerritoryPack, TerritoryRoundKind, compareTerritoryPlayers } from '@/types/territory';
import { getMapById } from '@/data/territory-maps';
import { applyPick } from '@/lib/territory-engine';
import { TerritoryMapView } from '@/components/territory-game/TerritoryMapView';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

const ROUND_LABEL: Record<TerritoryRoundKind, string> = {
  'base-capture': 'Base Capture',
  'land-capture': 'Land Capture',
  battle: 'Battle',
};
const PICK_VERB: Record<TerritoryRoundKind, string> = {
  'base-capture': 'Choose your base!',
  'land-capture': 'Choose land to claim!',
  battle: 'Choose your target!',
};

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
  const [pickInFlight, setPickInFlight] = useState(false);

  const [displayTime, setDisplayTime] = useState(0);
  const timerActiveRef = useRef(false);
  const localTimeRef = useRef(0);

  const [resultFlash, setResultFlash] = useState<TerritoryGameState['lastBattleResult']>(null);
  const lastFlashKey = useRef<string | null>(null);

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

  // ── Brief inline flash for a battle exchange's outcome — battle has no separate reveal
  // screen (a win streak can mean many quick exchanges in a row), so this fades in over the
  // pick/question screen instead.
  useEffect(() => {
    if (!game?.lastBattleResult) return;
    const key = JSON.stringify(game.lastBattleResult) + game.currentQuestionId;
    if (key === lastFlashKey.current) return;
    lastFlashKey.current = key;
    setResultFlash(game.lastBattleResult);
    const t = setTimeout(() => setResultFlash(null), 2600);
    return () => clearTimeout(t);
  }, [game?.lastBattleResult, game?.currentQuestionId]);

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

  // ── Pick a target (base slot, neutral land, or battle attack target) ───────
  // Applied via a transaction rather than a plain write, since applyPick computes derived state
  // (next picker, income, or — for battle — the next duel question) that must be read fresh
  // against whatever's actually on the server right now. Only the player whose turn it is calls
  // this, so there's no contention to worry about, unlike simultaneous answer submissions.
  const pickTarget = useCallback(async (nodeId: string) => {
    if (!pack || pickInFlight) return;
    setPickInFlight(true);
    const db = getFirestore();
    const gameRef = doc(db, 'territory-games', sessionId);
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(gameRef);
        if (!snap.exists()) return;
        const current = snap.data() as TerritoryGameState;
        const map = getMapById(current.mapId);
        if (!map) return;
        const next = applyPick(current, playerId, nodeId, map, pack.questions);
        transaction.update(gameRef, next as unknown as Record<string, unknown>);
      });
    } catch (err) {
      console.error('Pick failed:', err);
    } finally {
      setPickInFlight(false);
    }
  }, [pack, pickInFlight, playerId, sessionId]);

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

  const ResultFlash = resultFlash && (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full font-bungee text-xs uppercase whitespace-nowrap"
      style={{
        background: resultFlash.hit ? alpha(theme.color1, 0.9) : 'rgba(0,0,0,0.75)',
        color: resultFlash.hit ? theme.onColor1 : '#fff',
        border: `1px solid ${resultFlash.hit ? theme.color1 : 'rgba(255,255,255,.2)'}`,
      }}
    >
      {resultFlash.eliminated
        ? `${game.players.find((p) => p.id === resultFlash!.defenderId)?.name ?? 'A base'} eliminated!`
        : resultFlash.hit
          ? `Hit! ${resultFlash.starsLeft !== undefined ? `${resultFlash.starsLeft} star${resultFlash.starsLeft === 1 ? '' : 's'} left` : 'Territory captured'}`
          : `${game.players.find((p) => p.id === resultFlash!.defenderId)?.name ?? 'Defender'} held the line`}
    </motion.div>
  );

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

  // ── Pick a target ───────────────────────────────────────────────────
  if (game.phase === 'pick') {
    const myTurn = game.pickOrder[game.pickIndex] === playerId;
    const picker = game.players.find((p) => p.id === game.pickOrder[game.pickIndex]);
    const attacker = game.roundKind === 'battle' ? game.players.find((p) => p.id === game.attackerId) : null;

    return (
      <div className="relative flex-1 w-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AnimatePresence>{ResultFlash}</AnimatePresence>
        <div
          className="font-bungee text-[11px] uppercase tracking-widest px-3.5 py-1.5 rounded-full"
          style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.4)}`, color: theme.color1 }}
        >
          {ROUND_LABEL[game.roundKind]}{game.roundKind === 'battle' && attacker ? ` · ${attacker.name}'s turn` : ''}
        </div>

        {myTurn ? (
          <>
            <h2 className="font-bungee text-white text-lg">{PICK_VERB[game.roundKind]}</h2>
            <p className="text-white/40 text-xs uppercase tracking-widest">Tap a glowing tile</p>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Emoji3D emoji={picker?.emoji ?? '🎮'} className="w-6 h-6" />
            <h2 className="font-bungee text-white/70 text-base">{picker?.name ?? 'Someone'} is choosing…</h2>
          </div>
        )}

        {map && (
          <TerritoryMapView
            map={map}
            players={game.players}
            size={260}
            highlightedNodeIds={game.availablePickIds}
            onSelectNode={myTurn && !pickInFlight ? pickTarget : undefined}
          />
        )}

        {pickInFlight && <Loader2 className="w-5 h-5 animate-spin" style={{ color: theme.color1 }} />}
      </div>
    );
  }

  // ── Question (broadcast base/land-capture, or a battle duel) ────────────
  if (game.phase === 'question') {
    const amResponding = game.respondingPlayerIds.includes(playerId);

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

    if (!amResponding) {
      // Battle duel between two other players — everyone else just watches.
      const attacker = game.players.find((p) => p.id === game.attackerId);
      const defender = game.players.find((p) => p.id === game.defenderId);
      return (
        <div className="relative flex-1 w-full flex flex-col items-center justify-center gap-4 p-8 text-center">
          <AnimatePresence>{ResultFlash}</AnimatePresence>
          <Eye className="w-8 h-8 text-white/30" />
          <h2 className="font-bungee text-white/70 text-lg">
            {attacker?.name ?? 'Someone'} vs {defender?.name ?? 'someone'}
          </h2>
          <p className="text-white/40 text-xs uppercase tracking-widest">Spectating this battle</p>
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
        className="relative flex-1 w-full flex flex-col min-h-0"
      >
        <AnimatePresence>{ResultFlash}</AnimatePresence>
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
            {ROUND_LABEL[game.roundKind]}
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

  // ── Base-capture / land-capture reveal ──────────────────────────────
  if (game.phase === 'reveal') {
    const isBaseCapture = game.roundKind === 'base-capture';
    const capturedIds = game.lastCaptures?.[playerId] ?? [];
    const capturedNames = capturedIds.map((id) => map?.nodes.find((n) => n.id === id)?.name).filter(Boolean) as string[];

    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-5 p-8 text-center">
        {capturedNames.length > 0 ? (
          <>
            <div className="text-5xl">🚩</div>
            <h2 className="font-bungee text-lg" style={{ color: theme.color1 }}>
              {isBaseCapture ? `Base claimed: ${capturedNames[0]}` : `Claimed ${capturedNames.join(', ')}`}
            </h2>
          </>
        ) : (
          <>
            <div className="text-5xl">🛡️</div>
            <h2 className="font-bungee text-white/70 text-lg">{isBaseCapture ? 'Base assigned automatically' : 'No capture this round'}</h2>
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
