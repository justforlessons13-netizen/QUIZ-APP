import { getAuth } from 'firebase/auth';
import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore, collection, onSnapshot,
  doc, setDoc, deleteDoc, updateDoc
} from 'firebase/firestore';
import { BeePack } from '@/types/bee';
import { toast } from '@/hooks/use-toast';

export function useBeePacks() {
  const [packs, setPacks] = useState<BeePack[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Subscribe to Firestore updates (Real-time)
  useEffect(() => {
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      collection(db, 'beePacks'),
      (snapshot) => {
        const loadedPacks = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as BeePack[];

        setPacks(loadedPacks);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching bee packs:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Add Pack (Save to Firestore)
  const addPack = useCallback(async (pack: BeePack) => {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast({ title: 'Access Denied', description: 'You must be logged in as Admin to create packs.', variant: 'destructive' });
      return;
    }

    try {
      const packWithOwner: BeePack = {
        ...pack,
        ownerId: user.uid
      };

      await setDoc(doc(db, 'beePacks', pack.id), packWithOwner);
      toast({ title: 'Pack saved to cloud' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error saving pack', variant: 'destructive' });
    }
  }, []);

  // 3. Update Pack
  const updatePack = useCallback(async (updated: BeePack) => {
    const db = getFirestore();
    try {
      const packRef = doc(db, 'beePacks', updated.id);
      await updateDoc(packRef, {
        ...updated,
        updatedAt: new Date().toISOString()
      });
      toast({ title: 'Pack updated' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error updating pack', variant: 'destructive' });
    }
  }, []);

  // 4. Delete Pack
  const deletePack = useCallback(async (id: string) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, 'beePacks', id));
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
    const copy: BeePack = {
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
