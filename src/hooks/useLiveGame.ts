import { useState, useCallback, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { LiveGameState, LiveTeam, RoundState, TeamAnswer, HostGamePhase, TEAM_EMOJIS, createLiveGame, normalizeRounds } from '@/types/live-game';
import { Question, checkAnswer, calculateScore } from '@/types/game';

// Shared by the optimistic local update and the authoritative transaction in adjustTeamScore, so
// the number the host sees the instant they click is computed exactly the same way the server
// will compute it.
function applyScoreDelta(teams: LiveTeam[], teamId: string, pointDelta: number, roundIndex: number): LiveTeam[] {
  return teams.map((t) => {
    if (t.id !== teamId) return t;
    const newRoundScores = [...t.roundScores];
    while (newRoundScores.length <= roundIndex) newRoundScores.push(0);
    newRoundScores[roundIndex] = (newRoundScores[roundIndex] || 0) + pointDelta;
    return { ...t, score: t.score + pointDelta, roundScores: newRoundScores };
  });
}

function buildAnswersMap(teams: LiveTeam[]): Record<string, TeamAnswer> {
  return Object.fromEntries(teams.map((t) => [t.id, {
    teamId: t.id,
    answer: '',
    isCorrect: null,
    isWagered: false,
    pointsAwarded: 0,
  }]));
}

// The final round gets 60s per question, every other round 45s. Must key off the pack's actual
// round count (its highest question round number), not a hardcoded "6" — packs can have any
// round count since the round-count-picker feature shipped. Using a hardcoded 6 here disagreed
// with HostGame.tsx's dynamic maxTime for any pack whose last round isn't literally round 6 (e.g.
// a 5-round pack): startRound() would set timeLeft to the wrong 45s while maxTime correctly
// expected 60s, and QuestionDisplay's `timeLeft < maxTime` auto-activate check would then fire
// immediately on mount, skipping straight past the "Start Music & Timer" button.
function questionTime(round: number, questions: Question[]): number {
  const totalRounds = Math.max(...questions.map((q) => q.round), 1);
  return round === totalRounds ? 60 : 45;
}

function advanceToNextQuestion(prev: LiveGameState): LiveGameState {
  const nextIndex = prev.currentQuestionIndex + 1;
  if (nextIndex >= prev.questions.length) return { ...prev, phase: 'finished' };

  const nextQ = prev.questions[nextIndex];
  const currentQ = prev.questions[prev.currentQuestionIndex];

  if (nextQ.round !== currentQ.round) {
    return {
      ...prev,
      currentQuestionIndex: nextIndex,
      currentRound: nextQ.round,
      phase: 'round-rules',
      timerActive: false,
      roundRulesIndex: 0,
    };
  }

  const time = questionTime(nextQ.round, prev.questions);

  const newRound: RoundState = {
    questionIndex: nextIndex,
    roundNumber: nextQ.round,
    question: nextQ,
    answers: buildAnswersMap(prev.teams),
    isGraded: false,
  };

  return {
    ...prev,
    currentQuestionIndex: nextIndex,
    currentRound: nextQ.round,
    phase: 'question',
    timeLeft: time,
    timerActive: false,
    rounds: { ...prev.rounds, [nextIndex]: newRound },
  };
}

// currentQuestionIndex is pinned at the round's FIRST question throughout reveal/leaderboard/lottery
// (see finalizeRoundGrading) — realign to the round's LAST question before delegating to
// advanceToNextQuestion, whose +1 math expects the last-played question index.
function skipToNextRound(prev: LiveGameState): LiveGameState {
  const currentQ = prev.questions[prev.currentQuestionIndex];
  const roundIndices = prev.questions
    .map((q, i) => (q.round === currentQ.round ? i : -1))
    .filter((i) => i !== -1);
  const lastIndexInRound = roundIndices[roundIndices.length - 1];

  if (lastIndexInRound + 1 >= prev.questions.length) return { ...prev, phase: 'finished' };
  return advanceToNextQuestion({ ...prev, currentQuestionIndex: lastIndexInRound });
}

// Deep comparison helper — prevents writing identical arrays/objects every render
function getChanges(prev: LiveGameState, next: LiveGameState): Partial<LiveGameState> | null {
  const changes: Partial<LiveGameState> = {};
  let hasChange = false;
  (Object.keys(next) as Array<keyof LiveGameState>).forEach((key) => {
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

export function useLiveGame(
  sessionId: string,
  packId: string,
  packName: string,
  questions: Question[],
  lotteryAfterRound?: Record<number, boolean>,
  standingsAfterRound?: Record<number, boolean>,
  // Only one browser context per session may run the countdown — a popup projector window and
  // a remote-control phone both mount their own useLiveGame instance, and if each ran its own
  // setInterval decrementing timeLeft, they'd race each other writing to Firestore every second,
  // producing a visibly "jumping" countdown on every screen. Non-authoritative instances just
  // display game.timeLeft/timerActive as received; they never decrement or write it themselves.
  isAuthoritative: boolean = true
) {
  const [game, setGame] = useState<LiveGameState>(() => createLiveGame(sessionId, packId, packName, questions));
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRemoteUpdate = useRef(false);
  const prevGameRef = useRef<LiveGameState>(game);
  // Number of score-adjust transactions currently in flight. While this is > 0, incoming
  // snapshots must not clobber `teams`, or the optimistic value the host just clicked would snap
  // back to the pre-click number until the write lands — the visible flicker.
  const pendingScoreWrites = useRef(0);

  // Subscribe to Firestore for real-time updates
  useEffect(() => {
    const db = getFirestore();
    const gameRef = doc(db, 'games', sessionId);

    const applySnapshot = (raw: LiveGameState) => {
      // Heal legacy/array-shaped rounds before anything reads them (see normalizeRounds).
      const healed = Array.isArray(raw.rounds);
      const data: LiveGameState = healed ? { ...raw, rounds: normalizeRounds(raw.rounds) } : raw;

      if (healed) {
        // Deliberately do NOT flag this as a remote update, and diff against the raw server
        // shape — that lets the persistence effect below notice rounds changed and write the
        // repaired map back, permanently fixing the document instead of re-healing every read.
        setGame(data);
        prevGameRef.current = raw;
        return;
      }

      isRemoteUpdate.current = true;
      if (pendingScoreWrites.current > 0) {
        // A score edit is still committing. Take everything else from the server but keep our
        // locally-adjusted teams, so the score doesn't visibly bounce back to its old value and
        // then forward again once the transaction lands.
        setGame((prev) => {
          const merged = { ...data, teams: prev.teams };
          prevGameRef.current = merged;
          return merged;
        });
        return;
      }
      setGame(data);
      prevGameRef.current = data;
    };

    const unsubscribe = onSnapshot(
      gameRef,
      (docSnap) => {
        if (docSnap.exists()) {
          applySnapshot(docSnap.data() as LiveGameState);
        } else {
          setDoc(gameRef, game);
        }
        setLoading(false);
      },
      (err) => {
        // onSnapshot's stream can silently stop delivering updates without ever calling this —
        // e.g. a projector window sitting untouched for a whole game is exactly the kind of
        // background/unfocused tab Chrome deprioritizes, and the visibility/interval fallback
        // below is what actually recovers it. This handler just stops a genuine stream error
        // from crashing the render.
        console.error('Game listener error:', err);
      }
    );

    // Defensive resync: the realtime stream can go stale (backgrounded projector tab, a flaky
    // network blip that doesn't trigger onSnapshot's error callback) and simply stop delivering
    // updates with no visible sign anything is wrong — the screen just freezes on whatever it
    // last received. A plain one-off re-fetch, both right when the tab regains visibility and on
    // a periodic timer regardless of visibility (a projector on a real second screen may never
    // report as "hidden" even while its stream has stalled), catches that silent staleness.
    const resync = () => {
      getDoc(gameRef).then((snap) => {
        if (snap.exists()) applySnapshot(snap.data() as LiveGameState);
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
      const gameRef = doc(db, 'games', sessionId);

      const prev = prevGameRef.current;
      const changes = getChanges(prev, game);

      if (changes && Object.keys(changes).length > 0) {
        updateDoc(gameRef, changes).catch((err) => console.error('Save failed:', err));
      }
      prevGameRef.current = game;
    }
  }, [game, loading, sessionId]);

  // Timer — only the authoritative instance decrements/persists it (see param comment above).
  useEffect(() => {
    if (!isAuthoritative) return;
    if (game.timerActive && game.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setGame((prev) => {
          if (prev.timeLeft <= 1) {
            return { ...prev, timeLeft: 0, timerActive: false };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game.timerActive, isAuthoritative]);

  const addTeam = useCallback((name: string, emoji?: string) => {
    setGame((prev) => {
      const usedEmojis = prev.teams.map((t) => t.emoji);
      const availableEmoji = emoji || TEAM_EMOJIS.find((e) => !usedEmojis.includes(e)) || '🎮';
      const team: LiveTeam = {
        id: crypto.randomUUID(),
        name,
        emoji: availableEmoji,
        score: 0,
        roundScores: [],
      };
      return { ...prev, teams: [...prev.teams, team] };
    });
  }, []);

  const removeTeam = useCallback((id: string) => {
    setGame((prev) => ({
      ...prev,
      teams: prev.teams.filter((t) => t.id !== id),
    }));
  }, []);

  const setPhase = useCallback((phase: HostGamePhase) => {
    setGame((prev) => ({ ...prev, phase }));
  }, []);

  const startGame = useCallback(() => {
    if (questions.length === 0) return;
    setGame((prev) => ({
      ...prev,
      phase: 'game-rules',
      // Full reset of gameplay progress, not just the phase — the Home icon lets a host return
      // to team-setup mid-game (e.g. to add a late team) without wiping currentQuestionIndex, and
      // advanceToRoundRules() unconditionally forces currentRound back to 1 assuming a fresh
      // start. Without resetting currentQuestionIndex/rounds here too, those two fall out of
      // sync — round-rules shows "Round 1" while startRound() picks the question at the stale
      // index, i.e. wherever the host had actually left off. Start Game must always mean "begin
      // from question one," regardless of what state the game was in before landing back here.
      currentQuestionIndex: 0,
      currentRound: questions[0]?.round ?? 1,
      // MUST be {} and not [] — rounds is keyed by questionIndex (Record<number, RoundState>),
      // and every answer write targets the field path rounds.{questionIndex}.answers.{teamId}.
      // Firestore stores [] as an array value, and a dotted field path cannot address an array
      // element, so any write landing before startRound() rebuilt rounds as a map would either
      // be rejected or silently replace the whole array. TypeScript does not catch this because
      // an array is assignable to Record<number, T>.
      rounds: {},
      timeLeft: 0,
      timerActive: false,
      revealStep: 0,
      currentRuleIndex: 0,
      roundRulesIndex: 0,
      roundStepIndex: 0,
      winnerConfettiPlays: 0,
      lotteryState: null,
    }));
  }, [questions]);

  const advanceToRoundRules = useCallback(() => {
    setGame((prev) => ({
      ...prev,
      phase: 'round-rules',
      currentRound: 1,
      roundRulesIndex: 0,
    }));
  }, []);

  const startRound = useCallback(() => {
    setGame((prev) => {
      const idx = prev.currentQuestionIndex;
      const q = prev.questions[idx];
      if (!q) return prev;

      const time = questionTime(q.round, prev.questions);
      const existingRound = prev.rounds[idx];
      let newRounds = prev.rounds;

      if (!existingRound) {
        const newRound: RoundState = {
          questionIndex: idx,
          roundNumber: q.round,
          question: q,
          answers: buildAnswersMap(prev.teams),
          isGraded: false,
        };
        newRounds = { ...prev.rounds, [idx]: newRound };
      }

      return {
        ...prev,
        phase: 'question',
        timeLeft: time,
        timerActive: false,
        rounds: newRounds,
      };
    });
  }, []);

  const startTimer = useCallback(() => {
    setGame((prev) => ({ ...prev, timerActive: true }));
  }, []);

  const stopTimer = useCallback(() => {
    setGame((prev) => ({ ...prev, timerActive: false }));
  }, []);

  const finishQuestion = useCallback(() => {
    setGame((prev) => {
      const existing = prev.rounds[prev.currentQuestionIndex];
      let rounds = prev.rounds;

      if (!existing) {
        const q = prev.questions[prev.currentQuestionIndex];
        const round: RoundState = {
          questionIndex: prev.currentQuestionIndex,
          roundNumber: q.round,
          question: q,
          answers: buildAnswersMap(prev.teams),
          isGraded: false,
        };
        rounds = { ...prev.rounds, [prev.currentQuestionIndex]: round };
      }

      const currentQ = prev.questions[prev.currentQuestionIndex];
      const nextIndex = prev.currentQuestionIndex + 1;
      const nextQ = prev.questions[nextIndex];

      if (nextQ && nextQ.round === currentQ.round) {
        const time = questionTime(nextQ.round, prev.questions);
        const existingNextRound = rounds[nextIndex];
        if (!existingNextRound) {
          const newRoundEntry: RoundState = {
            questionIndex: nextIndex,
            roundNumber: nextQ.round,
            question: nextQ,
            answers: buildAnswersMap(prev.teams),
            isGraded: false,
          };
          rounds = { ...rounds, [nextIndex]: newRoundEntry };
        }

        return {
          ...prev,
          phase: 'question',
          currentQuestionIndex: nextIndex,
          timeLeft: time,
          timerActive: false,
          rounds,
        };
      }

      const roundQuestionsIndices = prev.questions
        .map((q, i) => (q.round === currentQ.round ? i : -1))
        .filter((i) => i !== -1);
      const firstIndexInRound = roundQuestionsIndices[0];

      const updatedRounds = Object.fromEntries(
        Object.entries(rounds).map(([key, r]) => {
          if (r.roundNumber !== currentQ.round) return [key, r];
          const q = prev.questions[r.questionIndex];
          return [key, {
            ...r,
            answers: Object.fromEntries(
              Object.entries(r.answers).map(([teamId, a]) => [teamId, {
                ...a,
                isCorrect: a.isCorrect ?? checkAnswer(a.answer, q.answer),
              }])
            ),
          }];
        })
      );

      return {
        ...prev,
        phase: 'grading',
        currentQuestionIndex: firstIndexInRound,
        timerActive: false,
        rounds: updatedRounds,
        roundStepIndex: 0,
      };
    });
  }, []);

  const advanceFromAnswerCollection = useCallback(() => {}, []);

  const updateTeamAnswer = useCallback((teamId: string, answer: string, isWagered?: boolean) => {
    setGame((prev) => {
      const r = prev.rounds[prev.currentQuestionIndex];
      if (!r || !r.answers[teamId]) return prev;
      const rounds = {
        ...prev.rounds,
        [prev.currentQuestionIndex]: {
          ...r,
          answers: {
            ...r.answers,
            [teamId]: { ...r.answers[teamId], answer, ...(isWagered !== undefined ? { isWagered } : {}) },
          },
        },
      };
      return { ...prev, rounds };
    });
  }, []);

  const autoGrade = useCallback(() => {
    setGame((prev) => {
      const q = prev.questions[prev.currentQuestionIndex];
      const r = prev.rounds[prev.currentQuestionIndex];
      if (!q || !r) return prev;
      const rounds = {
        ...prev.rounds,
        [prev.currentQuestionIndex]: {
          ...r,
          answers: Object.fromEntries(
            Object.entries(r.answers).map(([teamId, a]) => [teamId, { ...a, isCorrect: checkAnswer(a.answer, q.answer) }])
          ),
        },
      };
      return { ...prev, rounds, phase: 'grading' };
    });
  }, []);

  const setAnswerCorrectness = useCallback((teamId: string, isCorrect: boolean, questionIndex?: number) => {
    setGame((prev) => {
      const targetIndex = questionIndex ?? prev.currentQuestionIndex;
      const r = prev.rounds[targetIndex];
      if (!r || !r.answers[teamId]) return prev;
      const rounds = {
        ...prev.rounds,
        [targetIndex]: { ...r, answers: { ...r.answers, [teamId]: { ...r.answers[teamId], isCorrect } } },
      };
      return { ...prev, rounds };
    });
  }, []);

  // Commits scoring for every question in the current round at once (not per-question) so the
  // Grading stepper can let the host revisit and edit any question in the round before finishing —
  // points are only ever computed once, here, never incrementally per-question.
  const finalizeRoundGrading = useCallback(() => {
    setGame((prev) => {
      const currentQ = prev.questions[prev.currentQuestionIndex];
      if (!currentQ) return prev;

      const totalRounds = Math.max(...prev.questions.map((q) => q.round), 1);

      const newRounds = Object.fromEntries(
        Object.entries(prev.rounds).map(([key, r]) => {
          if (r.roundNumber !== currentQ.round) return [key, r];
          const q = prev.questions[r.questionIndex];
          const updatedAnswers = Object.fromEntries(
            Object.entries(r.answers).map(([teamId, a]) => {
              const points = a.hasCheated ? 0 : calculateScore(q.round === totalRounds, !!a.isCorrect, a.isWagered);
              return [teamId, { ...a, pointsAwarded: points }];
            })
          );
          return [key, { ...r, answers: updatedAnswers, isGraded: true }];
        })
      );

      const refinedTeams = prev.teams.map((t) => {
        const roundQuestions = Object.values(newRounds).filter((r) => r.roundNumber === currentQ.round);
        const totalPts = roundQuestions.reduce((sum, r) => {
          return sum + (r.answers[t.id]?.pointsAwarded ?? 0);
        }, 0);
        const newRoundScores = [...t.roundScores];
        while (newRoundScores.length < currentQ.round) newRoundScores.push(0);
        newRoundScores[currentQ.round - 1] = totalPts;

        return {
          ...t,
          score: t.score - (t.roundScores[currentQ.round - 1] || 0) + totalPts,
          roundScores: newRoundScores,
        };
      });

      const roundQuestionsIndices = prev.questions
        .map((q, i) => (q.round === currentQ.round ? i : -1))
        .filter((i) => i !== -1);
      const firstIndexInRound = roundQuestionsIndices[0];

      return {
        ...prev,
        rounds: newRounds,
        teams: refinedTeams,
        phase: 'reveal',
        currentQuestionIndex: firstIndexInRound,
        roundStepIndex: 0,
      };
    });
  }, []);

  // Called once per round, from the last page of the Reveal stepper — Reveal no longer advances
  // question-by-question (that's the local/synced roundStepIndex now), so this only ever needs to
  // decide what comes after the whole round: final standings, a lottery draw, the interim
  // leaderboard, or — if the host turned both off for this round in the pack editor — straight
  // on to the next round's rules.
  const advanceFromReveal = useCallback(() => {
    setGame((prev) => {
      const currentQ = prev.questions[prev.currentQuestionIndex];
      const hasMoreRounds = prev.questions.some((q) => q.round > currentQ.round);

      if (!hasMoreRounds) {
        return { ...prev, phase: 'final-reveal', revealStep: 0 };
      }

      if (lotteryAfterRound?.[currentQ.round]) {
        // Always start a lottery round from a clean slate — a leftover pool/history from an
        // earlier round in the same game must never carry over into this one.
        // null, not undefined — Firestore's updateDoc throws synchronously (crashing the host's
        // render, not just failing async) on any field value of undefined.
        return { ...prev, phase: 'lottery', lotteryState: null };
      }

      // No explicit entry defaults to shown, matching pre-existing packs' always-on behavior.
      const showStandings = standingsAfterRound?.[currentQ.round] !== false;
      if (showStandings) {
        return { ...prev, phase: 'leaderboard' };
      }

      return skipToNextRound(prev);
    });
  }, [lotteryAfterRound, standingsAfterRound]);

  const adjustTeamScore = useCallback(
    async (teamId: string, pointDelta: number, specificRoundIndex?: number) => {
      const db = getFirestore();
      const gameRef = doc(db, 'games', sessionId);

      // Rapid +1/-1 clicks each used to run their own independent getDoc -> compute -> updateDoc
      // cycle. With no transaction serializing them, several overlapping clicks could all read
      // the same stale score before any write landed, so a slower click's write could land AFTER
      // a faster one and overwrite it with a lower, stale value — the score visibly ticking up
      // then dropping back down. A transaction reads and writes atomically against the live
      // server value and auto-retries on conflict, so every click's delta is applied in order.
      // Apply the delta to local state FIRST so the number moves on the same frame as the click.
      // Previously the only setGame happened *after* awaiting the transaction, so every +1/−1 sat
      // visibly unchanged for a full server round-trip before updating. The transaction below is
      // still the source of truth; this is purely to stop the UI lagging behind the input.
      pendingScoreWrites.current += 1;
      isRemoteUpdate.current = true; // don't let the smart-save effect race the transaction
      setGame((prev) => {
        let roundIndex = specificRoundIndex;
        if (roundIndex === undefined) {
          const currentQ = prev.questions[prev.currentQuestionIndex];
          if (!currentQ) return prev;
          roundIndex = currentQ.round - 1;
        }
        const next = { ...prev, teams: applyScoreDelta(prev.teams, teamId, pointDelta, roundIndex) };
        prevGameRef.current = next;
        return next;
      });

      try {
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(gameRef);
          if (!snap.exists()) return;

          const current = snap.data() as LiveGameState;

          let roundIndex = specificRoundIndex;
          if (roundIndex === undefined) {
            const currentQ = current.questions[current.currentQuestionIndex];
            if (!currentQ) return;
            roundIndex = currentQ.round - 1;
          }

          transaction.update(gameRef, {
            teams: applyScoreDelta(current.teams, teamId, pointDelta, roundIndex),
          });
        });
      } catch (err) {
        // Leave the optimistic value in place; the next snapshot after pendingScoreWrites drains
        // carries the authoritative teams and will correct it.
        console.error('Score adjust failed:', err);
      } finally {
        pendingScoreWrites.current = Math.max(0, pendingScoreWrites.current - 1);
      }
    },
    [sessionId]
  );

  const advanceFromLeaderboard = useCallback(() => {
    setGame((prev) => skipToNextRound(prev));
  }, []);

  const resetGame = useCallback(() => {
    const newGame = createLiveGame(sessionId, packId, packName, questions);
    setGame(newGame);
    const db = getFirestore();
    setDoc(doc(db, 'games', sessionId), newGame);
  }, [sessionId, packId, packName, questions]);

  const advanceFromLottery = useCallback(() => {
    setGame((prev) => ({ ...prev, phase: 'leaderboard' }));
  }, []);

  const initializeLottery = useCallback((min: number, max: number) => {
    setGame((prev) => {
      const remainingPool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return {
        ...prev,
        lotteryState: {
          min,
          max,
          remainingPool,
          currentDrawnNumber: null,
          history: [],
          confettiPlays: 0,
        },
      };
    });
  }, []);

  const drawLotteryNumber = useCallback(() => {
    setGame((prev) => {
      if (!prev.lotteryState || prev.lotteryState.remainingPool.length === 0) {
        return prev;
      }
      const pool = [...prev.lotteryState.remainingPool];
      const randomIndex = Math.floor(Math.random() * pool.length);
      const drawnNumber = pool[randomIndex];
      pool.splice(randomIndex, 1);
      return {
        ...prev,
        lotteryState: {
          ...prev.lotteryState,
          remainingPool: pool,
          currentDrawnNumber: drawnNumber,
          history: [...prev.lotteryState.history, drawnNumber],
          confettiPlays: prev.lotteryState.confettiPlays + 1,
        },
      };
    });
  }, []);

  const replayLotteryConfetti = useCallback(() => {
    setGame((prev) => {
      if (!prev.lotteryState) return prev;
      return {
        ...prev,
        lotteryState: { ...prev.lotteryState, confettiPlays: prev.lotteryState.confettiPlays + 1 },
      };
    });
  }, []);

  const replayWinnerConfetti = useCallback(() => {
    setGame((prev) => ({ ...prev, winnerConfettiPlays: (prev.winnerConfettiPlays ?? 0) + 1 }));
  }, []);

  const updateRevealStep = useCallback((step: number) => {
    setGame((prev) => ({ ...prev, revealStep: step }));
  }, []);

  const updateRuleIndex = useCallback((index: number) => {
    setGame((prev) => ({ ...prev, currentRuleIndex: index }));
  }, []);

  const updateRoundRulesIndex = useCallback((index: number) => {
    setGame((prev) => ({ ...prev, roundRulesIndex: index }));
  }, []);

  const updateRoundStepIndex = useCallback((index: number) => {
    setGame((prev) => ({ ...prev, roundStepIndex: index }));
  }, []);

  return {
    game,
    loading,
    addTeam,
    removeTeam,
    setPhase,
    startGame,
    advanceToRoundRules,
    startRound,
    startTimer,
    stopTimer,
    finishQuestion,
    advanceFromAnswerCollection,
    updateTeamAnswer,
    autoGrade,
    setAnswerCorrectness,
    finalizeRoundGrading,
    advanceFromReveal,
    adjustTeamScore,
    advanceFromLeaderboard,
    advanceFromLottery,
    initializeLottery,
    drawLotteryNumber,
    replayLotteryConfetti,
    replayWinnerConfetti,
    resetGame,
    updateRevealStep,
    updateRuleIndex,
    updateRoundRulesIndex,
    updateRoundStepIndex,
  };
}
