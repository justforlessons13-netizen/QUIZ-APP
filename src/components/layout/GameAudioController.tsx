import { useEffect, useRef, useState } from 'react';
import { HostGamePhase } from '@/types/live-game';
import { Volume2, VolumeX, Play, Pause, AlertCircle, Loader2 } from 'lucide-react';

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
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  // Detect the exact moment timerActive flips ON so we can restart music from 0
  const prevTimerActive = useRef(false);

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
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

    audio.volume = isMuted || forceMuted ? 0 : localVolume;

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
  }, [blobUrl, isMuted, localVolume, timerActive, phase, hasMediaContent, forceMuted]);

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

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) audioRef.current.volume = !isMuted ? 0 : localVolume;
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
        <footer className="fixed bottom-[24px] right-[24px] z-50 flex items-center gap-2.5">
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
              <img src="/pause.svg" alt="Pause" className="h-[18px] w-auto pointer-events-none" />
            ) : (
              <img src="/play.svg" alt="Play" className="h-[18px] w-auto pointer-events-none" />
            )}
          </button>

          {/* Mute/Volume Button with Slider */}
          <div style={{ position: 'relative' }} className="flex items-center justify-center">
            {showVolumeSlider && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  right: 0,
                  width: '44px',
                  height: '180px',
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--primary))',
                  borderRadius: '12px',
                  padding: '10px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  zIndex: 50,
                  overflow: 'hidden'
                }}
              >
                <style>{`
                  .vol-track {
                    writing-mode: vertical-lr;
                    direction: rtl;
                    -webkit-appearance: none;
                    appearance: none;
                    width: 4px;
                    flex: 1;
                    background: rgba(173,187,255,0.15);
                    border-radius: 4px;
                    cursor: pointer;
                    outline: none;
                  }
                  .vol-track::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: hsl(var(--primary));
                    cursor: grab;
                    margin-left: -7px;
                  }
                  .vol-track::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: hsl(var(--primary));
                    border: none;
                    cursor: grab;
                  }
                `}</style>
                <div className="text-primary font-bungee text-[10px] tracking-widest">
                  {Math.round(localVolume * 100)}%
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={localVolume}
                  onChange={(e) => {
                    setLocalVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="vol-track"
                />
              </div>
            )}
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              disabled={!track}
              title="Volume"
              className="w-10 h-10 rounded-[11px] bg-white/[0.07] border border-white/[0.12] flex items-center justify-center hover:scale-110 hover:bg-white/[0.12] active:scale-95 transition-all disabled:opacity-30"
            >
              {isMuted || localVolume === 0 ? (
                <img src="/mute.svg" alt="Muted" className="h-[18px] w-auto pointer-events-none" />
              ) : (
                <img src="/volume.svg" alt="Volume" className="h-[18px] w-auto pointer-events-none" />
              )}
            </button>
          </div>
        </footer>
      )}
    </>
  );
}