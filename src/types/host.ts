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
  lotteryAfterRound?: Record<number, boolean>;
  // Defaults to shown (true) when a round has no explicit entry, so existing packs keep
  // today's "leaderboard after every round" behavior unless a host opts a round out.
  standingsAfterRound?: Record<number, boolean>;
  // Optional — packs saved before this field existed don't have it, so always read the round
  // count through getRoundCount() rather than this field directly.
  roundCount?: number;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}

export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 12;
export const DEFAULT_ROUNDS = 6;

// The last round is always the wager-enabled "Go Hard or Go Home" round — resolve its number
// from the pack's own data instead of assuming a fixed round 6, since round count is now
// host-configurable. Falls back to the highest round actually present in the pack's questions
// for packs saved before roundCount existed.
export function getRoundCount(pack: Pick<QuestionPack, 'roundCount' | 'questions'>): number {
  if (pack.roundCount) return pack.roundCount;
  if (pack.questions.length === 0) return DEFAULT_ROUNDS;
  return Math.max(...pack.questions.map((q) => q.round));
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

export function createEmptyPack(roundCount: number = DEFAULT_ROUNDS): QuestionPack {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roundCount,
    questions: Array.from({ length: roundCount }, (_, i) => createEmptyQuestion(i + 1, i + 1 === roundCount)),
  };
}

export function createEmptyQuestion(round: number, isFinalRound: boolean = false): Question {
  return {
    id: Date.now() + Math.floor(Math.random() * 100000),
    round,
    text: '',
    answer: '',
    // category removed here to match your new QuestionEditor
    type: isFinalRound ? 'mcq' : 'text',
    ...(isFinalRound ? { options: ['', '', '', ''] } : {}),
  };
}
