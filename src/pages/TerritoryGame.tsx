import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getFirestore, setDoc, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useTerritoryGame } from '@/hooks/useTerritoryGame';
import { TerritoryPack, TerritoryMode, TerritoryVisibility, playerCountFor } from '@/types/territory';
import { getMapById } from '@/data/territory-maps';
import { LobbySetup } from '@/components/territory-game/LobbySetup';
import { TerritoryMapView } from '@/components/territory-game/TerritoryMapView';
import { BattleQuestion } from '@/components/territory-game/BattleQuestion';
import { TerritoryAnswerReveal } from '@/components/territory-game/TerritoryAnswerReveal';
import { TerritoryPickScreen } from '@/components/territory-game/TerritoryPickScreen';
import { RoundReveal } from '@/components/territory-game/RoundReveal';
import { FinalStandings } from '@/components/territory-game/FinalStandings';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

function TerritoryGameController({
  pack, sessionId, mode, visibility,
}: {
  pack: TerritoryPack; sessionId: string; mode: TerritoryMode; visibility: TerritoryVisibility;
}) {
  const navigate = useNavigate();
  const {
    game, ranked, addPlayer, removePlayer, startGame, continueFromReveal, resetGame,
  } = useTerritoryGame(sessionId, pack.id, pack.name, pack.questions, mode, visibility, true);

  const gameCode = game.gameCode;

  // Register the join code once we have one — mirrors HostGame.tsx's game-codes registration.
  useEffect(() => {
    if (!gameCode || !sessionId) return;
    const db = getFirestore();
    setDoc(doc(db, 'territory-codes', gameCode), { sessionId, packName: pack.name }).catch((err) => {
      console.error('Failed to create territory game code lookup:', err);
    });
  }, [gameCode, sessionId, pack.name]);

  const map = getMapById(game.mapId);
  const currentQuestion = game.currentQuestionId != null
    ? pack.questions.find((q) => q.id === game.currentQuestionId) ?? null
    : null;
  const answeredCount = game.respondingPlayerIds.filter((id) => game.answers[id]).length;
  const attacker = game.attackerId ? game.players.find((p) => p.id === game.attackerId) ?? null : null;
  const defender = game.defenderId ? game.players.find((p) => p.id === game.defenderId) ?? null : null;
  const picker = game.pickOrder[game.pickIndex] ? game.players.find((p) => p.id === game.pickOrder[game.pickIndex]) : null;

  if (!map) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>Map not found for this session.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden" style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(255,140,60,0.12) 0%, oklch(10% 0.02 40) 60%)` }}>
      <header className="relative z-20 flex items-center gap-3 px-6 md:px-12 py-5">
        <button
          onClick={() => navigate('/territory')}
          title="Back"
          className="w-[34px] h-[34px] rounded-full border flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10"
          style={{ borderColor: alpha(theme.color1, 0.35), color: theme.color1 }}
        >
          ←
        </button>
        <span className="font-bungee text-base tracking-wide" style={{ color: theme.color1 }}>PLAYHUB</span>
      </header>

      {game.phase === 'lobby' || game.phase === 'final-standings' || game.phase === 'finished' ? (
        <main className="relative z-20 flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {game.phase === 'lobby' && (
              <LobbySetup
                key="lobby"
                players={game.players}
                requiredCount={playerCountFor(mode)}
                mode={mode}
                gameCode={gameCode}
                packName={pack.name}
                map={map}
                onAddPlayer={addPlayer}
                onRemovePlayer={removePlayer}
                onStart={startGame}
              />
            )}

            {(game.phase === 'final-standings' || game.phase === 'finished') && (
              <FinalStandings
                key="final"
                ranked={ranked}
                map={map}
                onPlayAgain={resetGame}
                onDashboard={() => navigate('/territory')}
              />
            )}
          </AnimatePresence>
        </main>
      ) : (
        <main className="relative z-20 flex-1 overflow-hidden">
          {/* Shared full-bleed map backdrop for every in-game phase — rendered once here instead
              of inside each phase component, so the map can fill nearly the whole screen. */}
          <div className="absolute inset-0 flex items-center justify-center p-4 md:p-10">
            <TerritoryMapView
              map={map}
              players={game.players}
              fill
              highlightedNodeIds={game.phase === 'pick' ? game.availablePickIds : undefined}
              lastCaptures={game.phase === 'reveal' ? game.lastCaptures : undefined}
              ownerHighlightPlayerId={game.phase === 'pick' ? picker?.id : undefined}
            />
          </div>

          <AnimatePresence mode="wait">
            {game.phase === 'question' && (
              <BattleQuestion
                key={`question-${game.currentQuestionId}`}
                roundKind={game.roundKind}
                question={currentQuestion}
                timeLeft={game.timeLeft}
                maxTime={20}
                players={game.players}
                answeredCount={answeredCount}
                totalActive={game.respondingPlayerIds.length}
                attacker={attacker}
                defender={defender}
              />
            )}

            {game.phase === 'answer-reveal' && game.lastAnswerBreakdown && (
              <TerritoryAnswerReveal
                key={`answer-reveal-${game.currentQuestionId}`}
                breakdown={game.lastAnswerBreakdown}
                players={game.players}
              />
            )}

            {game.phase === 'pick' && picker && (
              <TerritoryPickScreen
                key="pick"
                roundKind={game.roundKind}
                picker={picker}
                attacker={attacker}
                players={game.players}
                availablePickIds={game.availablePickIds}
              />
            )}

            {game.phase === 'reveal' && (
              <RoundReveal
                key="reveal"
                players={game.players}
                lastIncome={game.lastIncome ?? {}}
                onContinue={continueFromReveal}
              />
            )}
          </AnimatePresence>
        </main>
      )}
    </div>
  );
}

export default function TerritoryGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session') || '';
  const packId = searchParams.get('pack') || '';
  const mode = (searchParams.get('mode') as TerritoryMode) || 'duo';
  const visibility = (searchParams.get('visibility') as TerritoryVisibility) || 'public';

  const [pack, setPack] = useState<TerritoryPack | null>(null);
  const [fetchingPack, setFetchingPack] = useState(true);

  useEffect(() => {
    async function loadPack() {
      if (!packId) {
        setFetchingPack(false);
        return;
      }
      const db = getFirestore();
      try {
        const docRef = doc(db, 'territoryPacks', packId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPack(docSnap.data() as TerritoryPack);
        }
      } catch (error) {
        console.error('Error loading pack:', error);
      } finally {
        setFetchingPack(false);
      }
    }
    loadPack();
  }, [packId]);

  if (fetchingPack || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-[4px] border-[#ff8c3c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl text-muted-foreground tracking-wider">Pack not found</p>
          <Button onClick={() => navigate('/territory')} className="bg-[#ff8c3c] text-[#1a0f05] font-bungee">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return <TerritoryGameController pack={pack} sessionId={sessionId} mode={mode} visibility={visibility} />;
}
