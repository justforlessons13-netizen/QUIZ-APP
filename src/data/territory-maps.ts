import { TerritoryMapDef } from '@/types/territory';
import { coudreiaDuo, coudreiaTrio } from './territory-maps-coudreia';

// Coudreia (a real player-generated Azgaar map, rendered as true state-border polygons — see
// territory-maps-coudreia.ts) is currently the only map in rotation. `defineMap`/`makeBoundary`
// in lib/hex-map.ts remain available for hand-authored hex-tile maps if more get added later.
export const TERRITORY_MAPS: TerritoryMapDef[] = [coudreiaDuo, coudreiaTrio];

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
