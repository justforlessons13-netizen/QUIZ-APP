import { Question } from './game';

export interface LiveTeam {
  id: string;
  name: string;
  emoji: string;
  score: number;
  roundScores: number[];
}

export interface TeamAnswer {
  teamId: string;
  answer: string;
  isCorrect: boolean | null;
  isWagered: boolean;
  pointsAwarded: number;
  hasCheated?: boolean;
}

export interface RoundState {
  questionIndex: number;
  roundNumber: number;
  question: Question;
  // Keyed by teamId (was TeamAnswer[]) — lets a team's submit write target a single field path
  // (rounds.{questionIndex}.answers.{teamId}) instead of reading-modifying-writing the entire
  // rounds array, which put every simultaneously-submitting team in contention for the same
  // document and forced repeated transaction retries under load.
  answers: Record<string, TeamAnswer>;
  isGraded: boolean;
}

export type HostGamePhase =
  | 'team-setup'
  | 'game-rules'
  | 'round-rules'
  | 'question'
  | 'answer-collection'
  | 'grading'
  | 'reveal'
  | 'round-scores-adjustment'
  | 'lottery'
  | 'leaderboard'
  | 'final-reveal'
  | 'final-standings'
  | 'finished';

export interface LiveGameState {
  sessionId: string;
  packId: string;
  packName: string;
  teams: LiveTeam[];
  questions: Question[];
  currentQuestionIndex: number;
  currentRound: number;
  phase: HostGamePhase;
  // Keyed by questionIndex (was RoundState[]) — see the answers field comment on RoundState for why.
  rounds: Record<number, RoundState>;
  timeLeft: number;
  timerActive: boolean;
  createdAt: string;
  gameCode: string;     // <--- ADDED: Stored in Firebase!
  revealStep?: number;  // <--- RESTORED: Projector podium sync
  currentRuleIndex?: number; // <--- ADDED: For Game Rules sync
  roundRulesIndex?: number; // Round Rules carousel position, host <-> projector sync
  roundStepIndex?: number; // Shared Grading/Reveal within-round stepper position (host <-> projector sync)
  winnerConfettiPlays?: number; // Increment to (re)trigger the Final Standings podium's confetti, host <-> projector sync
  lotteryState?: {
    min: number;
    max: number;
    remainingPool: number[];
    currentDrawnNumber: number | null;
    history: number[];
    confettiPlays: number; // Increment to (re)trigger the projector's celebration burst
  } | null;
}

export const TEAM_EMOJIS = [
  '🎯', '🧠', '🪄', '🚀', '📚', '🎸', '🦊', '⭐', '🔥', '🎲', '🇹🇿', '🦁', '🦖', '💎', '🎮', '🐼', '🍕', '👻'
];

// `rounds` must be a MAP keyed by questionIndex, never an array. Every answer submit writes the
// field path rounds.{questionIndex}.answers.{teamId}, and Firestore cannot address an array
// element with a dotted path — instead of failing, the server silently REPLACES the whole array
// with a map containing only that one path, wiping every other round's answers and grading.
// Games created before rounds was migrated off arrays (and any doc written by an older build)
// still hold an array, so normalize on every read and let the host persist the healed shape.
export function normalizeRounds(rounds: unknown): Record<number, RoundState> {
  if (Array.isArray(rounds)) {
    const healed: Record<number, RoundState> = {};
    rounds.forEach((round, i) => {
      if (!round) return; // arrays can be sparse; skip holes
      const r = round as RoundState;
      healed[typeof r.questionIndex === 'number' ? r.questionIndex : i] = r;
    });
    return healed;
  }
  return (rounds ?? {}) as Record<number, RoundState>;
}

export function createLiveGame(sessionId: string, packId: string, packName: string, questions: Question[]): LiveGameState {
  return {
    sessionId,
    packId,
    packName,
    teams: [],
    questions,
    currentQuestionIndex: 0,
    currentRound: questions[0]?.round ?? 1,
    phase: 'team-setup',
    rounds: {},
    timeLeft: 0,
    timerActive: false,
    createdAt: new Date().toISOString(),
    gameCode: Math.random().toString(36).substring(2, 6).toUpperCase(), // <--- Generates ONCE when DB doc is created
    revealStep: 0,
    currentRuleIndex: 0,
    roundRulesIndex: 0,
    roundStepIndex: 0,
    winnerConfettiPlays: 0,
  };
}