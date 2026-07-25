import { useEffect, useRef, useState } from 'react';
import { HostGamePhase } from '@/types/live-game';
import { Play, Pause, AlertCircle, Loader2 } from 'lucide-react';

const VOLUME_STEPS = [0, 25, 50, 75, 100];

const MUSIC_MAP: Record<string, string> = {
  'team-setup': '/assets/music-setup.mp3',
  'grading': '/assets/music-setup.mp3',
  'game-rules': '/assets/music-lobby.mp3',
  'leaderboard': '/assets/music-lobby.mp3',
  'finished': '/assets/music-champion.mp3',
  'final-reveal': '/assets/music-lobby.mp3',
  'question': '/assets/music-question.mp3',
  'round-rules': '/assets/music-reveal.mp3',
  'reveal': '',
  'round-scores-adjustment': '/assets/music-setup.mp3',
};

export function GameAudioController({
  phase,
  timerActive = false,
  hasMediaContent = false,
  volume = 0.3,
  forceMuted = false,
  hideControls = false
}: {
  phase: HostGamePhase,
  timerActive?: boolean,
  hasMediaContent?: boolean,
  volume?: number,
  forceMuted?: boolean,
  hideControls?: boolean
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState('');
  
  const [isPlaying, setIsPlaying] = useState(() => {
    return localStorage.getItem('quiz_audio_playing') === 'true';
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  // Detect the exact moment timerActive flips ON so we can restart music from 0
  const prevTimerActive = useRef(false);

  const [localVolume, setLocalVolume] = useState(() => {
    const saved = localStorage.getItem('quiz_audio_volume');
    return saved ? parseFloat(saved) : volume;
  });

  useEffect(() => {
    localStorage.setItem('quiz_audio_volume', localVolume.toString());
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'quiz_audio_volume' && e.newValue) {
        setLocalVolume(parseFloat(e.newValue));
      }
      if (e.key === 'quiz_audio_playing' && e.newValue) {
        const shouldPlay = e.newValue === 'true';
        if (shouldPlay && !isPlaying && audioRef.current) {
          audioRef.current.play().then(() => {
             setIsPlaying(true);
             setError(null);
          }).catch((err) => {
             setIsPlaying(false);
             if (err.name === 'NotAllowedError') setError("Click Play");
          });
        } else if (!shouldPlay && isPlaying && audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [localVolume, isPlaying]);

  useEffect(() => {
    const newTrack = MUSIC_MAP[phase] || '';
    if (newTrack !== track) {
      setTrack(newTrack);
      setError(null);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
    }
  }, [phase]);

  useEffect(() => {
    if (!track) {
      setIsPlaying(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(track)
      .then(async (response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.blob();
      })
      .then((blob) => {
        if (!isMounted) return;
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Fetch Error:", err);
        setError("Failed to load audio");
        setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [track]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // If there's no blobUrl (e.g. track is ''), pause and clear src.
    if (!blobUrl) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    // Update src if it changed (different phase/track)
    if (audio.src !== blobUrl) {
      audio.src = blobUrl;
      audio.currentTime = 0;
    }

    audio.volume = forceMuted ? 0 : localVolume;

    const timerJustStarted = timerActive && !prevTimerActive.current;
    prevTimerActive.current = timerActive;

    // Background music stays silent if it's a question phase AND (timer is off OR question has its own sound)
    const shouldActuallyPlay = phase !== 'question' || (timerActive && !hasMediaContent);

    if (shouldActuallyPlay) {
      // If the timer just turned ON for a question, restart music from the beginning
      if (phase === 'question' && timerJustStarted) {
        audio.currentTime = 0;
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setError(null);
          })
          .catch((err) => {
            setIsPlaying(false);
            if (err.name === 'NotAllowedError') {
              setError("Click Play");
            } else {
              console.error(err);
            }
          });
      }
    } else {
      // Timer stopped or question has media — pause and reset position
      // so next question starts fresh
      audio.pause();
      if (phase === 'question') {
        audio.currentTime = 0;
      }
      setIsPlaying(false);
    }
  }, [blobUrl, localVolume, timerActive, phase, hasMediaContent, forceMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem('quiz_audio_playing', 'false');
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setError(null);
        localStorage.setItem('quiz_audio_playing', 'true');
      }).catch(() => { });
    }
  };

  const cycleVolume = () => {
    const currentPercent = Math.round(localVolume * 100);
    const currentIndex = VOLUME_STEPS.reduce((closest, step, i) =>
      Math.abs(step - currentPercent) < Math.abs(VOLUME_STEPS[closest] - currentPercent) ? i : closest, 0);
    const next = VOLUME_STEPS[(currentIndex + 1) % VOLUME_STEPS.length];
    setLocalVolume(next / 100);
  };

  return (
    <>
      <audio ref={audioRef} loop onError={(e) => console.error("Audio tag error:", e)} />

      {/* Auto-play Unlock Overlay for Projector */}
      {hideControls && error === "Click Play" && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.play().then(() => {
                setIsPlaying(true);
                setError(null);
                localStorage.setItem('quiz_audio_playing', 'true');
              }).catch(console.error);
            }
          }}
        >
          <div className="bg-card/90 px-8 py-6 rounded-2xl border-2 border-primary shadow-[0_0_30px_rgba(173,187,255,0.3)] text-center animate-pulse">
            <h2 className="text-primary font-bungee text-2xl mb-2">AUDIO BLOCKED</h2>
            <p className="text-white font-sugo tracking-wider">Click anywhere to enable Projector audio</p>
          </div>
        </div>
      )}

      {/* --- AUDIO CONTROLS (NO TEXT) --- */}
      {!hideControls && (
        <footer className="fixed bottom-[20px] right-[32px] z-50 flex items-center gap-2.5">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            disabled={isLoading || !track}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 rounded-[11px] bg-white/[0.07] border border-white/[0.12] flex items-center justify-center hover:scale-110 hover:bg-white/[0.12] active:scale-95 transition-all disabled:opacity-30"
          >
            {isLoading ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin text-white" />
            ) : error ? (
              <AlertCircle className="h-[18px] w-[18px] text-white" />
            ) : isPlaying ? (
              <Pause className="h-[15px] w-[15px] text-white/90" fill="currentColor" />
            ) : (
              <Play className="h-[15px] w-[15px] text-white/90" fill="currentColor" />
            )}
          </button>

          {/* Volume Button — click to cycle 0/25/50/75/100 */}
          <button
            onClick={cycleVolume}
            disabled={!track}
            title="Volume"
            className="w-10 h-10 rounded-[11px] bg-white/[0.07] border border-white/[0.12] flex flex-col items-center justify-center gap-0.5 hover:scale-110 hover:bg-white/[0.12] active:scale-95 transition-all disabled:opacity-30 text-white/90"
          >
            {Math.round(localVolume * 100) === 0 ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4z"></path>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4z"></path>
                <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
              </svg>
            )}
            <span className="text-[8px] font-bold leading-none text-white/90">
              {Math.round(localVolume * 100) === 0 ? 'MUTE' : `${Math.round(localVolume * 100)}%`}
            </span>
          </button>
        </footer>
      )}
    </>
  );
}