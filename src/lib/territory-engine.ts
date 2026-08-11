// Pure pick-resolution logic shared between the host's useTerritoryGame hook (which needs
// slotsForRank/computeAvailablePickIds when a question resolves) and the picking player's own
// device (TerritoryPlayerGame.tsx, which applies a pick via a Firestore transaction — only the
// player whose turn it is ever writes here, so no host round-trip is needed, mirroring how
// submitAnswer writes directly from the player's device instead of through the host hook).
import {
  TerritoryGameState, TerritoryPlayer, TerritoryQuestion, TerritoryMapDef, TerritoryRoundKind, BASE_STARS,
} from '@/types/territory';
import { neighborsOf } from '@/data/territory-maps';

export const QUESTION_SECONDS = 20;

export function pickQuestion(questions: TerritoryQuestion[], usedIds: number[]): TerritoryQuestion | null {
  if (questions.length === 0) return null;
  const fresh = questions.filter((q) => !usedIds.includes(q.id));
  const pool = fresh.length > 0 ? fresh : questions; // wrap around once the pool is exhausted
  return pool[Math.floor(Math.random() * pool.length)];
}

// Land-capture pick slots by rank (0 = fastest correct answer): 1st takes 2 tiles, 2nd takes 1,
// 3rd takes none. Duo games never reach index 2, so the loser still gets the "2nd place" tier,
// not a total shutout.
const LAND_CAPTURE_TIERS = [2, 1, 0];

// How many active picks a given rank owes this cycle. Base-capture: everyone picks except the
// last-ranked player, who is auto-assigned whatever base slot is left. Land-capture: the tiered
// 2/1/0 split above.
export function slotsForRank(roundKind: 'base-capture' | 'land-capture', rank: number, total: number): number {
  if (roundKind === 'base-capture') return rank === total - 1 ? 0 : 1;
  return LAND_CAPTURE_TIERS[rank] ?? 0;
}

// The valid tap targets for whoever's picking right now — recomputed after every single pick,
// since claiming one tile can open up new adjacency for the next.
export function computeAvailablePickIds(
  roundKind: TerritoryRoundKind, map: TerritoryMapDef, picker: TerritoryPlayer, players: TerritoryPlayer[]
): string[] {
  if (roundKind === 'base-capture') {
    const taken = new Set(players.flatMap((p) => (p.baseNodeId ? [p.baseNodeId] : [])));
    return map.nodes.filter((n) => n.isBaseSlot && !taken.has(n.id)).map((n) => n.id);
  }

  const ownedSet = new Set(picker.ownedNodeIds);
  const neighbors = Array.from(new Set(picker.ownedNodeIds.flatMap((n) => neighborsOf(map, n))))
    .filter((n) => !ownedSet.has(n));

  if (roundKind === 'land-capture') {
    return neighbors.filter((n) => !players.some((p) => p.ownedNodeIds.includes(n)));
  }

  // battle: any adjacent tile currently owned by a still-active opponent
  return neighbors.filter((n) => players.some((p) => p.id !== picker.id && !p.eliminated && p.ownedNodeIds.includes(n)));
}

// Finds the next player in pickOrder (starting at startIdx) who both owes a pick this cycle AND
// actually has something available to pick — land can run out before every ranked player gets
// their nominal share (e.g. the map's last 2 tiles both go to 1st place, leaving 2nd place with
// slots owed but nothing left), which would otherwise soft-lock their turn with zero options.
// Returns pickOrder.length if nobody remaining has anything to pick.
export function findNextPickerIndex(
  pickOrder: string[], roundKind: 'base-capture' | 'land-capture', startIdx: number,
  map: TerritoryMapDef, players: TerritoryPlayer[]
): number {
  let idx = startIdx;
  while (idx < pickOrder.length) {
    if (slotsForRank(roundKind, idx, pickOrder.length) > 0) {
      const picker = players.find((p) => p.id === pickOrder[idx]);
      if (picker && computeAvailablePickIds(roundKind, map, picker, players).length > 0) return idx;
    }
    idx++;
  }
  return pickOrder.length;
}

