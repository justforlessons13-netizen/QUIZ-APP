import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FlagOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { useBeeGame } from '@/hooks/useBeeGame';
import { BeePack } from '@/types/bee';
import { unlockWebAudio } from '@/lib/sounds';
import { BeeRosterEntry } from '@/components/bee-game/BeeRosterEntry';
import { BeeStagePairing } from '@/components/bee-game/BeeStagePairing';
import { BeeTurnIntro } from '@/components/bee-game/BeeTurnIntro';
import { BeeWordCycle } from '@/components/bee-game/BeeWordCycle';
import { BeeResultScreen } from '@/components/bee-game/BeeResultScreen';
import { BeeLeaderboard } from '@/components/bee-game/BeeLeaderboard';
import { BeeStandings } from '@/components/bee-game/BeeStandings';

const EARLY_EXIT_PHASES = ['turn-intro', 'word-cycle', 'result', 'round-leaderboard'];

function BeeGameController({ pack, sessionId, ownerId }: { pack: BeePack; sessionId: string; ownerId?: string }) {
  const navigate = useNavigate();

  const {
    game,
    startSession,
    beginFirstRound,
    revealWord,
    requestHint,
    submitResult,
    overrideResult,
    skipPlayer,
    substituteWord,
    callNextPlayer,
    startNextRound,
    endGameEarly,
    resetGame,
  } = useBeeGame(sessionId, pack.id, pack.name, pack.words, ownerId);

  // Register the stage-device join code once we have one
  const codeWritten = useRef<string | null>(null);
  useEffect(() => {
    if (!game.gameCode || codeWritten.current === game.gameCode) return;
    codeWritten.current = game.gameCode;
    const db = getFirestore();
    setDoc(doc(db, 'bee-game-codes', game.gameCode), {
      sessionId,
      packName: pack.name,
    }).catch((err) => console.error('Failed to create stage device code:', err));
  }, [game.gameCode, sessionId, pack.name]);

  // Unlock Web Audio Context on first interaction so SFX can play
  useEffect(() => {
    const unlock = () => { unlockWebAudio(); };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const currentPlayer = game.players.find(p => p.id === game.currentPlayerId) ?? null;
  const currentWordId = game.wordOrder[game.currentWordIndex];
  const currentWord = pack.words.find(w => w.id === currentWordId) ?? null;

  const lastResultPlayer = game.lastResult
    ? game.players.find(p => p.id === game.lastResult!.playerId) ?? null
    : null;
  const lastResultWord = game.lastResult
    ? pack.words.find(w => w.id === game.lastResult!.wordId) ?? null
    : null;

  return (
    <div className="bee-theme min-h-screen relative flex flex-col overflow-hidden bg-radial-bee">
      {/* ── Background: hex drift + vignette + ambient glow ── */}
      <style>{`
        @keyframes bgDrift { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-12px,-8px)} }
        @keyframes glowPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
      `}</style>

      {/* Hex polygon layer */}
      <svg
        viewBox="0 0 900 700" xmlns="http://www.w3.org/2000/svg"
        className="fixed pointer-events-none"
        style={{ top: -80, left: -80, width: 900, height: 700, opacity: 0.35, zIndex: 0,
                 animation: 'bgDrift 50s linear infinite' }}
      >
        <g fill="none" stroke="#3a2e1a" strokeWidth="1.8">
          <polygon points="100,30 180,65 180,135 100,170 20,135 20,65"/>
          <polygon points="300,30 380,65 380,135 300,170 220,135 220,65"/>
          <polygon points="500,30 580,65 580,135 500,170 420,135 420,65"/>
          <polygon points="700,30 780,65 780,135 700,170 620,135 620,65"/>
          <polygon points="200,170 280,205 280,275 200,310 120,275 120,205"/>
          <polygon points="400,170 480,205 480,275 400,310 320,275 320,205"/>
          <polygon points="600,170 680,205 680,275 600,310 520,275 520,205"/>
          <polygon points="800,170 880,205 880,275 800,310 720,275 720,205"/>
          <polygon points="100,310 180,345 180,415 100,450 20,415 20,345"/>
          <polygon points="300,310 380,345 380,415 300,450 220,415 220,345"/>
          <polygon points="500,310 580,345 580,415 500,450 420,415 420,345"/>
          <polygon points="700,310 780,345 780,415 700,450 620,415 620,345"/>
          <polygon points="200,450 280,485 280,555 200,590 120,555 120,485"/>
          <polygon points="400,450 480,485 480,555 400,590 320,555 320,485"/>
          <polygon points="600,450 680,485 680,555 600,590 520,555 520,485"/>
        </g>
      </svg>

      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 0%, #0f0b08 70%)', zIndex: 1 }}
      />

      {/* Ambient gold glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '42%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 350,
          background: 'radial-gradient(ellipse, oklch(80% 0.16 92 / 0.08) 0%, transparent 70%)',
          zIndex: 1,
          animation: 'glowPulse 5s ease-in-out infinite',
        }}
      />
      <div className="relative z-20 w-full max-w-[800px] mx-auto flex-1 flex flex-col" style={{ padding: '24px 20px' }}>
      {game.phase !== 'roster-entry' && (
        <header className="relative flex items-center justify-between font-bungee" style={{ marginBottom: 80 }}>
          <button
            onClick={() => navigate('/bee')}
            className="flex items-center hover:opacity-80 transition-opacity uppercase"
            style={{ gap: 6, color: 'oklch(80% 0.16 92)', fontSize: 13, letterSpacing: '0.12em' }}
          >
            ← Home
          </button>
          <div
            className="absolute left-1/2 -translate-x-1/2 uppercase whitespace-nowrap"
            style={{ color: 'oklch(80% 0.16 92)', fontSize: 13, letterSpacing: '0.15em' }}
          >
            {pack.name}
          </div>
        </header>
      )}

      <main className="relative flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {game.phase === 'roster-entry' && (
            <BeeRosterEntry key="roster-entry" rules={pack.rules} onStart={startSession} />
          )}

          {game.phase === 'stage-pairing' && (
            <BeeStagePairing key="stage-pairing" gameCode={game.gameCode} onContinue={beginFirstRound} />
          )}

          {game.phase === 'turn-intro' && currentPlayer && (
            <BeeTurnIntro
              key={`turn-intro-${currentPlayer.id}-${game.currentWordIndex}`}
              player={currentPlayer}
              round={game.currentRound}
              wordNumber={game.currentWordIndex + 1}
              totalWords={pack.words.length}
              onReveal={revealWord}
            />
          )}

          {game.phase === 'word-cycle' && currentPlayer && currentWord && (
            <BeeWordCycle
              key={`word-cycle-${currentPlayer.id}-${currentWord.id}`}
              word={currentWord}
              player={currentPlayer}
              hintsUsed={game.hintsUsedThisTurn}
              onRequestHint={requestHint}
              onCorrect={() => submitResult(true)}
              onIncorrect={() => submitResult(false)}
              onSkip={skipPlayer}
              onSubstituteWord={substituteWord}
            />
          )}

          {game.phase === 'result' && lastResultPlayer && lastResultWord && (
            <BeeResultScreen
              key={`result-${lastResultPlayer.id}-${lastResultWord.id}`}
              player={lastResultPlayer}
              word={lastResultWord}
              correct={game.lastResult?.correct ?? null}
              elapsedMs={game.lastResult?.elapsedMs ?? null}
              onNext={callNextPlayer}
              onOverride={overrideResult}
            />
          )}

          {game.phase === 'round-leaderboard' && (
            <BeeLeaderboard
              key={`leaderboard-${game.currentRound}`}
              players={game.players}
              round={game.currentRound}
              previousRankMap={game.previousRankMap}
              onNextRound={startNextRound}
            />
          )}

          {game.phase === 'champion' && (
            <BeeStandings
              key="champion"
              players={game.players}
              onPlayAgain={resetGame}
              onDashboard={() => navigate('/bee')}
            />
          )}

          {game.phase === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6 px-4"
            >
              <h1 className="font-bold text-gold text-glow-gold text-4xl">Bee Complete!</h1>
              <p className="text-muted-foreground text-lg">
                {pack.name} — {game.players.length} spellers
              </p>
              <div className="flex gap-3 w-full max-w-xs">
                <Button onClick={resetGame} className="flex-1 py-3 h-auto font-bold rounded-xl">
                  Play Again
                </Button>
                <Button variant="secondary" onClick={() => navigate('/bee')} className="flex-1 py-3 h-auto font-bold rounded-xl">
                  Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>

      {/* ── GLOBAL HOST BOTTOM ACTIONS ── */}
      {game.phase !== 'roster-entry' && (
        <div className="fixed bottom-[24px] left-[24px] z-[60] flex items-center gap-4 pointer-events-none">
          {EARLY_EXIT_PHASES.includes(game.phase) &&
            game.players.filter(p => p.status === 'active').length > 2 && (
              <button
                onClick={endGameEarly}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
                title="End the bee now and declare the current leader champion"
              >
                <FlagOff className="w-3.5 h-3.5" />
                End Early
              </button>
            )}
        </div>
      )}
    </div>
  );
}

export default function BeeGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session') || '';
  const packId = searchParams.get('pack') || '';

  const [pack, setPack] = useState<BeePack | null>(null);
  const [fetchingPack, setFetchingPack] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadPack() {
      if (!packId) {
        setFetchingPack(false);
        return;
      }
      const db = getFirestore();
      try {
        const docRef = doc(db, 'beePacks', packId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPack(docSnap.data() as BeePack);
        }
      } catch (error) {
        console.error('Error loading bee pack:', error);
      } finally {
        setFetchingPack(false);
      }
    }
    loadPack();
  }, [packId]);

  if (fetchingPack || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-[4px] border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl text-muted-foreground font-sugo tracking-wider">Pack not found</p>
          <Button onClick={() => navigate('/bee')} className="bg-primary text-primary-foreground font-bungee">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return <BeeGameController pack={pack} sessionId={sessionId} ownerId={user?.uid} />;
}
