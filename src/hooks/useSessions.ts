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
import { GameSession } from '@/types/host';
import { LiveGameState } from '@/types/live-game';
import { toast } from '@/hooks/use-toast';

export interface LiveSession extends GameSession {
  teams?: { id: string; name: string; emoji: string; score: number }[];
  phase?: string;
}

export function useSessions(user: User | null) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const gameListenersRef = useRef<Map<string, () => void>>(new Map());
  const liveDataRef = useRef<Record<string, Partial<LiveSession>>>({});

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const sessionsRef = collection(db, 'host-sessions');
    const q = query(sessionsRef, where('ownerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as LiveSession[];

      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Merge with cached live data and update state
      const merged = loaded.map((s) => ({
        ...s,
        ...liveDataRef.current[s.id],
      }));
      setSessions(merged);
      setLoading(false);

      // Attach game listeners for new sessions
      loaded.forEach((session) => {
        if (gameListenersRef.current.has(session.id)) return;

        const gameRef = doc(db, 'games', session.id);
        const unsubGame = onSnapshot(gameRef, (gameSnap) => {
          if (!gameSnap.exists()) return;
          const gameData = gameSnap.data() as LiveGameState;

          const isFinished = gameData.phase === 'finished' || gameData.phase === 'final-standings';
          const isActive = gameData.phase !== 'team-setup' && !isFinished;

          const liveUpdate: Partial<LiveSession> = {
            teamCount: gameData.teams.length,
            currentRound: gameData.currentRound,
            status: isFinished ? 'finished' : isActive ? 'active' : 'waiting',
            teams: gameData.teams.map((t) => ({
              id: t.id,
              name: t.name,
              emoji: t.emoji,
              score: t.score,
            })),
            phase: gameData.phase,
          };

          liveDataRef.current[session.id] = liveUpdate;

          setSessions((prev) => {
            const idx = prev.findIndex((s) => s.id === session.id);
            if (idx === -1) return prev;
            const existing = prev[idx];
            const next = { ...existing, ...liveUpdate };
            // Skip update if nothing changed (prevents useless re-renders)
            if (JSON.stringify(existing) === JSON.stringify(next)) return prev;
            const nextSessions = [...prev];
            nextSessions[idx] = next;
            return nextSessions;
          });
        });

        gameListenersRef.current.set(session.id, unsubGame);
      });

      // Remove listeners for sessions that disappeared
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
    async (session: GameSession) => {
      if (!user) return;
      const db = getFirestore();
      const sessionWithOwner = { ...session, ownerId: user.uid };
      try {
        await setDoc(doc(db, 'host-sessions', session.id), sessionWithOwner);
      } catch (err) {
        console.error('Failed to save session:', err);
      }
    },
    [user]
  );

  const deleteSession = useCallback(async (id: string) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'host-sessions', id));
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