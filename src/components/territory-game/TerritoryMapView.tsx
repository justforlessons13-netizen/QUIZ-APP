import { TerritoryMapDef, TerritoryPlayer } from '@/types/territory';
import { hexPoints, hash } from '@/lib/hex-map';

// CSS color strings (oklch) — used elsewhere (RoundReveal, FinalStandings) for flat 2D
// badges/text, so this export must stay CSS-compatible.
export const PLAYER_COLORS = ['oklch(70% 0.18 40)', 'oklch(65% 0.15 230)', 'oklch(65% 0.16 145)'];
// Matching hex pairs [light, dark] for the SVG gradient fills below (oklch() isn't reliably
// supported inside SVG <stop> across browsers, so gradients use hex).
const PLAYER_GRADIENTS: [string, string][] = [
  ['#e8894a', '#b0562a'], // orange
  ['#5f8fd6', '#2d5a9e'], // blue
  ['#5cad78', '#2d7a4a'], // green
];
const NEUTRAL_FILL = '#c9ab74';
const NEUTRAL_FILL_ALT = '#bfa066';

const DECOR_ICONS = ['⛰', '🌲', '🌲', '⛰'];

function ownerOf(nodeId: string, players: TerritoryPlayer[]): { player: TerritoryPlayer; index: number } | null {
  for (let i = 0; i < players.length; i++) {
    if (players[i].ownedNodeIds.includes(nodeId)) return { player: players[i], index: i };
  }
  return null;
}

interface TerritoryMapViewProps {
  map: TerritoryMapDef;
  players: TerritoryPlayer[];
  size?: number;
  lastCaptures?: Record<string, string>;
}

export function TerritoryMapView({ map, players, size = 320, lastCaptures = {} }: TerritoryMapViewProps) {
  const capturedNodeIds = new Set(Object.values(lastCaptures));

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="territory-parchment" cx="48%" cy="40%" r="78%">
          <stop offset="0%" stopColor="#f2e2b3" />
          <stop offset="55%" stopColor="#e0c98a" />
          <stop offset="100%" stopColor="#c7a765" />
        </radialGradient>
        {PLAYER_GRADIENTS.map(([light, dark], i) => (
          <linearGradient key={i} id={`territory-owner-${i}`} x1="20%" y1="10%" x2="90%" y2="100%">
            <stop offset="0%" stopColor={light} />
            <stop offset="100%" stopColor={dark} />
          </linearGradient>
        ))}
        <filter id="territory-parchment-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.8" floodColor="#4a3418" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Parchment background with a few faint age-stain blotches */}
      <rect x={-10} y={-10} width={120} height={120} fill="url(#territory-parchment)" />
      {Array.from({ length: 6 }).map((_, i) => {
        const bx = hash(i * 3.1) * 100;
        const by = hash(i * 5.7 + 2) * 100;
        return <circle key={i} cx={bx} cy={by} r={6 + hash(i) * 8} fill="#8a6d3f" opacity={0.06} />;
      })}

      <g filter="url(#territory-parchment-shadow)">
        {map.nodes.flatMap((n) => {
          const owner = ownerOf(n.id, players);
          const fill = owner ? `url(#territory-owner-${owner.index % PLAYER_GRADIENTS.length})` : undefined;
          return n.hexes.map((h, hi) => {
            const pts = hexPoints(h.cx, h.cy, map.hexRadius * 0.96);
            const neutralShade = hash(h.cx * 7.3 + h.cy * 1.7) > 0.5 ? NEUTRAL_FILL : NEUTRAL_FILL_ALT;
            return (
              <polygon
                key={`${n.id}-${hi}`}
                points={pts.map((p) => p.join(',')).join(' ')}
                fill={fill ?? neutralShade}
                stroke="rgba(74,52,24,0.35)"
                strokeWidth={0.25}
              />
            );
          });
        })}
      </g>

      {/* Decorative terrain glyphs — flavor only, sparse and low-opacity, no gameplay meaning */}
      {map.nodes.flatMap((n) => {
        if (n.isBaseSlot) return [];
        return n.hexes
          .filter((h, hi) => hash(h.cx * 2.3 + h.cy * 4.1 + hi) > 0.72)
          .map((h, hi) => (
            <text
              key={`${n.id}-decor-${hi}`}
              x={h.cx} y={h.cy + 1}
              fontSize={2.6}
              textAnchor="middle"
              opacity={0.35}
            >
              {DECOR_ICONS[Math.floor(hash(h.cx + h.cy) * DECOR_ICONS.length)]}
            </text>
          ));
      })}

      {/* Thicker divider lines between differently-owned regions */}
      {map.boundaryEdges.map((e, i) => (
        <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#4a3418" strokeWidth={0.55} opacity={0.55} strokeLinecap="round" />
      ))}

      {map.nodes.map((n) => {
        const justCaptured = capturedNodeIds.has(n.id);
        const owner = ownerOf(n.id, players);
        const accent = owner ? PLAYER_GRADIENTS[owner.index % PLAYER_GRADIENTS.length][0] : '#4a3418';
        return (
          <g key={`${n.id}-overlay`}>
            {n.isBaseSlot ? (
              <g>
                <circle cx={n.x} cy={n.y} r={3.6} fill="#3a2712" stroke="#e8b84b" strokeWidth={0.7} />
                <text x={n.x} y={n.y + 1.3} fontSize={3.8} textAnchor="middle" style={{ fontWeight: 700 }}>🏰</text>
                <text
                  x={n.x} y={n.y - 5.8} fontSize={3.2} textAnchor="middle" fill="#3a2712"
                  style={{ fontFamily: '"Bungee", sans-serif', paintOrder: 'stroke', stroke: '#f2e2b3', strokeWidth: 0.5 }}
                >
                  {n.name}
                </text>
              </g>
            ) : (
              <text
                x={n.x} y={n.y + 1.1} fontSize={3.4} textAnchor="middle" fill="#3a2712"
                style={{ fontFamily: '"Bungee", sans-serif', paintOrder: 'stroke', stroke: 'rgba(242,226,179,0.7)', strokeWidth: 0.6 }}
              >
                {n.value}
              </text>
            )}
            {justCaptured && (
              <g style={{ transformOrigin: `${n.x}px ${n.y}px` }}>
                <circle cx={n.x} cy={n.y} r={5} fill="none" stroke={accent} strokeWidth={0.8} opacity={0.9}>
                  <animate attributeName="r" values="2;9" dur="0.9s" begin="0s" fill="freeze" />
                  <animate attributeName="opacity" values="0.9;0" dur="0.9s" begin="0s" fill="freeze" />
                </circle>
                <g opacity={0}>
                  <animate attributeName="opacity" values="0;1;1" dur="0.6s" begin="0.2s" fill="freeze" />
                  <line x1={n.x} y1={n.y - 6} x2={n.x} y2={n.y - 1.2} stroke={accent} strokeWidth={0.9}>
                    <animate attributeName="y1" values={`${n.y - 12};${n.y - 6}`} dur="0.4s" begin="0s" fill="freeze" />
                  </line>
                  <polygon points={`${n.x - 1.4},${n.y - 1.8} ${n.x + 1.4},${n.y - 1.8} ${n.x},${n.y + 0.2}`} fill={accent} />
                  <line x1={n.x - 1.8} y1={n.y + 0.4} x2={n.x + 1.8} y2={n.y + 3.2} stroke="#c0392b" strokeWidth={0.6} />
                  <line x1={n.x + 1.8} y1={n.y + 0.4} x2={n.x - 1.8} y2={n.y + 3.2} stroke="#c0392b" strokeWidth={0.6} />
                </g>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
