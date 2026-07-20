import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { BeeSession, BeeGameState, BeePlayer } from '@/types/bee';
import { toast } from '@/hooks/use-toast';

export interface LiveBeeSession extends BeeSession {
  players?: Pick<BeePlayer, 'id' | 'name' | 'status' | 'wordsCorrect' | 'eliminatedAtRound'>[];
  phase?: string;
}

export function useBeeSessions(user: User | null) {
  const [sessions, setSessions] = useState<LiveBeeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const gameListenersRef = useRef<Map<string, () => void>>(new Map());
  const liveDataRef = useRef<Record<string, Partial<LiveBeeSession>>>({});

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const sessionsRef = collection(db, 'bee-sessions');
    const q = query(sessionsRef, where('ownerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as LiveBeeSession[];

      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const merged = loaded.map((s) => ({
        ...s,
        ...liveDataRef.current[s.id],
      }));
      setSessions(merged);
      setLoading(false);

      loaded.forEach((session) => {
        if (gameListenersRef.current.has(session.id)) return;

        const gameRef = doc(db, 'bee-games', session.id);
        const unsubGame = onSnapshot(gameRef, (gameSnap) => {
          if (!gameSnap.exists()) return;
          const gameData = gameSnap.data() as BeeGameState;

          const isFinished = gameData.phase === 'finished' || gameData.phase === 'champion';
          const isActive = gameData.phase !== 'roster-entry' && !isFinished;

          const liveUpdate: Partial<LiveBeeSession> = {
            playerCount: gameData.players.length,
            currentRound: gameData.currentRound,
            status: isFinished ? 'finished' : isActive ? 'active' : 'waiting',
            players: gameData.players.map((p) => ({
              id: p.id,
              name: p.name,
              status: p.status,
              wordsCorrect: p.wordsCorrect,
              eliminatedAtRound: p.eliminatedAtRound,
            })),
            phase: gameData.phase,
          };

          liveDataRef.current[session.id] = liveUpdate;

          setSessions((prev) => {
            const idx = prev.findIndex((s) => s.id === session.id);
            if (idx === -1) return prev;
            const existing = prev[idx];
            const next = { ...existing, ...liveUpdate };
            if (JSON.stringify(existing) === JSON.stringify(next)) return prev;
            const nextSessions = [...prev];
            nextSessions[idx] = next;
            return nextSessions;
          });
        });

        gameListenersRef.current.set(session.id, unsubGame);
      });

      const currentIds = new Set(loaded.map((s) => s.id));
      gameListenersRef.current.forEach((unsub, id) => {
        if (!currentIds.has(id)) {
          unsub();
          gameListenersRef.current.delete(id);
          delete liveDataRef.current[id];
        }
      });
    });

    return () => {
      unsubscribe();
      gameListenersRef.current.forEach((unsub) => unsub());
      gameListenersRef.current.clear();
      liveDataRef.current = {};
    };
  }, [user]);

  const addSession = useCallback(
    async (session: BeeSession) => {
      if (!user) return;
      const db = getFirestore();
      const sessionWithOwner = { ...session, ownerId: user.uid };
      try {
        await setDoc(doc(db, 'bee-sessions', session.id), sessionWithOwner);
      } catch (err) {
        console.error('Failed to save bee session:', err);
      }
    },
    [user]
  );

  const deleteSession = useCallback(async (id: string) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'bee-sessions', id));
      const unsub = gameListenersRef.current.get(id);
      if (unsub) {
        unsub();
        gameListenersRef.current.delete(id);
      }
      delete liveDataRef.current[id];
      toast({ title: 'Session removed' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error removing session', variant: 'destructive' });
    }
  }, []);

  return { sessions, loading, addSession, deleteSession };
}
