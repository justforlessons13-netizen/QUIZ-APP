import { useEffect, useState } from 'react';
import { HostGamePhase } from '@/types/live-game';

// Map phases to video files
const VIDEO_MAP: Record<string, string> = {
  'team-setup': '/assets/bg-intro.mp4',
  'game-rules': '/assets/bg-intro.mp4',
  'finished':   '/assets/bg-intro.mp4',
  'default':    '/assets/bg-game.mp4', // Questions, Grading, Leaderboard
};

export function DynamicBackground({ phase }: { phase: HostGamePhase }) {
  const [source, setSource] = useState(VIDEO_MAP['team-setup']);
  
  useEffect(() => {
    const newSource = VIDEO_MAP[phase] || VIDEO_MAP['default'];
    if (newSource !== source) {
      setSource(newSource);
    }
  }, [phase, source]);

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-black">
      {/* Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/60 z-10" />
      
      <video
        key={source} // Key forces re-render when source changes
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-1000"
      >
        <source src={source} type="video/mp4" />
      </video>
    </div>
  );
}