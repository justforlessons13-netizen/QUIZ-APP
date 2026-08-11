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
  x: number; // 0-100 — label/badge anchor point (capital, or region centroid), in the map's viewBox
  y: number; // 0-100
  hexes?: TerritoryHexTile[]; // hex tiles belonging to this region — style: 'hex' maps only
  polygons?: [number, number][][]; // real border rings (multipolygon — islands are separate rings, not holes) — style: 'polygon' maps only
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
  style: 'hex' | 'polygon';
  hexRadius?: number; // style: 'hex' only
  boundaryEdges?: TerritoryBoundaryEdge[]; // hex-edge segments between two differently-owned regions — style: 'hex' only
  coastline?: [number, number][][]; // dissolved outer landmass boundary, for the halo glow — style: 'polygon' only
  nodes: TerritoryNode[];
  edges: TerritoryEdge[];
}

// ─── Live game session ──────────────────────────────────────────────────────

export const BASE_STARS = 3;

export interface TerritoryPlayer {
  id: string;
  name: string;
  emoji: string;
  baseNodeId: string | null;
  ownedNodeIds: string[];
  score: number;
  baseStars: number; // starts at BASE_STARS once a base is assigned; 0 = eliminated
  eliminated: boolean;
}

export type TerritoryMode = 'duo' | 'trio';
export type TerritoryVisibility = 'public' | 'private';

// Which of the three systems is currently active. All three share the same
// question -> pick -> reveal phase shape below, discriminated by this field —
// avoids a combinatorial phase enum (base-capture-question, land-capture-pick, ...).
export type TerritoryRoundKind = 'base-capture' | 'land-capture' | 'battle';

export type TerritoryPhase =
  | 'lobby'
  | 'question'      // a broadcast (base/land-capture) or 1-on-1 duel (battle) question is live
  | 'answer-reveal' // brief auto-advancing beat showing everyone's answer/correctness/time before pendingPhase
  | 'pick'          // someone must choose a target — a base slot, neutral land, or (battle) an enemy tile to attack
  | 'reveal'        // base-capture/land-capture round summary; battle results are shown inline via lastBattleResult instead
  | 'final-standings'
  | 'finished';

export interface TerritoryAnswer {
  answer: string;
  isCorrect: boolean | null;
  elapsedMs: number | null;
}

export interface TerritoryAnswerBreakdownEntry {
  playerId: string;
  answer: string;
  isCorrect: boolean;
  elapsedMs: number | null;
}

export interface TerritoryAnswerBreakdown {
  correctAnswer: string;
  entries: TerritoryAnswerBreakdownEntry[]; // pre-sorted correct-then-fastest, same rank order pick order uses
}

export interface TerritoryBattleResult {
  attackerId: string;
  defenderId: string;
  targetNodeId: string;
  hit: boolean; // did the attacker win this question
  starsLeft?: number; // only set when the target was a base
  eliminated?: boolean; // defender fully eliminated this exchange
}

export interface TerritoryGameState {
  sessionId: string;
  packId: string;
  packName: string;
  mode: TerritoryMode;
  visibility: TerritoryVisibility;
  mapId: string;
  phase: TerritoryPhase;
  roundKind: TerritoryRoundKind;
  players: TerritoryPlayer[];
  currentQuestionId: number | null;
  usedQuestionIds: number[]; // drawn-so-far pool, so a pack's questions don't repeat within a game
  timeLeft: number;
  timerActive: boolean;
  questionRevealedAt: number | null; // epoch ms — set when the current question goes live, for elapsedMs
  // Who's expected to answer the current question — all active players for base/land-capture,
  // exactly [attackerId, defenderId] for battle. Keyed by playerId — a plain array-of-answers
  // would force every simultaneous submission to contend for the same document (exactly the bug
  // QGame's rounds/answers had before it was migrated off arrays — see
  // src/types/live-game.ts's RoundState.answers comment). Built as a map from day one here.
  respondingPlayerIds: string[];
  answers: Record<string, TerritoryAnswer>;

  // ── Answer-reveal sub-state (phase === 'answer-reveal') — resolveQuestion computes the real
  // next phase (pick/reveal/final-standings/etc, with every other field already set correctly)
  // but parks it here instead of showing it immediately, so the answer breakdown can display for
  // a few seconds first. See useTerritoryGame.ts's answer-reveal auto-advance effect.
  pendingPhase: TerritoryPhase | null;
  lastAnswerBreakdown: TerritoryAnswerBreakdown | null;

  // ── Pick sub-state (phase === 'pick') ──
  pickOrder: string[]; // playerIds who get an active pick this cycle, already rank-ordered
  pickIndex: number; // index into pickOrder for whoever's turn it is
  pickSlotsRemaining: number; // how many picks the current picker still owes (2 then 1 for land-capture's top ranks; 1 for base-capture; unused in battle)
  availablePickIds: string[]; // currently-valid tap targets for the current picker; recomputed after every pick

  // ── Battle sub-state (persists across the whole Battle round-kind) ──
  attackerId: string | null;
  defenderId: string | null;
  targetNodeId: string | null;
  lastBattleResult?: TerritoryBattleResult | null;

  // ── Base-capture / land-capture reveal sub-state — base/land-capture never takes territory
  // from an opponent (that's Battle's job exclusively), so there's no "captured from" defender
  // to track here, unlike lastBattleResult above.
  lastCaptures?: Record<string, string[]>; // playerId -> nodeIds picked this cycle, for the reveal screen
  lastIncome?: Record<string, number>; // playerId -> territory income earned this cycle, for the reveal screen

  createdAt: string;
  gameCode: string;
}

export const PLAYER_EMOJIS = ['🔥', '⚡', '🌊', '🌪️', '🗿', '🐺'];

export function playerCountFor(mode: TerritoryMode): 2 | 3 {
  return mode === 'duo' ? 2 : 3;
}

export function createEmptyTerritoryGame(
  sessionId: string,
  packId: string,
  packName: string,
  mode: TerritoryMode,
  visibility: TerritoryVisibility,
  mapId: string
): TerritoryGameState {
  return {
    sessionId,
    packId,
    packName,
    mode,
    visibility,
    mapId,
    phase: 'lobby',
    roundKind: 'base-capture',
    players: [],
    currentQuestionId: null,
    usedQuestionIds: [],
    timeLeft: 0,
    timerActive: false,
    questionRevealedAt: null,
    respondingPlayerIds: [],
    answers: {},
    pendingPhase: null,
    lastAnswerBreakdown: null,
    pickOrder: [],
    pickIndex: 0,
    pickSlotsRemaining: 0,
    availablePickIds: [],
    attackerId: null,
    defenderId: null,
    targetNodeId: null,
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
