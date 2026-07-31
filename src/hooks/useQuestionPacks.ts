import { getAuth } from 'firebase/auth';
import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore, collection, onSnapshot,
  doc, setDoc, deleteDoc, updateDoc
} from 'firebase/firestore';
import { QuestionPack } from '@/types/host';
import { toast } from '@/hooks/use-toast';

// Firestore's setDoc/updateDoc throw synchronously (crashing the save, not just rejecting a
// promise) on any top-level field whose value is literally `undefined` — a mistake that's bitten
// this pack repeatedly as optional Record<number,...> fields get spread around. Strip them right
// before the write as a last line of defense, regardless of where they came from.
function stripUndefined<T extends object>(obj: T): T {
  const clean = { ...obj };
  (Object.keys(clean) as (keyof T)[]).forEach((key) => {
    if (clean[key] === undefined) delete clean[key];
  });
  return clean;
}

export function useQuestionPacks() {
  const [packs, setPacks] = useState<QuestionPack[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Subscribe to Firestore updates (Real-time)
  useEffect(() => {
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      collection(db, 'questionPacks'),
      (snapshot) => {
        const loadedPacks = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id // Ensure the ID matches the document ID
        })) as QuestionPack[];

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

  // 2. Add Pack (Save to Firestore) — returns whether it actually persisted, so callers
  // (the pack editor) don't show a false-positive "saved" state when this silently failed.
  const addPack = useCallback(async (pack: QuestionPack): Promise<boolean> => {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast({ title: 'Access Denied', description: 'You must be logged in as Admin to create packs.', variant: 'destructive' });
      return false;
    }

    try {
      // Stamp the pack with your Admin ID before saving
      const packWithOwner: QuestionPack = stripUndefined({
        ...pack,
        ownerId: user.uid
      });

      await setDoc(doc(db, 'questionPacks', pack.id), packWithOwner);
      toast({ title: 'Pack saved to cloud' });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Error saving pack', variant: 'destructive' });
      return false;
    }
  }, []);

  // 3. Update Pack
  const updatePack = useCallback(async (updated: QuestionPack): Promise<boolean> => {
    const db = getFirestore();
    try {
      const packRef = doc(db, 'questionPacks', updated.id);
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

  // 4. Delete Pack
  const deletePack = useCallback(async (id: string) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'questionPacks', id));
      toast({ title: 'Pack deleted' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error deleting pack', variant: 'destructive' });
    }
  }, []);

  // 5. Duplicate Pack
  const duplicatePack = useCallback(async (id: string) => {
    const source = packs.find(p => p.id === id);
    if (!source) return;

    const newId = crypto.randomUUID();
    const copy: QuestionPack = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Calls the addPack function defined above
    await addPack(copy);
  }, [packs, addPack]);

  return { packs, loading, addPack, updatePack, deletePack, duplicatePack };
}