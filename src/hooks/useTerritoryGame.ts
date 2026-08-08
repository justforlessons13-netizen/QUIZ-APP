import { useState, useCallback, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import {
  TerritoryGameState, TerritoryQuestion, TerritoryPlayer, TerritoryMode,
  TerritoryVisibility, TerritoryDuration, TerritoryPhase,
  createEmptyTerritoryGame, playerCountFor, PLAYER_EMOJIS, compareTerritoryPlayers,
} from '@/types/territory';
import { pickRandomMap, getMapById, neighborsOf } from '@/data/territory-maps';

export const QUESTION_SECONDS = 20;
const CORRECT_POINTS = 10;
const SPEED_BONUS_MAX = 5;
// Rank (0 = fastest correct answer) -> territories captured this round. 3rd place gets none;
// duo games never reach index 2, so the loser still gets the "2nd place" tier, not a shutout.
const CAPTURE_TIERS = [2, 1, 0];

function checkAnswer(question: TerritoryQuestion, raw: string): boolean {
  const given = raw.trim().toLowerCase();
  if (!given) return false;
  if (question.type === 'quiz') {
    const a = parseFloat(given);
    const b = parseFloat(question.answer);
    return !Number.isNaN(a) && !Number.isNaN(b) && a === b;
  }
  return given === question.answer.trim().toLowerCase();
}

function pickQuestion(questions: TerritoryQuestion[], usedIds: number[]): TerritoryQuestion | null {
  if (questions.length === 0) return null;
  const fresh = questions.filter((q) => !usedIds.includes(q.id));
  const pool = fresh.length > 0 ? fresh : questions; // wrap around once the pool is exhausted
  return pool[Math.floor(Math.random() * pool.length)];
}

// Deep comparison helper — prevents writing identical objects every render. Mirrors
// useLiveGame.ts's getChanges exactly.
function getChanges(prev: TerritoryGameState, next: TerritoryGameState): Partial<TerritoryGameState> | null {
  const changes: Partial<TerritoryGameState> = {};
  let hasChange = false;
  (Object.keys(next) as Array<keyof TerritoryGameState>).forEach((key) => {
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

export function useTerritoryGame(
  sessionId: string,
  packId: string,
  packName: string,
  questions: TerritoryQuestion[],
  mode: TerritoryMode,
  visibility: TerritoryVisibility,
  duration: TerritoryDuration,
  // Only the primary host tab should drive the countdown — see useLiveGame.ts's identical param
  // for why (a second browser context running its own setInterval would race it over Firestore).
  isAuthoritative: boolean = true
) {
  // Picked once per mounted instance — only actually used if this client is the one that creates
  // the Firestore doc (the "doesn't exist yet" branch below); a client joining an already-created
  // game just receives the real mapId from the snapshot.
  const [initialMapId] = useState(() => pickRandomMap(playerCountFor(mode)).id);

  const [game, setGame] = useState<TerritoryGameState>(() =>
    createEmptyTerritoryGame(sessionId, packId, packName, mode, visibility, duration, initialMapId)
  );
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRemoteUpdate = useRef(false);
  const prevGameRef = useRef<TerritoryGameState>(game);
  const resolvingRef = useRef(false);

  useEffect(() => {
    const db = getFirestore();
    const gameRef = doc(db, 'territory-games', sessionId);

    const applySnapshot = (data: TerritoryGameState) => {
      isRemoteUpdate.current = true;
      setGame(data);
      prevGameRef.current = data;
    };

    const unsubscribe = onSnapshot(
      gameRef,
      (docSnap) => {
        if (docSnap.exists()) {
          applySnapshot(docSnap.data() as TerritoryGameState);
        } else {
          setDoc(gameRef, game);
        }
        setLoading(false);
      },
      (err) => console.error('Territory game listener error:', err)
    );

    // Same defensive resync as QGame's useLiveGame — a backgrounded/unfocused window (this game
    // has no projector mode yet, but a phone screen locking mid-game is the equivalent risk) can
    // have its realtime stream silently stop delivering updates.
    const resync = () => {
      getDoc(gameRef).then((snap) => {
        if (snap.exists()) applySnapshot(snap.data() as TerritoryGameState);
      }).catch((err) => console.error('Resync failed:', err));
    };
    const onVisible = () => { if (document.visibilityState === 'visible') resync(); };
    document.addEventListener('visibilitychange', onVisible);
    const resyncInterval = setInterval(resync, 20000);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(resyncInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (loading) return;
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    if (game.sessionId === sessionId) {
      const db = getFirestore();
      const gameRef = doc(db, 'territory-games', sessionId);
      const prev = prevGameRef.current;
      const changes = getChanges(prev, game);
      if (changes && Object.keys(changes).length > 0) {
        updateDoc(gameRef, changes).catch((err) => console.error('Save failed:', err));
      }
      prevGameRef.current = game;
    }
  }, [game, loading, sessionId]);

  // Timer — only the authoritative instance decrements/persists it.
  useEffect(() => {
    if (!isAuthoritative) return;
    if (game.timerActive && game.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setGame((prev) => {
          if (prev.timeLeft <= 1) return { ...prev, timeLeft: 0, timerActive: false };
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game.timerActive, isAuthoritative]);

  const addPlayer = useCallback((name: string, emoji?: string) => {
    setGame((prev) => {
      if (prev.players.length >= playerCountFor(prev.mode)) return prev;
      const usedEmojis = prev.players.map((p) => p.emoji);
      const availableEmoji = emoji || PLAYER_EMOJIS.find((e) => !usedEmojis.includes(e)) || '🎮';
      const player: TerritoryPlayer = {
        id: crypto.randomUUID(),
        name,
        emoji: availableEmoji,
        baseNodeId: null,
        ownedNodeIds: [],
        score: 0,
        eliminated: false,
      };
      return { ...prev, players: [...prev.players, player] };
    });
  }, []);

  const removePlayer = useCallback((id: string) => {
    setGame((prev) => ({ ...prev, players: prev.players.filter((p) => p.id !== id) }));
  }, []);

  const setPhase = useCallback((phase: TerritoryPhase) => {
    setGame((prev) => ({ ...prev, phase }));
  }, []);

  // Draws a fresh question and (re)starts the timer — shared by the capture question and every
  // battle round.
  const drawQuestion = useCallback((prev: TerritoryGameState): TerritoryGameState => {
    const q = pickQuestion(questions, prev.usedQuestionIds);
    if (!q) return prev;
    return {
      ...prev,
      currentQuestionId: q.id,
      usedQuestionIds: [...prev.usedQuestionIds, q.id],
      answers: {},
      timeLeft: QUESTION_SECONDS,
      timerActive: true,
      questionRevealedAt: Date.now(),
      lastCaptures: {},
      lastDefenders: {},
      lastIncome: {},
      eliminatedThisRound: [],
    };
  }, [questions]);

  // Host action: everyone has joined, begin the Capture question.
  const startCapture = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'lobby') return prev;
      return drawQuestion({ ...prev, phase: 'capture' });
    });
  }, [drawQuestion]);

  // Targeted field-path write — mirrors PlayerGame.tsx's submitAnswer. Writing only
  // answers.{playerId} (instead of routing through the whole-document setGame/diff above) means
  // simultaneous submissions from different player devices never contend over the same field.
  const submitAnswer = useCallback((playerId: string, answer: string) => {
    const revealedAt = game.questionRevealedAt ?? Date.now();
    const elapsedMs = Date.now() - revealedAt;
    const db = getFirestore();
    const gameRef = doc(db, 'territory-games', sessionId);
    updateDoc(gameRef, {
      [`answers.${playerId}`]: { answer, isCorrect: null, elapsedMs },
    }).catch((err) => console.error('Submit answer failed:', err));
  }, [game.questionRevealedAt, sessionId]);

  // Resolves the current question once every active player has answered or time runs out —
  // computes correctness, applies captures/eliminations in speed order, and advances the phase.
  // Auto-triggered (see the effect below) rather than requiring a host click each round, since
  // these are objectively-scored questions with only 2-3 players.
  const resolveRound = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'capture' && prev.phase !== 'battle') return prev;
      const question = questions.find((q) => q.id === prev.currentQuestionId);
      const map = getMapById(prev.mapId);
      if (!question || !map) return prev;

      const active = prev.players.filter((p) => !p.eliminated);
      const scored = active
        .map((p) => {
          const a = prev.answers[p.id];
          const isCorrect = a ? checkAnswer(question, a.answer) : false;
          const elapsedMs = a?.elapsedMs ?? Infinity;
          return { player: p, isCorrect, elapsedMs };
        })
        .sort((a, b) => a.elapsedMs - b.elapsedMs);

      const qualifying = scored.filter((s) => s.isCorrect);

      let players = [...prev.players];
      const lastCaptures: Record<string, string> = {};
      const lastDefenders: Record<string, string> = {};
      const eliminatedThisRound: string[] = [];

      const updatePlayer = (id: string, fn: (p: TerritoryPlayer) => TerritoryPlayer) => {
        players = players.map((p) => (p.id === id ? fn(p) : p));
      };

      // Territory income: every owned node pays out its value at the end of the round —
      // applied after captures below so newly-claimed ground counts immediately, matching the
      // reference game's growing per-team totals.
      const applyIncome = (): Record<string, number> => {
        const income: Record<string, number> = {};
        players.forEach((p) => {
          if (p.eliminated) return;
          const total = p.ownedNodeIds.reduce((sum, nodeId) => {
            const node = map.nodes.find((n) => n.id === nodeId);
            return sum + (node?.value ?? 0);
          }, 0);
          if (total > 0) {
            income[p.id] = total;
            updatePlayer(p.id, (pl) => ({ ...pl, score: pl.score + total }));
          }
        });
        return income;
      };

      if (prev.phase === 'capture') {
        // Base-pick order: correct-and-fastest first, then everyone else by speed. Assign each
        // player, in that order, the next available base slot on the map.
        const order = [...qualifying, ...scored.filter((s) => !s.isCorrect)];
        const baseSlots = map.nodes.filter((n) => n.isBaseSlot).map((n) => n.id);
        order.forEach((s, i) => {
          const baseId = baseSlots[i];
          if (!baseId) return;
          updatePlayer(s.player.id, (p) => ({ ...p, baseNodeId: baseId, ownedNodeIds: [baseId] }));
        });

        const lastIncome = applyIncome();

        return {
          ...prev,
          players,
          lastIncome,
          phase: 'round-reveal',
          timerActive: false,
        };
      }

      // Battle round: reward by rank among correct answerers, fastest first — 1st place captures
      // two territories, 2nd place one, 3rd place none. In duo (only two possible ranks), this
      // means winner=2/loser=1 rather than a full shutout, since "0" is specifically the 3rd-place
      // tier, not "whoever's last" — keeps a duo round from being a total swing every time.
      qualifying.forEach((s, rank) => {
        const captureCount = CAPTURE_TIERS[rank] ?? 0;
        if (captureCount === 0) return;

        const me = players.find((p) => p.id === s.player.id);
        if (!me || me.eliminated) return;

        const bonus = Math.max(0, Math.round(SPEED_BONUS_MAX * (1 - s.elapsedMs / (QUESTION_SECONDS * 1000))));
        let captured = 0;

        for (let i = 0; i < captureCount; i++) {
          const current = players.find((p) => p.id === s.player.id)!;
          const ownedSet = new Set(current.ownedNodeIds);
          const candidateNeighbors = Array.from(
            new Set(current.ownedNodeIds.flatMap((n) => neighborsOf(map, n)))
          ).filter((n) => !ownedSet.has(n));

          if (candidateNeighbors.length === 0) break; // fully boxed in this round

          const unclaimed = candidateNeighbors.filter(
            (n) => !players.some((p) => p.ownedNodeIds.includes(n))
          );
          const target = unclaimed[0] ?? candidateNeighbors[0];
          const defender = players.find((p) => p.id !== s.player.id && p.ownedNodeIds.includes(target));

          updatePlayer(s.player.id, (p) => ({
            ...p,
            ownedNodeIds: [...p.ownedNodeIds, target],
            score: p.score + CORRECT_POINTS,
          }));
          lastCaptures[s.player.id] = target;
          captured++;

          if (defender) {
            const wasBase = defender.baseNodeId === target;
            lastDefenders[s.player.id] = defender.id;
            updatePlayer(defender.id, (p) => ({
              ...p,
              ownedNodeIds: p.ownedNodeIds.filter((n) => n !== target),
              eliminated: p.eliminated || wasBase,
            }));
            if (wasBase) eliminatedThisRound.push(defender.id);
          }
        }

        if (captured > 0) {
          updatePlayer(s.player.id, (p) => ({ ...p, score: p.score + bonus }));
        }
      });

      const lastIncome = applyIncome();

      const survivors = players.filter((p) => !p.eliminated);
      const isLastRound = prev.currentRound >= prev.totalBattleRounds;
      const gameOver = isLastRound || survivors.length <= 1;

      return {
        ...prev,
        players,
        lastCaptures,
        lastDefenders,
        lastIncome,
        eliminatedThisRound,
        phase: gameOver ? 'final-standings' : 'round-reveal',
        timerActive: false,
      };
    });
  }, [questions]);

  // Auto-resolve: every active player has answered, or time ran out. Only the authoritative
  // client triggers this (otherwise every open tab would race to resolve the same round).
  useEffect(() => {
    if (!isAuthoritative) return;
    if (game.phase !== 'capture' && game.phase !== 'battle') return;
    const active = game.players.filter((p) => !p.eliminated);
    const allAnswered = active.length > 0 && active.every((p) => game.answers[p.id]);
    const timeUp = game.timerActive === false && game.timeLeft === 0;
    if ((allAnswered || timeUp) && !resolvingRef.current) {
      resolvingRef.current = true;
      resolveRound();
      // Reset once the phase has actually moved on, so a genuinely new question can resolve again.
      setTimeout(() => { resolvingRef.current = false; }, 500);
    }
  }, [game.phase, game.answers, game.timeLeft, game.timerActive, game.players, isAuthoritative, resolveRound]);

  // Host action from the round-reveal screen: start the next battle round, or wrap up.
  const continueFromReveal = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'round-reveal') return prev;

      if (prev.currentRound === 0) {
        // Coming out of the capture round-reveal — begin battle round 1.
        return drawQuestion({ ...prev, phase: 'battle', currentRound: 1 });
      }

      const survivors = prev.players.filter((p) => !p.eliminated);
      const isLastRound = prev.currentRound >= prev.totalBattleRounds;
      if (isLastRound || survivors.length <= 1) {
        return { ...prev, phase: 'final-standings' };
      }

      return drawQuestion({ ...prev, phase: 'battle', currentRound: prev.currentRound + 1 });
    });
  }, [drawQuestion]);

  const finishGame = useCallback(() => {
    setGame((prev) => ({ ...prev, phase: 'finished' }));
  }, []);

  const resetGame = useCallback(() => {
    const newGame = createEmptyTerritoryGame(sessionId, packId, packName, mode, visibility, duration, pickRandomMap(playerCountFor(mode)).id);
    setGame(newGame);
    const db = getFirestore();
    setDoc(doc(db, 'territory-games', sessionId), newGame);
  }, [sessionId, packId, packName, mode, visibility, duration]);

  const ranked = [...game.players].sort(compareTerritoryPlayers);

  return {
    game,
    loading,
    ranked,
    addPlayer,
    removePlayer,
    setPhase,
    startCapture,
    submitAnswer,
    continueFromReveal,
    finishGame,
    resetGame,
  };
}
