import { useState, useCallback, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import {
  BeeGameState,
  BeePlayer,
  BeeWord,
  BeeGamePhase,
  createEmptyBeeGameState,
  compareBeePlayers,
} from '@/types/bee';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Orders active players per the fixed roster order, then rotates the start
// point by round so the same player doesn't always go first.
function buildRoundQueue(activePlayers: BeePlayer[], turnOrder: string[], round: number): string[] {
  const orderedIds = turnOrder.filter((id) => activePlayers.some((p) => p.id === id));
  if (orderedIds.length === 0) return [];
  const startIdx = (round - 1) % orderedIds.length;
  return [...orderedIds.slice(startIdx), ...orderedIds.slice(0, startIdx)];
}

// Deep comparison helper — prevents writing identical arrays/objects every render
function getChanges(prev: BeeGameState, next: BeeGameState): Partial<BeeGameState> | null {
  const changes: Partial<BeeGameState> = {};
  let hasChange = false;
  (Object.keys(next) as Array<keyof BeeGameState>).forEach((key) => {
    const a = next[key];
    const b = prev[key];
    if (typeof a === 'object' && a !== null) {
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        (changes as any)[key] = a;
        hasChange = true;
      }
    } else if (a !== b) {
      (changes as any)[key] = a;
      hasChange = true;
    }
  });
  return hasChange ? changes : null;
}

