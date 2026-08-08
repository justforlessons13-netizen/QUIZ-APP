import { getAuth } from 'firebase/auth';
import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore, collection, onSnapshot,
  doc, setDoc, deleteDoc, updateDoc
} from 'firebase/firestore';
import { TerritoryPack } from '@/types/territory';
import { toast } from '@/hooks/use-toast';

// Firestore's setDoc/updateDoc throw synchronously (crashing the save, not just rejecting a
// promise) on any top-level field whose value is literally `undefined`. Strip them right before
// the write as a last line of defense, regardless of where they came from — mirrors
// useQuestionPacks.ts's stripUndefined, which exists because that exact mistake bit QGame's pack
// editor in production.
function stripUndefined<T extends object>(obj: T): T {
  const clean = { ...obj };
  (Object.keys(clean) as (keyof T)[]).forEach((key) => {
    if (clean[key] === undefined) delete clean[key];
  });
  return clean;
}

export function useTerritoryPacks() {
  const [packs, setPacks] = useState<TerritoryPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      collection(db, 'territoryPacks'),
      (snapshot) => {
        const loadedPacks = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as TerritoryPack[];

        setPacks(loadedPacks);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching packs:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Returns whether the write actually persisted, so callers (the pack editor) don't show a
  // false-positive "saved" state when this silently failed.
  const addPack = useCallback(async (pack: TerritoryPack): Promise<boolean> => {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast({ title: 'Access Denied', description: 'You must be logged in as Admin to create packs.', variant: 'destructive' });
      return false;
    }

    try {
      const packWithOwner: TerritoryPack = stripUndefined({
        ...pack,
        ownerId: user.uid
      });

      await setDoc(doc(db, 'territoryPacks', pack.id), packWithOwner);
      toast({ title: 'Pack saved to cloud' });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Error saving pack', variant: 'destructive' });
      return false;
    }
  }, []);

  const updatePack = useCallback(async (updated: TerritoryPack): Promise<boolean> => {
    const db = getFirestore();
    try {
      const packRef = doc(db, 'territoryPacks', updated.id);
      await updateDoc(packRef, stripUndefined({
        ...updated,
        updatedAt: new Date().toISOString()
      }));
      toast({ title: 'Pack updated' });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Error updating pack', variant: 'destructive' });
      return false;
    }
  }, []);

  const deletePack = useCallback(async (id: string) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'territoryPacks', id));
      toast({ title: 'Pack deleted' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error deleting pack', variant: 'destructive' });
    }
  }, []);

  const duplicatePack = useCallback(async (id: string) => {
    const source = packs.find(p => p.id === id);
    if (!source) return;

    const newId = crypto.randomUUID();
    const copy: TerritoryPack = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addPack(copy);
  }, [packs, addPack]);

  return { packs, loading, addPack, updatePack, deletePack, duplicatePack };
}
