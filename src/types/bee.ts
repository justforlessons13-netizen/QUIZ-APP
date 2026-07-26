export interface BeeWord {
  id: string;
  word: string;
  definition: string;
  exampleSentence?: string;
  partOfSpeech?: string;
  difficulty?: 'easy' | 'medium' | 'hard'; // stored for future use, not used by v1 gameplay
}

export interface BeePack {
  id: string;
  ownerId?: string;
  packPassword?: string;
  name: string;
  description: string;
  rules?: string;
  createdAt: string;
  updatedAt: string;
  words: BeeWord[];
  deviceMode?: 'host-only'; // only legal value in v1 — extensibility seam for a future multi-device mode
}

export interface BeePlayer {
  id: string;
  name: string;
  status: 'active' | 'eliminated';
  wordsCorrect: number;
  wordsAttempted: number;
  eliminatedAtRound: number | null;
  eliminatedOnWordId: string | null;
  totalTimeMs: number; // cumulative elapsed time across all answered words — tiebreak data, not a game clock
}

export type BeeGamePhase =
  | 'roster-entry'
  | 'stage-pairing'
  | 'turn-intro'
  | 'word-cycle'
  | 'result'
  | 'round-leaderboard'
  | 'tie-break'
  | 'champion'
  | 'finished';

export interface BeeGameState {
  sessionId: string;
  packId: string;
  packName: string;
  ownerId?: string;
  phase: BeeGamePhase;
  players: BeePlayer[];
  wordOrder: string[];
  currentWordIndex: number;
  currentPlayerId: string | null;
  currentRound: number;
  turnOrder: string[];
  turnPointer: number;
  currentRoundQueue: string[]; // active player ids still needing a turn this round
  wordRevealedAt: number | null; // epoch ms — stopwatch start, set by revealWord()
  hintsUsedThisTurn: Array<'definition' | 'sentence'>;
  lastResult: { playerId: string; wordId: string; correct: boolean | null; elapsedMs: number | null } | null;
  previousRankMap: Record<string, number> | null; // powers BeeLeaderboard rank-change arrows
  createdAt: string;
  gameCode: string; // stage device join code — looked up via bee-game-codes/{gameCode}
}

export interface BeeSession {
  id: string;
  ownerId?: string;
  packId: string;
  packName: string;
  status: 'waiting' | 'active' | 'finished';
  currentRound: number;
  createdAt: string;
  playerCount: number;
}

export function createEmptyWord(): BeeWord {
  return {
    id: crypto.randomUUID(),
    word: '',
    definition: '',
    exampleSentence: '',
    partOfSpeech: '',
    difficulty: 'medium',
  };
}

export function createEmptyBeePack(): BeePack {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    words: Array.from({ length: 10 }, () => createEmptyWord()),
    deviceMode: 'host-only',
  };
}

export function createEmptyBeeGameState(
  sessionId: string,
  packId: string,
  packName: string,
  ownerId?: string
): BeeGameState {
  return {
    sessionId,
    packId,
    packName,
    ownerId,
    phase: 'roster-entry',
    players: [],
    wordOrder: [],
    currentWordIndex: -1,
    currentPlayerId: null,
    currentRound: 1,
    turnOrder: [],
    turnPointer: -1,
    currentRoundQueue: [],
    wordRevealedAt: null,
    hintsUsedThisTurn: [],
    lastResult: null,
    previousRankMap: null,
    createdAt: new Date().toISOString(),
    gameCode: Math.random().toString(36).substring(2, 6).toUpperCase(),
  };
}

// The one real ranking function for Spelling Bee standings — import this everywhere
// (avoid QGAME's mistake of leaving compareTeams as unused dead code with logic duplicated inline).
export function compareBeePlayers(a: BeePlayer, b: BeePlayer): number {
  const aActive = a.status === 'active';
  const bActive = b.status === 'active';
  if (aActive !== bActive) return aActive ? -1 : 1; // survivors rank above eliminated

  if (!aActive && !bActive) {
    // eliminated later (survived more rounds) ranks higher
    const aRound = a.eliminatedAtRound ?? 0;
    const bRound = b.eliminatedAtRound ?? 0;
    if (aRound !== bRound) return bRound - aRound;
  }

  if (a.wordsCorrect !== b.wordsCorrect) return b.wordsCorrect - a.wordsCorrect;

  // Tied on status and correctness — faster cumulative time ranks higher
  if (a.totalTimeMs !== b.totalTimeMs) return a.totalTimeMs - b.totalTimeMs;

  return a.name.localeCompare(b.name);
}