// Applies one pick (a base slot, a neutral land tile, or — for battle — a chosen attack target)
// to a game state and returns the next state. Validates turn order and target legality; returns
// the input unchanged if either check fails. Pure and side-effect-free so it can run identically
// inside the host's setGame updater or a player-device Firestore transaction.
export function applyPick(state: TerritoryGameState, playerId: string, nodeId: string, map: TerritoryMapDef, questions: TerritoryQuestion[]): TerritoryGameState {
  if (state.phase !== 'pick') return state;
  if (state.pickOrder[state.pickIndex] !== playerId) return state; // not your turn
  if (!state.availablePickIds.includes(nodeId)) return state; // invalid target

  let players = [...state.players];
  const updatePlayer = (id: string, fn: (p: TerritoryPlayer) => TerritoryPlayer) => {
    players = players.map((p) => (p.id === id ? fn(p) : p));
  };

  // Territory income: every owned node pays out its value once a pick cycle finishes — matches
  // the reference game's growing per-player totals.
  const applyIncome = (): Record<string, number> => {
    const income: Record<string, number> = {};
    players.forEach((p) => {
      if (p.eliminated) return;
      const total = p.ownedNodeIds.reduce((sum, id) => sum + (map.nodes.find((n) => n.id === id)?.value ?? 0), 0);
      if (total > 0) {
        income[p.id] = total;
        updatePlayer(p.id, (pl) => ({ ...pl, score: pl.score + total }));
      }
    });
    return income;
  };

  // Advances to the next player owed a pick this cycle, or finishes the cycle (auto-assigning
  // the last base slot for base-capture, or just closing out for land-capture) into 'reveal'.
  const finishPickOrAdvance = (roundKind: 'base-capture' | 'land-capture', lastCaptures: Record<string, string[]>): TerritoryGameState => {
    const next = findNextPickerIndex(state.pickOrder, roundKind, state.pickIndex + 1, map, players);

    if (next < state.pickOrder.length) {
      const picker = players.find((p) => p.id === state.pickOrder[next])!;
      return {
        ...state,
        players,
        lastCaptures,
        pickIndex: next,
        pickSlotsRemaining: slotsForRank(roundKind, next, state.pickOrder.length),
        availablePickIds: computeAvailablePickIds(roundKind, map, picker, players),
      };
    }

    let finalCaptures = lastCaptures;
    if (roundKind === 'base-capture') {
      const remainingBases = map.nodes.filter((n) => n.isBaseSlot && !players.some((p) => p.baseNodeId === n.id));
      const unassigned = players.filter((p) => !p.baseNodeId);
      unassigned.forEach((p, i) => {
        const baseId = remainingBases[i]?.id;
        if (!baseId) return;
        updatePlayer(p.id, (pl) => ({ ...pl, baseNodeId: baseId, ownedNodeIds: [baseId], baseStars: BASE_STARS }));
        finalCaptures = { ...finalCaptures, [p.id]: [...(finalCaptures[p.id] ?? []), baseId] };
      });
    }

    const lastIncome = applyIncome();
    return { ...state, players, lastCaptures: finalCaptures, lastIncome, phase: 'reveal', timerActive: false };
  };

  if (state.roundKind === 'base-capture' || state.roundKind === 'land-capture') {
    const lastCaptures = {
      ...state.lastCaptures,
      [playerId]: [...(state.lastCaptures?.[playerId] ?? []), nodeId],
    };

    if (state.roundKind === 'base-capture') {
      updatePlayer(playerId, (p) => ({ ...p, baseNodeId: nodeId, ownedNodeIds: [nodeId], baseStars: BASE_STARS }));
      return finishPickOrAdvance('base-capture', lastCaptures);
    }

    updatePlayer(playerId, (p) => ({ ...p, ownedNodeIds: [...p.ownedNodeIds, nodeId] }));
    const remainingSlots = state.pickSlotsRemaining - 1;
    if (remainingSlots > 0) {
      const picker = players.find((p) => p.id === playerId)!;
      const nextOptions = computeAvailablePickIds('land-capture', map, picker, players);
      if (nextOptions.length > 0) {
        return {
          ...state, players, lastCaptures,
          pickSlotsRemaining: remainingSlots,
          availablePickIds: nextOptions,
        };
      }
      // No more valid options for this player's remaining slot(s) either — move on.
    }
    return finishPickOrAdvance('land-capture', lastCaptures);
  }

  // battle: nodeId is the chosen attack target — immediately draw the 1-on-1 duel question
  // between attacker and defender (the picking player's own device commits this in one
  // transaction; nobody else is authoritative during a battle pick).
  const defender = players.find((p) => p.ownedNodeIds.includes(nodeId));
  if (!defender) return state;
  const q = pickQuestion(questions, state.usedQuestionIds);
  if (!q) return { ...state, players, targetNodeId: nodeId, defenderId: defender.id };
  return {
    ...state,
    players,
    targetNodeId: nodeId,
    defenderId: defender.id,
    phase: 'question',
    currentQuestionId: q.id,
    usedQuestionIds: [...state.usedQuestionIds, q.id],
    respondingPlayerIds: [playerId, defender.id],
    answers: {},
    timeLeft: QUESTION_SECONDS,
    timerActive: true,
    questionRevealedAt: Date.now(),
    lastBattleResult: null,
  };
}
