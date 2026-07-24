import { gameThemes } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

const DEFAULT_COLORS = [theme.color1, theme.color2, theme.color3, 'hsl(45, 95%, 55%)', 'hsl(145, 80%, 42%)'];

interface ConfettiProps {
  colors?: string[];
}

export function Confetti({ colors = DEFAULT_COLORS }: ConfettiProps) {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