export function useBeeGame(
  sessionId: string,
  packId: string,
  packName: string,
  words: BeeWord[],
  ownerId?: string
) {
  const [game, setGame] = useState<BeeGameState>(() =>
    createEmptyBeeGameState(sessionId, packId, packName, ownerId)
  );
  const [loading, setLoading] = useState(true);

  const isRemoteUpdate = useRef(false);
  const prevGameRef = useRef<BeeGameState>(game);

  // Subscribe to Firestore for real-time updates
  useEffect(() => {
    const db = getFirestore();
    const gameRef = doc(db, 'bee-games', sessionId);

    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as BeeGameState;
        isRemoteUpdate.current = true;
        setGame(data);
        prevGameRef.current = data;
      } else {
        setDoc(gameRef, game);
      }
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Persist on change to local state (Smart Save)
  useEffect(() => {
    if (loading) return;

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    if (game.sessionId === sessionId) {
      const db = getFirestore();
      const gameRef = doc(db, 'bee-games', sessionId);

      const prev = prevGameRef.current;
      const changes = getChanges(prev, game);

      if (changes && Object.keys(changes).length > 0) {
        updateDoc(gameRef, changes).catch((err) => console.error('Save failed:', err));
      }
      prevGameRef.current = game;
    }
  }, [game, loading, sessionId]);

  const startSession = useCallback(
    (playerNames: string[]) => {
      setGame((prev) => {
        if (prev.phase !== 'roster-entry') return prev;
        const cleanNames = playerNames.map((n) => n.trim()).filter(Boolean);
        const dedupedNames = Array.from(new Set(cleanNames));
        const players: BeePlayer[] = dedupedNames.map((name) => ({
          id: crypto.randomUUID(),
          name,
          status: 'active',
          wordsCorrect: 0,
          wordsAttempted: 0,
          eliminatedAtRound: null,
          eliminatedOnWordId: null,
          totalTimeMs: 0,
        }));
        const turnOrder = shuffle(players.map((p) => p.id));
        const wordOrder = shuffle(words.map((w) => w.id));

        return {
          ...prev,
          players,
          turnOrder,
          wordOrder,
          currentWordIndex: -1,
          currentPlayerId: null,
          currentRoundQueue: [],
          phase: 'stage-pairing',
        };
      });
    },
    [words]
  );

  // Called from the stage-pairing screen once the host is ready to start Round 1
  const beginFirstRound = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'stage-pairing') return prev;
      const activePlayers = prev.players.filter((p) => p.status === 'active');
      if (activePlayers.length === 0) return prev;

      if (prev.wordOrder.length < activePlayers.length) {
        return { ...prev, phase: 'tie-break' };
      }

      const queue = buildRoundQueue(activePlayers, prev.turnOrder, 1);
      const [firstId, ...rest] = queue;

      return {
        ...prev,
        currentRoundQueue: rest,
        currentPlayerId: firstId ?? null,
        currentWordIndex: 0,
        currentRound: 1,
        hintsUsedThisTurn: [],
        lastResult: null,
        phase: 'turn-intro',
      };
    });
  }, []);

  const revealWord = useCallback(() => {
    setGame((prev) =>
      prev.phase === 'turn-intro' ? { ...prev, phase: 'word-cycle', wordRevealedAt: Date.now() } : prev
    );
  }, []);

  const requestHint = useCallback((type: 'definition' | 'sentence') => {
    setGame((prev) => {
      const isRevealed = prev.hintsUsedThisTurn.includes(type);
      return {
        ...prev,
        hintsUsedThisTurn: isRevealed
          ? prev.hintsUsedThisTurn.filter((t) => t !== type)
          : [...prev.hintsUsedThisTurn, type],
      };
    });
  }, []);

  // Host-side manual grading — kept as a fallback if the stage device is unavailable.
  // The device's own runTransaction submit (see BeeStageDevice.tsx) writes the same shape directly.
  const submitResult = useCallback((correct: boolean) => {
    setGame((prev) => {
      if (prev.phase !== 'word-cycle' || !prev.currentPlayerId) return prev;
      const wordId = prev.wordOrder[prev.currentWordIndex] ?? '';
      const elapsedMs = prev.wordRevealedAt ? Date.now() - prev.wordRevealedAt : null;

      const players = prev.players.map((p) => {
        if (p.id !== prev.currentPlayerId) return p;
        return {
          ...p,
          wordsAttempted: p.wordsAttempted + 1,
          wordsCorrect: correct ? p.wordsCorrect + 1 : p.wordsCorrect,
          status: correct ? p.status : ('eliminated' as const),
          eliminatedAtRound: correct ? p.eliminatedAtRound : prev.currentRound,
          eliminatedOnWordId: correct ? p.eliminatedOnWordId : wordId,
          totalTimeMs: p.totalTimeMs + (elapsedMs ?? 0),
        };
      });

      return {
        ...prev,
        players,
        lastResult: { playerId: prev.currentPlayerId, wordId, correct, elapsedMs },
        phase: 'result',
      };
    });
  }, []);

  // Narrow undo window: only while still on the 'result' screen for the turn just graded.
  // Pure conditional flip — never replays submitResult, so wordsAttempted is touched exactly once.
  const overrideResult = useCallback((correct: boolean) => {
    setGame((prev) => {
      if (prev.phase !== 'result' || !prev.lastResult) return prev;
      const { playerId, wordId, correct: prevCorrect } = prev.lastResult;
      if (prevCorrect === null || prevCorrect === correct) return prev;

      const players = prev.players.map((p) => {
        if (p.id !== playerId) return p;
        return correct
          ? { ...p, wordsCorrect: p.wordsCorrect + 1, status: 'active' as const, eliminatedAtRound: null, eliminatedOnWordId: null }
          : { ...p, wordsCorrect: p.wordsCorrect - 1, status: 'eliminated' as const, eliminatedAtRound: prev.currentRound, eliminatedOnWordId: wordId };
      });

      return { ...prev, players, lastResult: { ...prev.lastResult, correct } };
    });
  }, []);

  const skipPlayer = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'word-cycle' || !prev.currentPlayerId) return prev;
      const wordId = prev.wordOrder[prev.currentWordIndex] ?? '';
      return {
        ...prev,
        lastResult: { playerId: prev.currentPlayerId, wordId, correct: null, elapsedMs: null },
        phase: 'result',
      };
    });
  }, []);

  const substituteWord = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'word-cycle') return prev;
      let nextWordIndex = prev.currentWordIndex + 1;
      let nextWordOrder = prev.wordOrder;
      if (nextWordIndex >= prev.wordOrder.length) {
        nextWordOrder = shuffle(prev.wordOrder);
        nextWordIndex = 0;
      }
      return {
        ...prev,
        currentWordIndex: nextWordIndex,
        wordOrder: nextWordOrder,
        hintsUsedThisTurn: [],
        wordRevealedAt: Date.now(), // fresh word, fresh stopwatch
      };
    });
  }, []);

  // Advances within the current round's queue; when it's empty, checkpoints at the leaderboard.
  const callNextPlayer = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'result') return prev;

      if (prev.currentRoundQueue.length === 0) {
        return { ...prev, phase: 'round-leaderboard', lastResult: null };
      }

      const [nextId, ...rest] = prev.currentRoundQueue;
      return {
        ...prev,
        currentRoundQueue: rest,
        currentPlayerId: nextId,
        currentWordIndex: prev.currentWordIndex + 1,
        hintsUsedThisTurn: [],
        lastResult: null,
        phase: 'turn-intro',
      };
    });
  }, []);

  // Called from the round-leaderboard screen's "Next Round" button
  const startNextRound = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'round-leaderboard') return prev;
      const activePlayers = prev.players.filter((p) => p.status === 'active');

      // Snapshot current ranks — used by the next leaderboard visit for rank-change arrows
      const rankedNow = [...prev.players].sort(compareBeePlayers);
      const previousRankMap = Object.fromEntries(rankedNow.map((p, i) => [p.id, i + 1]));

      if (activePlayers.length <= 1) {
        return { ...prev, phase: 'champion', currentPlayerId: activePlayers[0]?.id ?? null, lastResult: null };
      }

      const freshWordsRemaining = prev.wordOrder.length - (prev.currentWordIndex + 1);
      if (freshWordsRemaining < activePlayers.length) {
        return { ...prev, phase: 'tie-break' };
      }

      const nextRound = prev.currentRound + 1;
      const queue = buildRoundQueue(activePlayers, prev.turnOrder, nextRound);
      const [firstId, ...rest] = queue;

      return {
        ...prev,
        currentRoundQueue: rest,
        currentPlayerId: firstId ?? null,
        currentWordIndex: prev.currentWordIndex + 1,
        currentRound: nextRound,
        hintsUsedThisTurn: [],
        lastResult: null,
        previousRankMap,
        phase: 'turn-intro',
      };
    });
  }, []);

  // Repeatable from the tie-break screen — eliminates the slowest active player by cumulative time
  const eliminateSlowest = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'tie-break') return prev;
      const activePlayers = prev.players.filter((p) => p.status === 'active');
      if (activePlayers.length <= 1) {
        return { ...prev, phase: 'champion', currentPlayerId: activePlayers[0]?.id ?? null };
      }

      const slowest = activePlayers.reduce((a, b) => (b.totalTimeMs > a.totalTimeMs ? b : a));
      const players = prev.players.map((p) =>
        p.id === slowest.id
          ? { ...p, status: 'eliminated' as const, eliminatedAtRound: prev.currentRound, eliminatedOnWordId: null }
          : p
      );
      const remaining = players.filter((p) => p.status === 'active');

      return {
        ...prev,
        players,
        phase: remaining.length <= 1 ? 'champion' : 'tie-break',
        currentPlayerId: remaining.length <= 1 ? remaining[0]?.id ?? null : prev.currentPlayerId,
      };
    });
  }, []);

  const endGameEarly = useCallback(() => {
    setGame((prev) =>
      ['turn-intro', 'word-cycle', 'result', 'round-leaderboard', 'tie-break'].includes(prev.phase)
        ? { ...prev, phase: 'champion', lastResult: null }
        : prev
    );
  }, []);

  const setPhase = useCallback((phase: BeeGamePhase) => {
    setGame((prev) => ({ ...prev, phase }));
  }, []);

  const resetGame = useCallback(() => {
    const newGame = createEmptyBeeGameState(sessionId, packId, packName, ownerId);
    setGame(newGame);
    const db = getFirestore();
    setDoc(doc(db, 'bee-games', sessionId), newGame);
  }, [sessionId, packId, packName, ownerId]);

  return {
    game,
    loading,
    startSession,
    beginFirstRound,
    revealWord,
    requestHint,
    submitResult,
    overrideResult,
    skipPlayer,
    substituteWord,
    callNextPlayer,
    startNextRound,
    eliminateSlowest,
    endGameEarly,
    resetGame,
    setPhase,
  };
}
