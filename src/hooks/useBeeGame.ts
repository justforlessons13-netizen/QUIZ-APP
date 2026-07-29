import { useState, useCallback, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import {
  BeeGameState,
  BeePlayer,
  BeeWord,
  BeeGamePhase,
  BeeDifficulty,
  BEE_DIFFICULTY_TIERS,
  wordDifficulty,
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

// Picks `count` words for a round, fairly: every player in a round must draw from the same
// difficulty tier, so a tier is only used if it has enough UNUSED words left to cover the whole
// round. Escalation is monotonic (starts at `minTierIndex`, the tier the previous round locked
// in) — once a game moves up a tier it never drops back down, even if a later round's smaller
// player count would technically fit in the leftover easy words again.
function pickRoundWords(
  words: BeeWord[],
  usedIds: Set<string>,
  count: number,
  minTierIndex: number
): { ids: string[]; tier: BeeDifficulty } | null {
  for (let i = minTierIndex; i < BEE_DIFFICULTY_TIERS.length; i++) {
    const tier = BEE_DIFFICULTY_TIERS[i];
    const available = words.filter((w) => wordDifficulty(w) === tier && !usedIds.has(w.id));
    if (available.length >= count) {
      return { ids: shuffle(available).slice(0, count).map((w) => w.id), tier };
    }
  }
  return null;
}

// The tier the most recently appended word belongs to — used as the floor for the next round's
// tier so difficulty never de-escalates mid-game. Round 1 (empty wordOrder) always starts at easy.
function currentTierIndex(words: BeeWord[], wordOrder: string[]): number {
  if (wordOrder.length === 0) return 0;
  const lastId = wordOrder[wordOrder.length - 1];
  const lastWord = words.find((w) => w.id === lastId);
  if (!lastWord) return 0;
  return BEE_DIFFICULTY_TIERS.indexOf(wordDifficulty(lastWord));
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

        return {
          ...prev,
          players,
          turnOrder,
          // Built incrementally per round (see pickRoundWords) so each round can be locked to a
          // single, fair difficulty tier instead of one flat shuffle of the whole pack.
          wordOrder: [],
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

      const picked = pickRoundWords(words, new Set(prev.wordOrder), activePlayers.length, 0);
      if (!picked) {
        // Out of words before round 1 even starts — nobody has answered anything, so rank by
        // name for a stable (if arbitrary) result rather than pretending time decided it.
        const winner = [...activePlayers].sort(compareBeePlayers)[0];
        return { ...prev, phase: 'champion', currentPlayerId: winner?.id ?? null, lastResult: null };
      }

      const queue = buildRoundQueue(activePlayers, prev.turnOrder, 1);
      const [firstId, ...rest] = queue;

      return {
        ...prev,
        wordOrder: [...prev.wordOrder, ...picked.ids],
        currentRoundQueue: rest,
        currentPlayerId: firstId ?? null,
        currentWordIndex: prev.wordOrder.length,
        currentRound: 1,
        hintsUsedThisTurn: [],
        lastResult: null,
        phase: 'turn-intro',
      };
    });
  }, [words]);

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

  // Swaps the current word for a fresh, unused one from the SAME difficulty tier — in place,
  // rather than advancing to a later slot, so it can't accidentally borrow a word reserved for
  // a future round's fairness guarantee.
  const substituteWord = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'word-cycle') return prev;
      const currentId = prev.wordOrder[prev.currentWordIndex];
      const currentWord = words.find((w) => w.id === currentId);
      if (!currentWord) return prev;

      const usedIds = new Set(prev.wordOrder);
      const tier = wordDifficulty(currentWord);
      const candidates = words.filter((w) => wordDifficulty(w) === tier && !usedIds.has(w.id));
      if (candidates.length === 0) return prev; // no same-tier replacement left — keep current word

      const replacement = shuffle(candidates)[0];
      const wordOrder = [...prev.wordOrder];
      wordOrder[prev.currentWordIndex] = replacement.id;

      return {
        ...prev,
        wordOrder,
        hintsUsedThisTurn: [],
        wordRevealedAt: Date.now(), // fresh word, fresh stopwatch
      };
    });
  }, [words]);

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

      const minTier = currentTierIndex(words, prev.wordOrder);
      const picked = pickRoundWords(words, new Set(prev.wordOrder), activePlayers.length, minTier);
      if (!picked) {
        // Out of words for everyone still standing — the host never picks a winner here.
        // Nobody is eliminated: they all stay 'active' so the final reveal shows each of their
        // actual total times (see BeeStandings' timeLabel) instead of "Eliminated", and
        // compareBeePlayers' own time tiebreak ranks the fastest total time in first.
        return { ...prev, phase: 'champion', currentPlayerId: [...activePlayers].sort(compareBeePlayers)[0]?.id ?? null, lastResult: null, previousRankMap };
      }

      const nextRound = prev.currentRound + 1;
      const queue = buildRoundQueue(activePlayers, prev.turnOrder, nextRound);
      const [firstId, ...rest] = queue;

      return {
        ...prev,
        wordOrder: [...prev.wordOrder, ...picked.ids],
        currentRoundQueue: rest,
        currentPlayerId: firstId ?? null,
        currentWordIndex: prev.wordOrder.length,
        currentRound: nextRound,
        hintsUsedThisTurn: [],
        lastResult: null,
        previousRankMap,
        phase: 'turn-intro',
      };
    });
  }, [words]);

  const endGameEarly = useCallback(() => {
    setGame((prev) =>
      ['turn-intro', 'word-cycle', 'result', 'round-leaderboard'].includes(prev.phase)
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
    endGameEarly,
    resetGame,
    setPhase,
  };
}
