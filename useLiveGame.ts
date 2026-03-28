import { useState, useCallback, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { LiveGameState, LiveTeam, RoundState, HostGamePhase, TEAM_EMOJIS, createLiveGame } from '@/types/live-game';
import { Question, checkAnswer, calculateScore } from '@/types/game';

const LEADERBOARD_ROUNDS = [2, 4, 6];

// Helper to save the game state to Firestore
async function saveGame(sessionId: string, state: LiveGameState) {
  const db = getFirestore();
  const gameRef = doc(db, 'games', sessionId);
  await setDoc(gameRef, state);
}

// Helper to calculate next state
function advanceToNextQuestion(prev: LiveGameState): LiveGameState {
  const nextIndex = prev.currentQuestionIndex + 1;
  if (nextIndex >= prev.questions.length) return { ...prev, phase: 'finished' };

  const nextQ = prev.questions[nextIndex];
  const currentQ = prev.questions[prev.currentQuestionIndex];

  // If new round, go to rules first
  if (nextQ.round !== currentQ.round) {
    return {
      ...prev,
      currentQuestionIndex: nextIndex, 
      currentRound: nextQ.round,
      phase: 'round-rules',
      timerActive: false,
    };
  }

  // Same round, next question: Initialize the round entry immediately
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
    timerActive: true,
    rounds: [...prev.rounds, newRound],
  };
}

