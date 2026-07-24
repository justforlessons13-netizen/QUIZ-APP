import { useState, useCallback, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { LiveGameState, LiveTeam, RoundState, HostGamePhase, TEAM_EMOJIS, createLiveGame } from '@/types/live-game';
import { Question, checkAnswer, calculateScore } from '@/types/game';

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
    };
  }

  const time = nextQ.round < 6 ? 45 : 60;

  const newRound: RoundState = {
    questionIndex: nextIndex,
    roundNumber: nextQ.round,
    question: nextQ,
    answers: prev.teams.map(t => ({
      teamId: t.id,
      answer: '',
      isCorrect: null,
      isWagered: false,
      pointsAwarded: 0,
    })),
    isGraded: false,
  };

  return {
    ...prev,
    currentQuestionIndex: nextIndex,
    currentRound: nextQ.round,
    phase: 'question',
    timeLeft: time,
    timerActive: false,
    rounds: [...prev.rounds, newRound],
  };
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
  lotteryAfterRound?: Record<number, boolean>
) {
  const [game, setGame] = useState<LiveGameState>(() => createLiveGame(sessionId, packId, packName, questions));
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRemoteUpdate = useRef(false);
  const prevGameRef = useRef<LiveGameState>(game);

  // Subscribe to Firestore for real-time updates
  useEffect(() => {
    const db = getFirestore();
    const gameRef = doc(db, 'games', sessionId);

    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as LiveGameState;
        isRemoteUpdate.current = true;
        setGame(data);
        prevGameRef.current = data;
      } else {
        setDoc(gameRef, game);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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

  // Timer
  useEffect(() => {
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
  }, [game.timerActive]);

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
      timerActive: false,
    }));
  }, [questions]);

  const advanceToRoundRules = useCallback(() => {
    setGame((prev) => ({
      ...prev,
      phase: 'round-rules',
      currentRound: 1,
    }));
  }, []);

  const startRound = useCallback(() => {
    setGame((prev) => {
      const idx = prev.currentQuestionIndex;
      const q = prev.questions[idx];
      if (!q) return prev;

      const time = q.round < 6 ? 45 : 60;
      const existingRound = prev.rounds.find((r) => r.questionIndex === idx);
      let newRounds = prev.rounds;

      if (!existingRound) {
        const newRound: RoundState = {
          questionIndex: idx,
          roundNumber: q.round,
          question: q,
          answers: prev.teams.map((t) => ({
            teamId: t.id,
            answer: '',
            isCorrect: null,
            isWagered: false,
            pointsAwarded: 0,
          })),
          isGraded: false,
        };
        newRounds = [...prev.rounds, newRound];
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
      const existing = prev.rounds.find((r) => r.questionIndex === prev.currentQuestionIndex);
      let rounds = prev.rounds;

      if (!existing) {
        const q = prev.questions[prev.currentQuestionIndex];
        const round: RoundState = {
          questionIndex: prev.currentQuestionIndex,
          roundNumber: q.round,
          question: q,
          answers: prev.teams.map((t) => ({
            teamId: t.id,
            answer: '',
            isCorrect: null,
            isWagered: false,
            pointsAwarded: 0,
          })),
          isGraded: false,
        };
        rounds = [...prev.rounds, round];
      }

      const currentQ = prev.questions[prev.currentQuestionIndex];
      const nextIndex = prev.currentQuestionIndex + 1;
      const nextQ = prev.questions[nextIndex];

      if (nextQ && nextQ.round === currentQ.round) {
        const time = nextQ.round < 6 ? 45 : 60;
        const existingNextRound = rounds.find((r) => r.questionIndex === nextIndex);
        if (!existingNextRound) {
          const newRoundEntry: RoundState = {
            questionIndex: nextIndex,
            roundNumber: nextQ.round,
            question: nextQ,
            answers: prev.teams.map((t) => ({
              teamId: t.id,
              answer: '',
              isCorrect: null,
              isWagered: false,
              pointsAwarded: 0,
            })),
            isGraded: false,
          };
          rounds = [...rounds, newRoundEntry];
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

      const updatedRounds = rounds.map((r) => {
        if (r.roundNumber !== currentQ.round) return r;
        const q = prev.questions[r.questionIndex];
        return {
          ...r,
          answers: r.answers.map((a) => ({
            ...a,
            isCorrect: a.isCorrect ?? checkAnswer(a.answer, q.answer),
          })),
        };
      });

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
      const rounds = prev.rounds.map((r) => {
        if (r.questionIndex !== prev.currentQuestionIndex) return r;
        return {
          ...r,
          answers: r.answers.map((a) =>
            a.teamId === teamId ? { ...a, answer, ...(isWagered !== undefined ? { isWagered } : {}) } : a
          ),
        };
      });
      return { ...prev, rounds };
    });
  }, []);

  const autoGrade = useCallback(() => {
    setGame((prev) => {
      const q = prev.questions[prev.currentQuestionIndex];
      if (!q) return prev;
      const rounds = prev.rounds.map((r) => {
        if (r.questionIndex !== prev.currentQuestionIndex) return r;
        return {
          ...r,
          answers: r.answers.map((a) => ({
            ...a,
            isCorrect: checkAnswer(a.answer, q.answer),
          })),
        };
      });
      return { ...prev, rounds, phase: 'grading' };
    });
  }, []);

  const setAnswerCorrectness = useCallback((teamId: string, isCorrect: boolean, questionIndex?: number) => {
    setGame((prev) => {
      const targetIndex = questionIndex ?? prev.currentQuestionIndex;
      const rounds = prev.rounds.map((r) => {
        if (r.questionIndex !== targetIndex) return r;
        return {
          ...r,
          answers: r.answers.map((a) => (a.teamId === teamId ? { ...a, isCorrect } : a)),
        };
      });
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

      const newRounds = prev.rounds.map((r) => {
        if (r.roundNumber !== currentQ.round) return r;
        const q = prev.questions[r.questionIndex];
        const updatedAnswers = r.answers.map((a) => {
          const points = a.hasCheated ? 0 : calculateScore(q.round, !!a.isCorrect, a.isWagered);
          return { ...a, pointsAwarded: points };
        });
        return { ...r, answers: updatedAnswers, isGraded: true };
      });

      const refinedTeams = prev.teams.map((t) => {
        const roundQuestions = newRounds.filter((r) => r.roundNumber === currentQ.round);
        const totalPts = roundQuestions.reduce((sum, r) => {
          const ans = r.answers.find((a) => a.teamId === t.id);
          return sum + (ans?.pointsAwarded ?? 0);
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
  // decide what comes after the whole round: final standings, a lottery draw, or the interim
  // leaderboard. Every round gets one of the latter two — there's no "skip straight to next round"
  // path anymore, matching the design's "leaderboard after every non-lottery round" intent.
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
        return { ...prev, phase: 'lottery', lotteryState: undefined };
      }

      return { ...prev, phase: 'leaderboard' };
    });
  }, []);

  const adjustTeamScore = useCallback(
    async (teamId: string, pointDelta: number, specificRoundIndex?: number) => {
      const db = getFirestore();
      const gameRef = doc(db, 'games', sessionId);

      const snap = await getDoc(gameRef);
      if (!snap.exists()) return;

      const current = snap.data() as LiveGameState;

      let roundIndex = specificRoundIndex;
      if (roundIndex === undefined) {
        const currentQ = current.questions[current.currentQuestionIndex];
        if (!currentQ) return;
        roundIndex = currentQ.round - 1;
      }

      const updatedTeams = current.teams.map((t) => {
        if (t.id !== teamId) return t;

        const newRoundScores = [...t.roundScores];
        while (newRoundScores.length <= roundIndex!) newRoundScores.push(0);
        newRoundScores[roundIndex!] = (newRoundScores[roundIndex!] || 0) + pointDelta;

        return {
          ...t,
          score: t.score + pointDelta,
          roundScores: newRoundScores,
        };
      });

      await updateDoc(gameRef, { teams: updatedTeams });

      // Prevent the persistence effect from writing again
      isRemoteUpdate.current = true;
      setGame((prev) => ({ ...prev, teams: updatedTeams }));
    },
    [sessionId]
  );

  const advanceFromLeaderboard = useCallback(() => {
    setGame((prev) => {
      // currentQuestionIndex is pinned at the round's FIRST question throughout reveal/leaderboard
      // (see finalizeRoundGrading) — realign to the round's LAST question before delegating to
      // advanceToNextQuestion, whose +1 math expects the last-played question index.
      const currentQ = prev.questions[prev.currentQuestionIndex];
      const roundIndices = prev.questions
        .map((q, i) => (q.round === currentQ.round ? i : -1))
        .filter((i) => i !== -1);
      const lastIndexInRound = roundIndices[roundIndices.length - 1];

      if (lastIndexInRound + 1 >= prev.questions.length) return { ...prev, phase: 'finished' };
      return advanceToNextQuestion({ ...prev, currentQuestionIndex: lastIndexInRound });
    });
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
    updateRoundStepIndex,
  };
}
