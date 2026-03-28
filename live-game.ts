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
  isCorrect: boolean | null; // null = not graded yet
  isWagered: boolean;
  pointsAwarded: number;
}

export interface RoundState {
  questionIndex: number;
  roundNumber: number;
  question: Question;
  answers: TeamAnswer[];
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
  | 'leaderboard'
  | 'final-reveal'
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
  rounds: RoundState[];
  timeLeft: number;
  timerActive: boolean;
  createdAt: string;
}

export const TEAM_EMOJIS = ['🎯', '🧠', '🧙', '🍺', '📚', '🎸', '🦊', '🌟', '🔥', '🎲'];

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
    rounds: [],
    timeLeft: 0,
    timerActive: false,
    createdAt: new Date().toISOString(),
  };
}
