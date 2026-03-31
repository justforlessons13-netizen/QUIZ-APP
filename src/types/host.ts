import { Question } from './game';

export interface QuestionPack {
  id: string;
  ownerId?: string;
  packPassword?: string;
  name: string;
  description: string;
  gameRules?: string;
  // Add BOTH of these lines here:
  roundNames?: Record<number, string>;
  roundRules?: Record<number, string>;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}

export interface GameSession {
  id: string;
  packId: string;
  packName: string;
  status: 'waiting' | 'active' | 'finished';
  currentRound: number;
  createdAt: string;
  teamCount: number;
  roundNames?: { [key: number]: string };
  roundRules?: { [key: number]: string };
}

export function createEmptyPack(): QuestionPack {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: Array.from({ length: 6 }, (_, i) => createEmptyQuestion(i + 1)),
  };
}

export function createEmptyQuestion(round: number): Question {
  return {
    id: Date.now() + Math.floor(Math.random() * 100000),
    round,
    text: '',
    answer: '',
    // category removed here to match your new QuestionEditor
    type: round === 6 ? 'mcq' : 'text',
    ...(round === 6 ? { options: ['', '', '', ''] } : {}),
  };
}

// This function determines which team ranks higher
export const compareTeams = (teamA: any, teamB: any) => {
  // 1. First, compare the absolute Total Score
  if (teamB.totalScore !== teamA.totalScore) {
    return teamB.totalScore - teamA.totalScore;
  }

  // 2. If Total Scores are equal, start the Tie-Breaker Loop
  // We start at Round 6 and go backwards to Round 1
  for (let r = 6; r >= 1; r--) {
    const scoreA = teamA.roundScores?.[r] || 0;
    const scoreB = teamB.roundScores?.[r] || 0;

    if (scoreB !== scoreA) {
      return scoreB - scoreA; // Return the first round where scores differ
    }
  }

  // 3. If they are identical in every single round, it's a true tie
  return 0;
};