import { HostGamePhase } from '@/types/live-game';
import { gameThemes } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

// Matches the source design exactly: Lobby gets a flat dark background, every other
// in-game screen gets the same radial gradient tinted with the active theme color.
const RADIAL_GRADIENT = `radial-gradient(ellipse at 50% 0%, color-mix(in oklch, ${theme.color1} 18%, oklch(10% 0.02 195)) 0%, oklch(8% 0.015 195) 60%)`;
const FLAT_DARK = 'oklch(10% 0.015 195)';

const BACKGROUND_MAP: Record<string, string> = {
  'team-setup': FLAT_DARK,
  'game-rules': RADIAL_GRADIENT,
  'round-rules': RADIAL_GRADIENT,
  'question': RADIAL_GRADIENT,
  'grading': RADIAL_GRADIENT,
  'reveal': RADIAL_GRADIENT,
  'lottery': RADIAL_GRADIENT,
  'leaderboard': RADIAL_GRADIENT,
  'final-reveal': RADIAL_GRADIENT,
  'final-standings': RADIAL_GRADIENT,
  'finished': RADIAL_GRADIENT,
};

export function GamePhaseBackground({ phase }: { phase: HostGamePhase }) {
  const background = BACKGROUND_MAP[phase] || FLAT_DARK;

  return (
    <div
      className="fixed inset-0 -z-50 transition-[background] duration-700"
      style={{ background }}
    />
  );
}
