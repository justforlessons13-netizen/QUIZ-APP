import { useEffect, useState } from 'react';
import { HostGamePhase } from '@/types/live-game';

// Updated Mapping with specific names
const VIDEO_MAP: Record<string, string> = {
  // Phase 1: Lobby & Rules (Intro Video)
  'team-setup':   '/assets/bg-intro.mp4',
  'game-rules':   '/assets/bg-intro.mp4',
  
  // Phase 2: High Energy / Results (Game/Hype Video)
  'leaderboard':  '/assets/bg-game.mp4',  
  'reveal':       '/assets/bg-game.mp4',
  'final-reveal': '/assets/bg-game.mp4',
  'finished':     '/assets/bg-game.mp4',
  
  // Phase 3: Thinking / Focus (Question Video)
  'question':     '/assets/bg-question.mp4', 
  'grading':      '/assets/bg-question.mp4',
  'round-rules':  '/assets/bg-question.mp4',
  
  // Fallback
  'default':      '/assets/bg-intro.mp4', 
};

export function GamePhaseBackground({ phase }: { phase: HostGamePhase }) {
  const [source, setSource] = useState(VIDEO_MAP['team-setup']);
  
  useEffect(() => {
    // Get the video for the current phase, or fall back to default
    const newSource = VIDEO_MAP[phase] || VIDEO_MAP['default'];
    
    // Only update state if the source actually changes
    if (newSource !== source) {
      setSource(newSource);
    }
  }, [phase, source]);

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-black">
      {/* Dark overlay to ensure white text is always readable */}
      <div className="absolute inset-0 bg-black/50 z-10" />
      
      <video
        key={source} // Forces the video element to replace when source changes
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