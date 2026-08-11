import { TerritoryMapDef } from '@/types/territory';
import { makeBoundary, defineMap } from '@/lib/hex-map';
import { coudreiaDuo, coudreiaTrio } from './territory-maps-coudreia';

// Small curated set of hex-tile maps — an irregular "coastline" boundary with hand-placed seed
// points, tiled into neighboring regions by nearest-hex assignment (see lib/hex-map.ts).
// Randomly assigned per game by player count. No host-facing map editor in v1 (see the plan
// doc): a fixed boundary + seed layout keeps this reproducible with zero map-design UI.
//
// Jitter arrays and seed coordinates are deliberately asymmetric (not evenly-spaced angles or
// mirrored positions) — a symmetric layout made every map look like a soccer-ball / geodesic
// tiling instead of an organic landmass, since all the regions came out the same size.

const BASE_VALUE = 200;
const RICH_VALUE = 400;

const twinRivers = defineMap(
  'twin-rivers', 'Twin Rivers', 2,
  makeBoundary(48, 52, 43, [6, -5, 9, -3, 3, -7, 8, -2, 5, -6, 2, -4], 0.3, 1.08, 0.8),
  [
    { id: 'n1', name: 'Northgate', x: 47, y: 12, isBaseSlot: true, value: BASE_VALUE },
    { id: 'n2', name: 'Eastwatch', x: 79, y: 28, value: BASE_VALUE },
    { id: 'n3', name: 'Bayshore', x: 71, y: 66, value: RICH_VALUE },
    { id: 'n4', name: 'Southgate', x: 53, y: 87, isBaseSlot: true, value: BASE_VALUE },
    { id: 'n5', name: 'Westfall', x: 22, y: 60, value: BASE_VALUE },
    { id: 'n6', name: 'Highmoor', x: 27, y: 27, value: RICH_VALUE },
    { id: 'n7', name: 'Midlands', x: 52, y: 46, value: BASE_VALUE },
  ]
);

const borderLine = defineMap(
  'border-line', 'Border Line', 2,
  makeBoundary(51, 49, 45, [8, -3, 5, -6, 2, -4, 9, -2, 4, -7, 3, -3, 6, -5], 1.1, 0.95, 0.75),
  [
    { id: 'n1', name: 'Alpha Post', x: 12, y: 53, isBaseSlot: true, value: BASE_VALUE },
    { id: 'n2', name: 'Redridge', x: 32, y: 36, value: BASE_VALUE },
    { id: 'n3', name: 'Stonewall', x: 28, y: 66, value: RICH_VALUE },
    { id: 'n4', name: 'Midtown', x: 52, y: 52, value: RICH_VALUE },
    { id: 'n5', name: 'Ashford', x: 73, y: 34, value: BASE_VALUE },
    { id: 'n6', name: 'Greymoor', x: 68, y: 68, value: BASE_VALUE },
    { id: 'n7', name: 'Omega Post', x: 89, y: 48, isBaseSlot: true, value: BASE_VALUE },
  ]
);

const triPeaks = defineMap(
  'tri-peaks', 'Tri-Peaks', 3,
  makeBoundary(49, 51, 45, [5, -4, 8, -2, 3, -6, 9, -3, 4, -5, 2, -7, 6, -3, 3, -5], 2.0, 1.0, 0.78),
  [
    { id: 'b1', name: 'Summit Hold', x: 46, y: 11, isBaseSlot: true, value: BASE_VALUE },
    { id: 'b2', name: 'Ember Keep', x: 82, y: 71, isBaseSlot: true, value: BASE_VALUE },
    { id: 'b3', name: 'Frost Reach', x: 17, y: 77, isBaseSlot: true, value: BASE_VALUE },
    { id: 'm1', name: 'Highpass', x: 47, y: 38, value: RICH_VALUE },
    { id: 'm2', name: 'Coalridge', x: 67, y: 56, value: BASE_VALUE },
    { id: 'm3', name: 'Palewater', x: 33, y: 60, value: BASE_VALUE },
    { id: 'f12', name: 'Duskgate', x: 73, y: 30, value: BASE_VALUE },
    { id: 'f23', name: 'Sundermarch', x: 53, y: 82, value: BASE_VALUE },
    { id: 'f31', name: 'Wraithfen', x: 27, y: 34, value: BASE_VALUE },
  ]
);

const crossfire = defineMap(
  'crossfire', 'Crossfire', 3,
  makeBoundary(50, 50, 45, [-4, 6, -2, 8, -6, 3, -3, 9, -5, 2, -7, 4, -2, 5, -4, 7], 0.7, 1.05, 0.82),
  [
    { id: 'b1', name: 'Ironhold', x: 19, y: 25, isBaseSlot: true, value: BASE_VALUE },
    { id: 'b2', name: 'Stormcrest', x: 81, y: 18, isBaseSlot: true, value: BASE_VALUE },
    { id: 'b3', name: 'Shadowmere', x: 47, y: 87, isBaseSlot: true, value: BASE_VALUE },
    { id: 'n1', name: 'Copperfield', x: 52, y: 19, value: BASE_VALUE },
    { id: 'n2', name: 'Blackwater', x: 69, y: 43, value: BASE_VALUE },
    { id: 'n3', name: 'Silverpine', x: 31, y: 49, value: BASE_VALUE },
    { id: 'n4', name: 'The Hollow', x: 53, y: 55, value: RICH_VALUE },
    { id: 'n5', name: 'Emberfall', x: 65, y: 71, value: BASE_VALUE },
    { id: 'n6', name: 'Thornwood', x: 35, y: 72, value: BASE_VALUE },
  ]
);

export const TERRITORY_MAPS: TerritoryMapDef[] = [twinRivers, borderLine, triPeaks, crossfire, coudreiaDuo, coudreiaTrio];

export function pickRandomMap(playerCount: 2 | 3): TerritoryMapDef {
  const pool = TERRITORY_MAPS.filter((m) => m.forPlayerCount === playerCount);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getMapById(id: string): TerritoryMapDef | undefined {
  return TERRITORY_MAPS.find((m) => m.id === id);
}

export function neighborsOf(map: TerritoryMapDef, nodeId: string): string[] {
  return map.edges
    .filter((e) => e.a === nodeId || e.b === nodeId)
    .map((e) => (e.a === nodeId ? e.b : e.a));
}