export function useLiveGame(sessionId: string, packId: string, packName: string, questions: Question[]) {
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
      const changes: Record<string, any> = {};

      (Object.keys(game) as Array<keyof LiveGameState>).forEach(key => {
        if (game[key] !== prev[key]) {
          changes[key] = game[key];
        }
      });

      if (Object.keys(changes).length > 0) {
        updateDoc(gameRef, changes).catch(err => console.error("Save failed:", err));
      }

      prevGameRef.current = game;
    }
  }, [game, loading, sessionId]);

  // Timer
  useEffect(() => {
    if (game.timerActive && game.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setGame(prev => {
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
    setGame(prev => {
      const usedEmojis = prev.teams.map(t => t.emoji);
      const availableEmoji = emoji || TEAM_EMOJIS.find(e => !usedEmojis.includes(e)) || '🎮';
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
    setGame(prev => ({
      ...prev,
      teams: prev.teams.filter(t => t.id !== id),
    }));
  }, []);

  const setPhase = useCallback((phase: HostGamePhase) => {
    setGame(prev => ({ ...prev, phase }));
  }, []);

  const startGame = useCallback(() => {
    if (questions.length === 0) return;
    setGame(prev => ({
      ...prev,
      phase: 'game-rules',
      timerActive: false,
    }));
  }, [questions]);

  const advanceToRoundRules = useCallback(() => {
    setGame(prev => ({
      ...prev,
      phase: 'round-rules',
      currentRound: 1, 
    }));
  }, []);

  const startRound = useCallback(() => {
    setGame(prev => {
      const idx = prev.currentQuestionIndex;
      const q = prev.questions[idx];
      if (!q) return prev; 

      const time = q.round < 6 ? 45 : 60;
      const existingRound = prev.rounds.find(r => r.questionIndex === idx);
      let newRounds = prev.rounds;

      if (!existingRound) {
        const newRound: RoundState = {
          questionIndex: idx,
          roundNumber: q.round,
          question: q,
          answers: prev.teams.map(t => ({
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
        timerActive: true,
        rounds: newRounds,
      };
    });
  }, []);

  const stopTimer = useCallback(() => {
    setGame(prev => ({ ...prev, timerActive: false }));
  }, []);

  // NEW: Skip 'answer-collection' phase entirely.
  // This function is called when the Host clicks "Collect Answers" (or when Timer ends if you wanted auto-advance)
  const finishQuestion = useCallback(() => {
    setGame(prev => {
      // 1. Ensure current round state exists (fallback)
      const existing = prev.rounds.find(r => r.questionIndex === prev.currentQuestionIndex);
      let rounds = prev.rounds;
      
      if (!existing) {
        const q = prev.questions[prev.currentQuestionIndex];
        const round: RoundState = {
            questionIndex: prev.currentQuestionIndex,
            roundNumber: q.round,
            question: q,
            answers: prev.teams.map(t => ({
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

      // 2. DECIDE NEXT STEP IMMEDIATELY (Skip Answer Collection)
      const currentQ = prev.questions[prev.currentQuestionIndex];
      const nextIndex = prev.currentQuestionIndex + 1;
      const nextQ = prev.questions[nextIndex];

      // CASE A: Next question is in the SAME round -> Go to Next Question
      if (nextQ && nextQ.round === currentQ.round) {
        const time = nextQ.round < 6 ? 45 : 60;
        
        // Ensure round state exists for the NEW question
        const existingNextRound = rounds.find(r => r.questionIndex === nextIndex);
        if (!existingNextRound) {
           const newRoundEntry: RoundState = {
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
           rounds = [...rounds, newRoundEntry];
        }

        return {
          ...prev,
          phase: 'question', // <--- JUMP STRAIGHT TO NEXT QUESTION
          currentQuestionIndex: nextIndex,
          timeLeft: time,
          timerActive: true,
          rounds: rounds
        };
      }

      // CASE B: End of Round -> Go to Grading (Rewind)
      const roundQuestionsIndices = prev.questions
        .map((q, i) => q.round === currentQ.round ? i : -1)
        .filter(i => i !== -1);
      
      const firstIndexInRound = roundQuestionsIndices[0];

      // Auto-grade logic
      const updatedRounds = rounds.map(r => {
        if (r.roundNumber !== currentQ.round) return r;
        const q = prev.questions[r.questionIndex];
        return {
          ...r,
          answers: r.answers.map(a => ({
            ...a,
            isCorrect: a.isCorrect ?? checkAnswer(a.answer, q.answer),
          }))
        };
      });

      return {
        ...prev,
        phase: 'grading', // <--- JUMP STRAIGHT TO GRADING
        currentQuestionIndex: firstIndexInRound,
        timerActive: false,
        rounds: updatedRounds,
      };
    });
  }, []);

  const advanceFromAnswerCollection = useCallback(() => {
    // This function is effectively replaced by finishQuestion for the main flow,
    // but kept if any other component relies on it. 
    // Logic is handled in finishQuestion now.
  }, []);

  const updateTeamAnswer = useCallback((teamId: string, answer: string, isWagered?: boolean) => {
    setGame(prev => {
      const rounds = prev.rounds.map(r => {
        if (r.questionIndex !== prev.currentQuestionIndex) return r;
        return {
          ...r,
          answers: r.answers.map(a =>
            a.teamId === teamId
              ? { ...a, answer, ...(isWagered !== undefined ? { isWagered } : {}) }
              : a
          ),
        };
      });
      return { ...prev, rounds };
    });
  }, []);

  const autoGrade = useCallback(() => {
    setGame(prev => {
      const q = prev.questions[prev.currentQuestionIndex];
      if (!q) return prev;
      const rounds = prev.rounds.map(r => {
        if (r.questionIndex !== prev.currentQuestionIndex) return r;
        return {
          ...r,
          answers: r.answers.map(a => ({
            ...a,
            isCorrect: checkAnswer(a.answer, q.answer),
          })),
        };
      });
      return { ...prev, rounds, phase: 'grading' };
    });
  }, []);

  const setAnswerCorrectness = useCallback((teamId: string, isCorrect: boolean) => {
    setGame(prev => {
      const rounds = prev.rounds.map(r => {
        if (r.questionIndex !== prev.currentQuestionIndex) return r;
        return {
          ...r,
          answers: r.answers.map(a =>
            a.teamId === teamId ? { ...a, isCorrect } : a
          ),
        };
      });
      return { ...prev, rounds };
    });
  }, []);

  const finalizeGrading = useCallback(() => {
    setGame(prev => {
      // 1. Score CURRENT question
      const roundIdx = prev.rounds.findIndex(r => r.questionIndex === prev.currentQuestionIndex);
      if (roundIdx === -1) return prev;
      
      const roundState = prev.rounds[roundIdx];
      const currentQ = prev.questions[prev.currentQuestionIndex];
      
      const updatedAnswers = roundState.answers.map(a => {
        const points = calculateScore(currentQ.round, !!a.isCorrect, a.isWagered);
        return { ...a, pointsAwarded: points };
      });
      
      const updatedRoundState = { ...roundState, answers: updatedAnswers, isGraded: true };
      const newRounds = [...prev.rounds];
      newRounds[roundIdx] = updatedRoundState;

      // Update Team Scores (Accumulate for this round)
      const refinedTeams = prev.teams.map(t => {
        const ans = updatedAnswers.find(a => a.teamId === t.id);
        const pts = ans?.pointsAwarded ?? 0;
        
        const newRoundScores = [...t.roundScores];
        while(newRoundScores.length < currentQ.round) newRoundScores.push(0);
        
        // Add points to current round bucket
        const currentRoundScore = newRoundScores[currentQ.round - 1] || 0;
        newRoundScores[currentQ.round - 1] = currentRoundScore + pts;

        return {
          ...t,
          score: t.score + pts,
          roundScores: newRoundScores
        };
      });

      // 2. Check Next Step
      const nextIndex = prev.currentQuestionIndex + 1;
      const nextQ = prev.questions[nextIndex];

      // Same round -> Next Grading Step
      if (nextQ && nextQ.round === currentQ.round) {
        return {
          ...prev,
          rounds: newRounds,
          teams: refinedTeams,
          currentQuestionIndex: nextIndex, // Next Q
          phase: 'grading' // Stay
        };
      }

      // End of Round -> Reveal (Rewind to first Q of round)
      const roundQuestionsIndices = prev.questions
        .map((q, i) => q.round === currentQ.round ? i : -1)
        .filter(i => i !== -1);
      const firstIndexInRound = roundQuestionsIndices[0];

      return {
        ...prev,
        rounds: newRounds,
        teams: refinedTeams,
        phase: 'reveal',
        currentQuestionIndex: firstIndexInRound // REWIND
      };
    });
  }, []);

  const advanceFromReveal = useCallback(() => {
    setGame(prev => {
      const currentQ = prev.questions[prev.currentQuestionIndex];
      const nextIndex = prev.currentQuestionIndex + 1;
      const nextQ = prev.questions[nextIndex];

      // Same round -> Next Reveal Step
      if (nextQ && nextQ.round === currentQ.round) {
        return {
          ...prev,
          currentQuestionIndex: nextIndex,
          phase: 'reveal'
        };
      }

      // End of Round -> Leaderboard / Next Round (Uses helper)
      if (LEADERBOARD_ROUNDS.includes(currentQ.round)) {
        if (currentQ.round === 6 || !nextQ) {
          return { ...prev, phase: 'final-reveal' };
        }
        return { ...prev, phase: 'leaderboard' };
      }

      return advanceToNextQuestion(prev);
    });
  }, []);

  const advanceFromLeaderboard = useCallback(() => {
    setGame(prev => {
      const nextIndex = prev.currentQuestionIndex + 1;
      if (nextIndex >= prev.questions.length) return { ...prev, phase: 'finished' };
      return advanceToNextQuestion(prev);
    });
  }, []);

  const resetGame = useCallback(() => {
    const newGame = createLiveGame(sessionId, packId, packName, questions);
    setGame(newGame);
    const db = getFirestore();
    setDoc(doc(db, 'games', sessionId), newGame);
  }, [sessionId, packId, packName, questions]);

  return {
    game,
    loading,
    addTeam,
    removeTeam,
    setPhase,
    startGame,
    advanceToRoundRules, 
    startRound,         
    stopTimer,
    finishQuestion, // EXPORTED NEW FUNCTION (renamed from moveToAnswerCollection)
    advanceFromAnswerCollection, 
    updateTeamAnswer,
    autoGrade,
    setAnswerCorrectness,
    finalizeGrading,
    advanceFromReveal,
    advanceFromLeaderboard,
    resetGame,
  };
}