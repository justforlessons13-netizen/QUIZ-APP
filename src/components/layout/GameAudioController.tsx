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
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

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

    // Only update the src if it actually changed to prevent resetting to 0:00!
    if (audio.src !== blobUrl) {
      audio.src = blobUrl;
    }

    audio.volume = isMuted || forceMuted ? 0 : volume;

    // Background music stays silent if it's a question phase AND (timer is off OR question has its own sound)
    const shouldActuallyPlay = phase !== 'question' || (timerActive && !hasMediaContent);

    if (shouldActuallyPlay) {
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
      audio.pause();
      setIsPlaying(false);
    }
  }, [blobUrl, isMuted, volume, timerActive, phase, hasMediaContent, forceMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => { });
      setIsPlaying(true);
      setError(null);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) audioRef.current.volume = !isMuted ? 0 : volume;
  };

  return (
    <>
      <audio ref={audioRef} loop onError={(e) => console.error("Audio tag error:", e)} />

      {/* --- AUDIO CONTROLS (NO TEXT) --- */}
      {!hideControls && (
        <footer className="fixed bottom-[44px] right-[55px] z-50 flex items-center gap-0 opacity-80 transition-opacity hover:opacity-100 font-sugo">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          disabled={isLoading || !track}
          className="flex items-center justify-center transition-all disabled:opacity-50 opacity-80 hover:opacity-100 hover:scale-110 active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="h-[20px] w-[20px] animate-spin text-white" />
          ) : error ? (
            <AlertCircle className="h-[20px] w-[20px] text-white" />
          ) : isPlaying ? (
            <img src="/pause.svg" alt="Pause" className="h-[20px] w-auto pointer-events-none" />
          ) : (
            <img src="/play.svg" alt="Play" className="h-[20px] w-auto pointer-events-none" />
          )}
        </button>

        {/* Mute/Volume Button */}
        <button
          onClick={toggleMute}
          disabled={!track}
          className="flex items-center justify-center transition-all disabled:opacity-50 opacity-80 hover:opacity-100 hover:scale-110 active:scale-95"
        >
          {isMuted ? (
            <img src="/mute.svg" alt="Muted" className="h-[20px] w-auto pointer-events-none" />
          ) : (
            <img src="/volume.svg" alt="Volume" className="h-[20px] w-auto pointer-events-none" />
          )}
        </button>
      </footer>
      )}
    </>
  );
}