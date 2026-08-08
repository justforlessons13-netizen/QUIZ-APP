// ─── Question pack ──────────────────────────────────────────────────────────

export type TerritoryQuestionType = 'choice' | 'quiz'; // quiz = numeric-answer

export interface TerritoryQuestion {
  id: number;
  type: TerritoryQuestionType;
  text: string;
  options?: string[]; // 'choice' only
  answer: string; // correct option text, or a numeric string for 'quiz'
  mediaUrl?: string;
}

export interface TerritoryPack {
  id: string;
  ownerId?: string;
  packPassword?: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  questions: TerritoryQuestion[]; // flat pool, drawn randomly per round
}

export const MIN_TERRITORY_QUESTIONS = 8;

export function createEmptyTerritoryQuestion(): TerritoryQuestion {
  return {
    id: Date.now() + Math.floor(Math.random() * 100000),
    type: 'choice',
    text: '',
    answer: '',
    options: ['', '', '', ''],
  };
}

export function createEmptyTerritoryPack(): TerritoryPack {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: Array.from({ length: MIN_TERRITORY_QUESTIONS }, () => createEmptyTerritoryQuestion()),
  };
}

// ─── Map ────────────────────────────────────────────────────────────────────

export interface TerritoryHexTile {
  cx: number; // 0-100
  cy: number; // 0-100
}

export interface TerritoryNode {
  id: string;
  name: string;
  x: number; // 0-100 — label/badge anchor point (region centroid), in the map's viewBox
  y: number; // 0-100
  hexes: TerritoryHexTile[]; // hex tiles belonging to this region — see lib/hex-map.ts
  isBaseSlot?: boolean; // eligible starting base for a player
  value: number; // territory's per-round income when owned
}

export interface TerritoryEdge {
  a: string; // node id
  b: string; // node id
}

export interface TerritoryBoundaryEdge {
  x1: number; y1: number; x2: number; y2: number;
}

export interface TerritoryMapDef {
  id: string;
  name: string;
  forPlayerCount: 2 | 3;
  hexRadius: number;
  boundaryEdges: TerritoryBoundaryEdge[]; // hex-edge segments between two differently-owned regions
  nodes: TerritoryNode[];
  edges: TerritoryEdge[];
}

// ─── Live game session ──────────────────────────────────────────────────────

export interface TerritoryPlayer {
  id: string;
  name: string;
  emoji: string;
  baseNodeId: string | null;
  ownedNodeIds: string[];
  score: number;
  eliminated: boolean;
}

export type TerritoryMode = 'duo' | 'trio';
export type TerritoryVisibility = 'public' | 'private';
export type TerritoryDuration = 'fast' | 'long';

export type TerritoryPhase =
  | 'lobby'
  | 'capture'
  | 'battle'
  | 'round-reveal'
  | 'final-standings'
  | 'finished';

export interface TerritoryAnswer {
  answer: string;
  isCorrect: boolean | null;
  elapsedMs: number | null;
}

export interface TerritoryGameState {
  sessionId: string;
  packId: string;
  packName: string;
  mode: TerritoryMode;
  visibility: TerritoryVisibility;
  duration: TerritoryDuration;
  mapId: string;
  phase: TerritoryPhase;
  players: TerritoryPlayer[];
  currentRound: number; // 0 = capture phase, 1..totalBattleRounds = battle
  totalBattleRounds: number;
  currentQuestionId: number | null;
  usedQuestionIds: number[]; // drawn-so-far pool, so a pack's questions don't repeat within a game
  timeLeft: number;
  timerActive: boolean;
  questionRevealedAt: number | null; // epoch ms — set when the current question goes live, for elapsedMs
  // Keyed by playerId — a plain array-of-answers would force every simultaneous submission to
  // contend for the same document (exactly the bug QGame's rounds/answers had before it was
  // migrated off arrays — see src/types/live-game.ts's RoundState.answers comment). Built as a
  // map from day one here.
  answers: Record<string, TerritoryAnswer>;
  lastCaptures?: Record<string, string>; // playerId -> nodeId captured this round, for the reveal screen
  lastDefenders?: Record<string, string>; // playerId (attacker) -> playerId (defender), only set when the capture was taken from an opponent
  lastIncome?: Record<string, number>; // playerId -> territory income earned this round, for the reveal screen
  eliminatedThisRound?: string[]; // playerIds eliminated this round (base captured), for the reveal screen
  createdAt: string;
  gameCode: string;
}

export const PLAYER_EMOJIS = ['🔥', '⚡', '🌊', '🌪️', '🗿', '🐺'];

export function totalBattleRoundsFor(duration: TerritoryDuration): number {
  return duration === 'fast' ? 4 : 12;
}

export function playerCountFor(mode: TerritoryMode): 2 | 3 {
  return mode === 'duo' ? 2 : 3;
}

export function createEmptyTerritoryGame(
  sessionId: string,
  packId: string,
  packName: string,
  mode: TerritoryMode,
  visibility: TerritoryVisibility,
  duration: TerritoryDuration,
  mapId: string
): TerritoryGameState {
  return {
    sessionId,
    packId,
    packName,
    mode,
    visibility,
    duration,
    mapId,
    phase: 'lobby',
    players: [],
    currentRound: 0,
    totalBattleRounds: totalBattleRoundsFor(duration),
    currentQuestionId: null,
    usedQuestionIds: [],
    timeLeft: 0,
    timerActive: false,
    questionRevealedAt: null,
    answers: {},
    createdAt: new Date().toISOString(),
    gameCode: Math.random().toString(36).substring(2, 6).toUpperCase(),
  };
}

// The one real ranking function for Territory standings — import this everywhere rather than
// duplicating comparison logic inline (QGame's compareTeams mistake, documented in
// src/types/bee.ts, is exactly what this avoids).
export function compareTerritoryPlayers(a: TerritoryPlayer, b: TerritoryPlayer): number {
  if (a.ownedNodeIds.length !== b.ownedNodeIds.length) return b.ownedNodeIds.length - a.ownedNodeIds.length;
  if (a.score !== b.score) return b.score - a.score;
  return a.name.localeCompare(b.name);
}
