import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { ArrowRight, Mic } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BeeGameState, BeePack, BeeWord } from '@/types/bee';

export default function BeeStageDevice() {
  const [searchParams] = useSearchParams();
  const initialCode = (searchParams.get('code') || '').toUpperCase();

  const [code, setCode] = useState(initialCode);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);

  const [game, setGame] = useState<BeeGameState | null>(null);
  const [pack, setPack] = useState<BeePack | null>(null);

  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const renderedWordId = useRef<string | null>(null);
  const lastKnownWordIndex = useRef<number | null>(null);

  const handleLookup = async (codeToLookup?: string) => {
    const lookupCode = (codeToLookup || code).toUpperCase();
    if (lookupCode.length < 4) return;
    setLooking(true);
    setLookupError('');
    try {
      const db = getFirestore();
      const codeDoc = await getDoc(doc(db, 'bee-game-codes', lookupCode));
      if (codeDoc.exists()) {
        setSessionId(codeDoc.data().sessionId as string);
      } else {
        setLookupError('Game not found. Check the code and try again.');
      }
    } catch (err) {
      console.error(err);
      setLookupError('Could not look up game.');
    } finally {
      setLooking(false);
    }
  };

  useEffect(() => {
    if (initialCode.length >= 4) handleLookup(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to the live game once joined
  useEffect(() => {
    if (!sessionId) return;
    const db = getFirestore();
    const unsub = onSnapshot(doc(db, 'bee-games', sessionId), (snap) => {
      if (snap.exists()) setGame(snap.data() as BeeGameState);
    });
    return () => unsub();
  }, [sessionId]);

  // Fetch the pack once we know which one this session uses
  useEffect(() => {
    if (!game?.packId || pack) return;
    const db = getFirestore();
    getDoc(doc(db, 'beePacks', game.packId)).then((snap) => {
      if (snap.exists()) setPack(snap.data() as BeePack);
    });
  }, [game?.packId, pack]);

  const currentPlayer = game?.players.find((p) => p.id === game.currentPlayerId) ?? null;
  const currentWordId = game ? game.wordOrder[game.currentWordIndex] : undefined;
  const currentWord: BeeWord | null = pack?.words.find((w) => w.id === currentWordId) ?? null;

  // Reset the input + hint + tracked word whenever a new word cycle begins
  useEffect(() => {
    if (game?.phase === 'word-cycle' && game.currentWordIndex !== lastKnownWordIndex.current) {
      lastKnownWordIndex.current = game.currentWordIndex;
      renderedWordId.current = currentWordId ?? null;
      setAnswer('');
    }
    if (game?.phase !== 'word-cycle') {
      lastKnownWordIndex.current = null;
    }
  }, [game?.phase, game?.currentWordIndex, currentWordId]);

  const handleSubmit = async () => {
    if (!sessionId || !answer.trim() || submitting) return;
    setSubmitting(true);
    const typedAnswer = answer.trim();
    const submittedWordId = renderedWordId.current;

    try {
      const db = getFirestore();
      const gameRef = doc(db, 'bee-games', sessionId);
      const packRef = pack ? doc(db, 'beePacks', pack.id) : null;

      await runTransaction(db, async (transaction) => {
        const gameSnap = await transaction.get(gameRef);
        if (!gameSnap.exists()) throw new Error('Game not found');
        const data = gameSnap.data() as BeeGameState;

        const liveWordId = data.wordOrder[data.currentWordIndex];
        if (data.phase !== 'word-cycle' || liveWordId !== submittedWordId) {
          throw new Error('STALE_WORD');
        }
        if (!data.currentPlayerId) throw new Error('No active speller');

        let wordText = currentWord?.word ?? '';
        if (packRef) {
          const packSnap = await transaction.get(packRef);
          if (packSnap.exists()) {
            const freshPack = packSnap.data() as BeePack;
            wordText = freshPack.words.find((w) => w.id === liveWordId)?.word ?? wordText;
          }
        }

        const elapsedMs = data.wordRevealedAt ? Date.now() - data.wordRevealedAt : null;
        const correct = typedAnswer.trim().toLowerCase() === wordText.trim().toLowerCase();

        const players = data.players.map((p) => {
          if (p.id !== data.currentPlayerId) return p;
          return {
            ...p,
            wordsAttempted: p.wordsAttempted + 1,
            wordsCorrect: correct ? p.wordsCorrect + 1 : p.wordsCorrect,
            status: correct ? p.status : ('eliminated' as const),
            eliminatedAtRound: correct ? p.eliminatedAtRound : data.currentRound,
            eliminatedOnWordId: correct ? p.eliminatedOnWordId : liveWordId,
            totalTimeMs: p.totalTimeMs + (elapsedMs ?? 0),
          };
        });

        transaction.update(gameRef, {
          players,
          lastResult: { playerId: data.currentPlayerId, wordId: liveWordId, correct, elapsedMs },
          phase: 'result',
        });
      });

      setAnswer('');
    } catch (err: any) {
      if (err?.message === 'STALE_WORD') {
        toast({
          title: 'Word changed',
          description: 'The host swapped the word — check the screen and try again.',
          variant: 'destructive',
        });
        setAnswer('');
      } else {
        console.error('Submit failed:', err);
        toast({ title: 'Could not submit', description: 'Please try again.', variant: 'destructive' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Not yet joined: code entry ──
  if (!sessionId) {
    const digits = code.padEnd(4, ' ').slice(0, 4).split('');
    return (
      <div className="min-h-screen bg-radial-dark flex flex-col items-center justify-center p-4 gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bungee text-white uppercase tracking-wide">Stage Device</h1>
          <p className="text-muted-foreground text-sm mt-1 font-sugo uppercase tracking-widest">
            Enter the code shown on the host's screen
          </p>
        </div>
        <div className="flex gap-2.5">
          {digits.map((char, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              value={char.trim()}
              maxLength={1}
              onChange={(e) => {
                const v = e.target.value.toUpperCase().slice(-1);
                const next = code.split('');
                next[i] = v;
                const joined = next.join('').slice(0, 4);
                setCode(joined);
                if (v && i < 3) inputRefs.current[i + 1]?.focus();
                if (joined.length === 4 && next.every((c) => c)) handleLookup(joined);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !code[i] && i > 0) inputRefs.current[i - 1]?.focus();
              }}
              className="bg-card/40 border-2 border-primary/40 rounded-xl flex items-center justify-center font-black text-primary font-mono w-[52px] h-[60px] text-[28px] text-center focus:outline-none focus:border-primary"
            />
          ))}
        </div>
        {looking && <p className="text-xs text-muted-foreground">Looking up game…</p>}
        {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}
      </div>
    );
  }

  // ── Joined, waiting for game to load ──
  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-[4px] border-[#adbbff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const definitionRevealed = game.hintsUsedThisTurn.includes('definition');

  return (
    <div className="min-h-screen bg-radial-dark flex flex-col items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {game.phase !== 'word-cycle' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Mic className="w-6 h-6 text-primary" />
            </div>
            <p className="text-muted-foreground text-xs uppercase tracking-[3px] font-sugo">
              {game.phase === 'champion' || game.phase === 'finished' ? 'Bee complete' : 'Waiting'}
            </p>
            {currentPlayer && game.phase !== 'champion' && game.phase !== 'finished' && (
              <h1 className="text-2xl font-bungee text-white uppercase tracking-wide">
                Up next: {currentPlayer.name}
              </h1>
            )}
          </motion.div>
        )}

        {game.phase === 'word-cycle' && currentPlayer && currentWord && (
          <motion.div
            key={`word-${currentWord.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md flex flex-col items-center gap-5"
          >
            <div className="text-center">
              <p className="text-muted-foreground text-xs uppercase tracking-[3px] font-sugo">Your turn</p>
              <h2 className="text-xl font-bungee text-primary uppercase tracking-wide">{currentPlayer.name}</h2>
            </div>

            <div className="w-full p-5 rounded-2xl border border-border bg-card text-center space-y-2 min-h-[88px] flex flex-col justify-center">
              {definitionRevealed ? (
                <>
                  {currentWord.partOfSpeech && (
                    <p className="text-xs italic text-muted-foreground">{currentWord.partOfSpeech}</p>
                  )}
                  <p className="text-base text-foreground">{currentWord.definition}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground/50 uppercase tracking-widest font-sugo">
                  Ask the host to reveal a hint
                </p>
              )}
            </div>

            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && answer.trim() && !submitting && handleSubmit()}
              placeholder="Type the spelling…"
              autoFocus
              disabled={submitting}
              className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl py-4 px-5 text-lg text-center text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors font-sugo tracking-wider"
            />

            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || submitting}
              className="relative w-full bg-transparent border-2 border-primary rounded-xl py-3 px-6 text-primary text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 hover:bg-primary/10 transition-colors disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit'}
              {!submitting && <ArrowRight className="w-5 h-5" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
