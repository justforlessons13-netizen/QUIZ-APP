import { Question } from './game';

export interface QuestionPack {
  id: string;
  ownerId?: string;
  packPassword?: string;
  name: string;
  description: string;
  gameRules?: string; // New: Global game rules
  roundRules?: Record<number, string>; // New: Rules specific to Round N
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
    category: '',
    type: round === 6 ? 'mcq' : 'text',
    ...(round === 6 ? { options: ['', '', '', ''] } : {}),
  };
}
