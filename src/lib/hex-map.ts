import { TerritoryMapDef } from '@/types/territory';

type Point = [number, number];

// Deterministic pseudo-random in [0, 1) — no Math.random, so every curated map stays
// reproducible while still looking hand-varied (decorative icon placement, etc).
export function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function pointInPolygon([x, y]: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Hand-jittered closed polygon around a center — the map's coastline, used to clip the hex
// grid down to an irregular landmass silhouette. Fixed jitter arrays (not Math.random) keep
// each curated map deterministic. Per-map rotation/stretch avoids every map reading as the
// same regular blob.
export function makeBoundary(cx: number, cy: number, baseRadius: number, jitter: number[], rotation = 0, stretchX = 1, stretchY = 0.72): Point[] {
  return jitter.map((j, i) => {
    const angle = (i / jitter.length) * Math.PI * 2 - Math.PI / 2 + rotation;
    const r = baseRadius + j;
    return [cx + Math.cos(angle) * r * stretchX, cy + Math.sin(angle) * r * stretchY] as Point;
  });
}

export interface HexRegionSeed {
  id: string;
  name: string;
  x: number;
  y: number;
  isBaseSlot?: boolean;
  value: number;
}

export interface HexTile {
  cx: number;
  cy: number;
}

export interface HexRegion extends HexRegionSeed {
  hexes: HexTile[];
}

export interface HexBoundaryEdge {
  x1: number; y1: number; x2: number; y2: number;
}

export interface HexMapResult {
  regions: HexRegion[];
  edges: { a: string; b: string }[];
  boundaryEdges: HexBoundaryEdge[];
  hexRadius: number;
}

// Builds a flat-top hex grid over the 0-100 viewBox, clips it to `boundary`, and assigns each
// retained hex to its nearest seed point — a blocky, hand-drawn-political-map partition
// instead of smooth Voronoi curves, matching a hex-tile fantasy map's look.
export function buildHexMap(seeds: HexRegionSeed[], boundary: Point[], hexRadius = 5.5): HexMapResult {
  const R = hexRadius;
  const hSpacing = 1.5 * R;
  const vSpacing = Math.sqrt(3) * R;

  const rawTiles: HexTile[] = [];
  for (let col = -3; col * hSpacing < 115; col++) {
    const cx = col * hSpacing;
    if (cx < -15) continue;
    const rowOffset = col % 2 !== 0 ? vSpacing / 2 : 0;
    for (let row = -3; row * vSpacing + rowOffset < 115; row++) {
      const cy = row * vSpacing + rowOffset;
      if (cy < -15) continue;
      rawTiles.push({ cx, cy });
    }
  }

  const tiles = rawTiles.filter((t) => pointInPolygon([t.cx, t.cy], boundary));

  const assigned = tiles.map((t) => {
    let bestIdx = 0;
    let bestDist = Infinity;
    seeds.forEach((s, i) => {
      const d = (s.x - t.cx) ** 2 + (s.y - t.cy) ** 2;
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    return { ...t, regionIndex: bestIdx };
  });

  const regions: HexRegion[] = seeds.map((s, i) => ({
    ...s,
    hexes: assigned.filter((t) => t.regionIndex === i).map((t) => ({ cx: t.cx, cy: t.cy })),
  }));

  const neighborDist = R * Math.sqrt(3);
  const edgeSet = new Set<string>();
  const edges: { a: string; b: string }[] = [];
  const boundaryEdges: HexBoundaryEdge[] = [];

  for (let i = 0; i < assigned.length; i++) {
    for (let j = i + 1; j < assigned.length; j++) {
      const dx = assigned[i].cx - assigned[j].cx;
      const dy = assigned[i].cy - assigned[j].cy;
      const dist = Math.hypot(dx, dy);
      if (dist < neighborDist * 0.85 || dist > neighborDist * 1.15) continue; // not adjacent

      if (assigned[i].regionIndex === assigned[j].regionIndex) continue;

      const a = seeds[assigned[i].regionIndex].id;
      const b = seeds[assigned[j].regionIndex].id;
      const key = [a, b].sort().join('-');
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ a, b });
      }

      // Shared edge between two adjacent flat-top hexes: its midpoint is exactly the midpoint
      // between the two centers, running perpendicular to the center-to-center line, with
      // half-length R/2 (a regular hexagon's side length equals its circumradius).
      const midx = (assigned[i].cx + assigned[j].cx) / 2;
      const midy = (assigned[i].cy + assigned[j].cy) / 2;
      const ux = dx / dist, uy = dy / dist;
      const px = -uy, py = ux;
      const half = R / 2;
      boundaryEdges.push({ x1: midx + px * half, y1: midy + py * half, x2: midx - px * half, y2: midy - py * half });
    }
  }

  return { regions, edges, boundaryEdges, hexRadius: R };
}

// Vertices of a flat-top regular hexagon centered at (cx, cy) with circumradius r.
export function hexPoints(cx: number, cy: number, r: number): Point[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as Point;
  });
}

// Builds a full TerritoryMapDef by tiling `boundary` with a hex grid around `seeds` — shared by
// both the hand-authored curated maps and any data-derived map (e.g. one imported from a real
// Azgaar export), so the two only differ in where their seeds/boundary come from.
export function defineMap(id: string, name: string, forPlayerCount: 2 | 3, boundary: Point[], seeds: HexRegionSeed[], hexRadius = 5.5): TerritoryMapDef {
  const { regions, edges, boundaryEdges } = buildHexMap(seeds, boundary, hexRadius);
  return {
    id,
    name,
    forPlayerCount,
    style: 'hex',
    hexRadius,
    boundaryEdges,
    nodes: regions.map((r) => ({ id: r.id, name: r.name, x: r.x, y: r.y, hexes: r.hexes, isBaseSlot: r.isBaseSlot, value: r.value })),
    edges,
  };
}
