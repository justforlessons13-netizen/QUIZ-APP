import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, FlagOff } from 'lucide-react';
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
import { BeeTieBreak } from '@/components/bee-game/BeeTieBreak';
import { BeeStandings } from '@/components/bee-game/BeeStandings';

const EARLY_EXIT_PHASES = ['turn-intro', 'word-cycle', 'result', 'round-leaderboard', 'tie-break'];

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
    eliminateSlowest,
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
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-radial-dark">
      {game.phase !== 'roster-entry' && (
        <header className="relative z-20 flex justify-between items-center w-full p-6 text-[#adbbff] font-bungee text-sm md:text-base tracking-wider">
          <button
            onClick={() => navigate('/bee')}
            className="flex items-center gap-3 hover:text-white transition-colors uppercase"
          >
            <ArrowLeft className="w-5 h-5" />
            Home
          </button>
          <div className="opacity-80 text-center flex-1 hidden sm:block uppercase tracking-widest">
            {pack.name}
          </div>
          <div className="w-[70px]" />
        </header>
      )}

      <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-4">
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
              onNextRound={startNextRound}
            />
          )}

          {game.phase === 'tie-break' && (
            <BeeTieBreak
              key="tie-break"
              players={game.players}
              onEliminateSlowest={eliminateSlowest}
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

      {/* ── GLOBAL HOST BOTTOM ACTIONS ── */}
      {game.phase !== 'roster-entry' && (
        <div className="fixed bottom-[24px] left-[24px] z-[60] flex items-center gap-4 pointer-events-none">
          <button
            onClick={() => navigate('/bee')}
            className="hover:scale-110 active:scale-95 transition-all opacity-60 hover:opacity-100 pointer-events-auto"
            title="Home"
          >
            <img src="/home.svg" alt="Home" className="h-[20px] w-auto pointer-events-none" />
          </button>
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
        <div className="w-10 h-10 border-[4px] border-[#adbbff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl text-muted-foreground font-sugo tracking-wider">Pack not found</p>
          <Button onClick={() => navigate('/bee')} className="bg-[#adbbff] text-[#120524] font-bungee">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return <BeeGameController pack={pack} sessionId={sessionId} ownerId={user?.uid} />;
}
