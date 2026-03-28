export interface Team {
  id: string;
  name: string;
  emoji: string;
  score: number;
  roundScores: number[];
  isPlayer: boolean;
}

export interface Question {
  id: number;
  round: number;
  text: string;
  answer: string;
  category: string;
  type: 'text' | 'mcq';
  options?: string[];
  mediaUrl?: string;
}

export interface Submission {
  teamId: string;
  questionId: number;
  roundId: number;
  answerText: string;
  isWagered: boolean;
  isCorrect?: boolean;
  pointsAwarded?: number;
}

export type GamePhase =
  | 'lobby'
  | 'question'
  | 'recap'
  | 'grading'
  | 'reveal'
  | 'leaderboard'
  | 'final-reveal'
  | 'finished';

export function calculateScore(roundId: number, isCorrect: boolean, isWagered: boolean): number {
  if (roundId < 6) return isCorrect ? 1 : 0;
  if (isWagered) return isCorrect ? 2 : -2;
  return isCorrect ? 1 : 0;
}

export function checkAnswer(playerAnswer: string, correctAnswer: string): boolean {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return normalize(playerAnswer) === normalize(correctAnswer);
}
