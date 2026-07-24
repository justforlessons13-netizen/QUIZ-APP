import { GameTheme } from '@/lib/game-themes';

interface GameCubeProps {
  theme: GameTheme;
}

export function GameCube({ theme }: GameCubeProps) {
  return (
    <div className="cube-scene">
      <div className="cube">
        <div className="cube-face cube-front" style={{ background: theme.color1 }} />
        <div className="cube-face cube-back" style={{ background: theme.color1 }} />
        <div className="cube-face cube-right" style={{ background: theme.color2 }} />
        <div className="cube-face cube-left" style={{ background: theme.color2 }} />
        <div className="cube-face cube-top" style={{ background: theme.color3 }} />
        <div className="cube-face cube-bottom" style={{ background: theme.color3 }} />
      </div>
    </div>
  );
}
