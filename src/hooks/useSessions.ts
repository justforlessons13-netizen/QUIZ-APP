import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore, collection, onSnapshot, doc,
  setDoc, deleteDoc, query, where, getDoc
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
  // Map of sessionId -> unsubscribe function for live game listeners
  const [gameListeners] = useState<Map<string, () => void>>(new Map());

  // Subscribe to this user's sessions from Firestore
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
      const loaded = snapshot.docs.map(d => d.data() as LiveSession);
      // Sort by createdAt descending
      loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSessions(loaded);
      setLoading(false);

      // For each session, subscribe to its live game doc
      loaded.forEach(session => {
        if (!gameListeners.has(session.id)) {
          const gameRef = doc(db, 'games', session.id);
          const unsubGame = onSnapshot(gameRef, (gameSnap) => {
            if (!gameSnap.exists()) return;
            const gameData = gameSnap.data() as LiveGameState;

            setSessions(prev => prev.map(s => {
              if (s.id !== session.id) return s;
              const isFinished = gameData.phase === 'finished' || gameData.phase === 'final-standings';
              const isActive = gameData.phase !== 'team-setup' && !isFinished;
              return {
                ...s,
                teamCount: gameData.teams.length,
                currentRound: gameData.currentRound,
                status: isFinished ? 'finished' : isActive ? 'active' : 'waiting',
                teams: gameData.teams.map(t => ({
                  id: t.id,
                  name: t.name,
                  emoji: t.emoji,
                  score: t.score,
                })),
                phase: gameData.phase,
                roundNames: gameData.questions
                  ? undefined
                  : s.roundNames,
              };
            }));
          });
          gameListeners.set(session.id, unsubGame);
        }
      });
    });

    return () => {
      unsubscribe();
      gameListeners.forEach(unsub => unsub());
      gameListeners.clear();
    };
  }, [user]);

  const addSession = useCallback(async (session: GameSession) => {
    if (!user) return;
    const db = getFirestore();
    const sessionWithOwner = { ...session, ownerId: user.uid };
    try {
      await setDoc(doc(db, 'host-sessions', session.id), sessionWithOwner);
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  }, [user]);

  const deleteSession = useCallback(async (id: string) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'host-sessions', id));
      // Clean up the game listener
      const unsub = gameListeners.get(id);
      if (unsub) {
        unsub();
        gameListeners.delete(id);
      }
      toast({ title: 'Session removed' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error removing session', variant: 'destructive' });
    }
  }, [gameListeners]);

  return { sessions, loading, addSession, deleteSession };
}
