import { useState, useCallback, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import {
  TerritoryGameState, TerritoryQuestion, TerritoryPlayer, TerritoryMode,
  TerritoryVisibility, TerritoryPhase, TerritoryMapDef, TerritoryBattleResult,
  createEmptyTerritoryGame, playerCountFor, PLAYER_EMOJIS, compareTerritoryPlayers,
} from '@/types/territory';
import { pickRandomMap, getMapById } from '@/data/territory-maps';
import { QUESTION_SECONDS, pickQuestion, slotsForRank, computeAvailablePickIds, findNextPickerIndex } from '@/lib/territory-engine';

export { QUESTION_SECONDS };
const CORRECT_POINTS = 10;

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
  // Only the primary host tab should drive the countdown — see useLiveGame.ts's identical param
  // for why (a second browser context running its own setInterval would race it over Firestore).
  isAuthoritative: boolean = true
) {
  // Picked once per mounted instance — only actually used if this client is the one that creates
  // the Firestore doc (the "doesn't exist yet" branch below); a client joining an already-created
  // game just receives the real mapId from the snapshot.
  const [initialMapId] = useState(() => pickRandomMap(playerCountFor(mode)).id);

  const [game, setGame] = useState<TerritoryGameState>(() =>
    createEmptyTerritoryGame(sessionId, packId, packName, mode, visibility, initialMapId)
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
        baseStars: 0,
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

  // Draws a fresh broadcast question (base-capture or land-capture) to every active player.
  const drawBroadcastQuestion = useCallback((prev: TerritoryGameState): TerritoryGameState => {
    const q = pickQuestion(questions, prev.usedQuestionIds);
    if (!q) return prev;
    const active = prev.players.filter((p) => !p.eliminated).map((p) => p.id);
    return {
      ...prev,
      phase: 'question',
      currentQuestionId: q.id,
      usedQuestionIds: [...prev.usedQuestionIds, q.id],
      respondingPlayerIds: active,
      answers: {},
      timeLeft: QUESTION_SECONDS,
      timerActive: true,
      questionRevealedAt: Date.now(),
      lastCaptures: {},
    };
  }, [questions]);

  // Host action: everyone has joined, begin the Base Capture question.
  const startGame = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'lobby') return prev;
      return drawBroadcastQuestion({ ...prev, roundKind: 'base-capture' });
    });
  }, [drawBroadcastQuestion]);

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

  // Rotates the attacker to whoever is now next-highest-ranked by territory (wrapping around),
  // and sets up their target pick. Called whenever the current attacker loses a duel.
  const passTurnToNextAttacker = useCallback((state: TerritoryGameState, map: TerritoryMapDef): TerritoryGameState => {
    const active = state.players.filter((p) => !p.eliminated);
    const ranked = [...active].sort(compareTerritoryPlayers);
    const currentIdx = ranked.findIndex((p) => p.id === state.attackerId);
    const nextAttacker = ranked[(currentIdx + 1) % ranked.length] ?? ranked[0];
    return {
      ...state,
      phase: 'pick',
      attackerId: nextAttacker.id,
      defenderId: null,
      targetNodeId: null,
      pickOrder: [nextAttacker.id],
      pickIndex: 0,
      pickSlotsRemaining: 1,
      availablePickIds: computeAvailablePickIds('battle', map, nextAttacker, state.players),
      timerActive: false,
    };
  }, []);

  // Resolves the current question — base-capture/land-capture rank the whole field and open a
  // pick phase (the actual pick is then applied by the picking player's own device — see
  // lib/territory-engine.ts's applyPick); battle compares just the attacker and defender and
  // applies the hit directly, since only two players ever answer a battle question. Auto-triggered
  // (see the effect below) rather than requiring a host click, since these are objectively-scored
  // questions with only 2-3 players.
  const resolveQuestion = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'question') return prev;
      const question = questions.find((q) => q.id === prev.currentQuestionId);
      const map = getMapById(prev.mapId);
      if (!question || !map) return prev;

      if (prev.roundKind === 'battle') {
        if (!prev.attackerId || !prev.defenderId || !prev.targetNodeId) return prev;

        const attackerAnswer = prev.answers[prev.attackerId];
        const defenderAnswer = prev.answers[prev.defenderId];
        const attackerCorrect = attackerAnswer ? checkAnswer(question, attackerAnswer.answer) : false;
        const defenderCorrect = defenderAnswer ? checkAnswer(question, defenderAnswer.answer) : false;
        const attackerElapsed = attackerAnswer?.elapsedMs ?? Infinity;
        const defenderElapsed = defenderAnswer?.elapsedMs ?? Infinity;
        const attackerWins = attackerCorrect && (!defenderCorrect || attackerElapsed < defenderElapsed);

        let players = [...prev.players];
        const updatePlayer = (id: string, fn: (p: TerritoryPlayer) => TerritoryPlayer) => {
          players = players.map((p) => (p.id === id ? fn(p) : p));
        };

        let lastBattleResult: TerritoryBattleResult;

        if (attackerWins) {
          const target = map.nodes.find((n) => n.id === prev.targetNodeId);
          if (target?.isBaseSlot) {
            const defender = players.find((p) => p.id === prev.defenderId)!;
            const newStars = Math.max(0, defender.baseStars - 1);
            if (newStars <= 0) {
              // Base fully depleted — attacker inherits every tile the defender owned, not just the base.
              const inherited = defender.ownedNodeIds;
              updatePlayer(prev.attackerId, (p) => ({
                ...p,
                ownedNodeIds: Array.from(new Set([...p.ownedNodeIds, ...inherited])),
                score: p.score + CORRECT_POINTS,
              }));
              updatePlayer(prev.defenderId, (p) => ({ ...p, ownedNodeIds: [], baseStars: 0, eliminated: true }));
              lastBattleResult = { attackerId: prev.attackerId, defenderId: prev.defenderId, targetNodeId: prev.targetNodeId, hit: true, starsLeft: 0, eliminated: true };
            } else {
              updatePlayer(prev.defenderId, (p) => ({ ...p, baseStars: newStars }));
              updatePlayer(prev.attackerId, (p) => ({ ...p, score: p.score + CORRECT_POINTS }));
              lastBattleResult = { attackerId: prev.attackerId, defenderId: prev.defenderId, targetNodeId: prev.targetNodeId, hit: true, starsLeft: newStars };
            }
          } else {
            updatePlayer(prev.defenderId, (p) => ({ ...p, ownedNodeIds: p.ownedNodeIds.filter((n) => n !== prev.targetNodeId) }));
            updatePlayer(prev.attackerId, (p) => ({ ...p, ownedNodeIds: [...p.ownedNodeIds, prev.targetNodeId!], score: p.score + CORRECT_POINTS }));
            lastBattleResult = { attackerId: prev.attackerId, defenderId: prev.defenderId, targetNodeId: prev.targetNodeId, hit: true };
          }
        } else {
          lastBattleResult = { attackerId: prev.attackerId, defenderId: prev.defenderId, targetNodeId: prev.targetNodeId, hit: false };
        }

        const survivors = players.filter((p) => !p.eliminated);
        if (survivors.length <= 1) {
          return { ...prev, players, lastBattleResult, phase: 'final-standings', timerActive: false };
        }

        if (attackerWins) {
          // Attacker keeps their turn — pick the next target (possibly the same base again).
          const attacker = players.find((p) => p.id === prev.attackerId)!;
          const availablePickIds = computeAvailablePickIds('battle', map, attacker, players);
          if (availablePickIds.length === 0) {
            // Fully boxed in (rare) — pass the turn rather than getting stuck with nothing to pick.
            return passTurnToNextAttacker({ ...prev, players, lastBattleResult }, map);
          }
          return {
            ...prev, players, lastBattleResult,
            phase: 'pick', pickOrder: [attacker.id], pickIndex: 0, pickSlotsRemaining: 1,
            availablePickIds, targetNodeId: null, defenderId: null,
            timerActive: false,
          };
        }

        return passTurnToNextAttacker({ ...prev, players, lastBattleResult }, map);
      }

      // base-capture / land-capture: rank everyone (correct-and-fastest first, then everyone
      // else by speed), then open a pick phase for whoever's turn it is first.
      const active = prev.players.filter((p) => !p.eliminated);
      const scored = active
        .map((p) => {
          const a = prev.answers[p.id];
          const isCorrect = a ? checkAnswer(question, a.answer) : false;
          const elapsedMs = a?.elapsedMs ?? Infinity;
          return { player: p, isCorrect, elapsedMs };
        })
        .sort((a, b) => a.elapsedMs - b.elapsedMs);
      const order = [...scored.filter((s) => s.isCorrect), ...scored.filter((s) => !s.isCorrect)];
      const pickOrder = order.map((s) => s.player.id);
      const roundKind = prev.roundKind as 'base-capture' | 'land-capture';

      const idx = findNextPickerIndex(pickOrder, roundKind, 0, map, prev.players);

      if (idx >= pickOrder.length) {
        // Nobody has an active pick this cycle (degenerate — shouldn't happen with 2-3 players).
        return { ...prev, pickOrder, pickIndex: 0, pickSlotsRemaining: 0, availablePickIds: [], phase: 'reveal', timerActive: false };
      }

      const picker = order[idx].player;
      return {
        ...prev,
        phase: 'pick',
        pickOrder,
        pickIndex: idx,
        pickSlotsRemaining: slotsForRank(roundKind, idx, pickOrder.length),
        availablePickIds: computeAvailablePickIds(roundKind, map, picker, prev.players),
        timerActive: false,
      };
    });
  }, [questions, passTurnToNextAttacker]);

  // Auto-resolve: everyone expected to answer has answered, or time ran out. Only the
  // authoritative client triggers this (otherwise every open tab would race to resolve it).
  useEffect(() => {
    if (!isAuthoritative) return;
    if (game.phase !== 'question') return;
    const responders = game.respondingPlayerIds;
    const allAnswered = responders.length > 0 && responders.every((id) => game.answers[id]);
    const timeUp = game.timerActive === false && game.timeLeft === 0;
    if ((allAnswered || timeUp) && !resolvingRef.current) {
      resolvingRef.current = true;
      resolveQuestion();
      // Reset once the phase has actually moved on, so a genuinely new question can resolve again.
      setTimeout(() => { resolvingRef.current = false; }, 500);
    }
  }, [game.phase, game.answers, game.timeLeft, game.timerActive, game.respondingPlayerIds, isAuthoritative, resolveQuestion]);

  // Host action from the reveal screen: continue base-capture -> land-capture, keep drawing
  // land-capture questions until the map is fully claimed, then switch into battle.
  const continueFromReveal = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'reveal') return prev;
      const map = getMapById(prev.mapId);
      if (!map) return prev;

      if (prev.roundKind === 'base-capture') {
        return drawBroadcastQuestion({ ...prev, roundKind: 'land-capture' });
      }

      // land-capture
      const allOwned = map.nodes.every((n) => prev.players.some((p) => p.ownedNodeIds.includes(n.id)));
      if (!allOwned) return drawBroadcastQuestion(prev);

      const active = prev.players.filter((p) => !p.eliminated);
      const ranked = [...active].sort(compareTerritoryPlayers);
      const attacker = ranked[0];
      return {
        ...prev,
        roundKind: 'battle',
        phase: 'pick',
        attackerId: attacker.id,
        defenderId: null,
        targetNodeId: null,
        pickOrder: [attacker.id],
        pickIndex: 0,
        pickSlotsRemaining: 1,
        availablePickIds: computeAvailablePickIds('battle', map, attacker, prev.players),
      };
    });
  }, [drawBroadcastQuestion]);

  const finishGame = useCallback(() => {
    setGame((prev) => ({ ...prev, phase: 'finished' }));
  }, []);

  const resetGame = useCallback(() => {
    const newGame = createEmptyTerritoryGame(sessionId, packId, packName, mode, visibility, pickRandomMap(playerCountFor(mode)).id);
    setGame(newGame);
    const db = getFirestore();
    setDoc(doc(db, 'territory-games', sessionId), newGame);
  }, [sessionId, packId, packName, mode, visibility]);

  const ranked = [...game.players].sort(compareTerritoryPlayers);

  return {
    game,
    loading,
    ranked,
    addPlayer,
    removePlayer,
    setPhase,
    startGame,
    submitAnswer,
    continueFromReveal,
    finishGame,
    resetGame,
  };
}
