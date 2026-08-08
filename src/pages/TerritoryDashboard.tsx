import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';
import { useTerritoryPacks } from '@/hooks/useTerritoryPacks';
import { TerritoryPack, TerritoryMode, TerritoryVisibility, TerritoryDuration, createEmptyTerritoryPack } from '@/types/territory';
import { TerritoryPackList } from '@/components/territory/TerritoryPackList';
import { TerritoryPackEditor } from '@/components/territory/TerritoryPackEditor';
import { toast } from '@/hooks/use-toast';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;
const ON_PRIMARY = theme.onColor1;

type View = 'list' | 'editor';

export default function TerritoryDashboard() {
  const navigate = useNavigate();
  const { packs, addPack, updatePack, deletePack, duplicatePack } = useTerritoryPacks();
  const [view, setView] = useState<View>('list');
  const [editingPack, setEditingPack] = useState<TerritoryPack | null>(null);
  const [isNewPack, setIsNewPack] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(getAuth());
    toast({ title: 'Logged out' });
  };

  const handleCreateNew = () => {
    const empty = createEmptyTerritoryPack();
    setEditingPack(empty);
    setIsNewPack(true);
    setView('editor');
  };

  const handleEdit = (pack: TerritoryPack) => {
    setEditingPack(pack);
    setIsNewPack(false);
    setView('editor');
  };

  const handleSave = async (pack: TerritoryPack): Promise<boolean> => {
    const ok = isNewPack ? await addPack(pack) : await updatePack(pack);
    if (ok) {
      setIsNewPack(false);
      setEditingPack(pack);
    }
    return ok;
  };

  const handleDelete = (id: string) => {
    deletePack(id);
    toast({ title: 'Pack deleted' });
  };

  // TerritoryPackList already gates this behind the pack's password (if any) before calling us —
  // by the time we're here, the host is cleared to start.
  const handleStartGame = (pack: TerritoryPack, mode: TerritoryMode, visibility: TerritoryVisibility, duration: TerritoryDuration) => {
    const sessionId = crypto.randomUUID();
    navigate(`/territory/game?session=${sessionId}&pack=${pack.id}&mode=${mode}&visibility=${visibility}&duration=${duration}`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'oklch(14% 0.02 40)' }}>
      <header
        className="flex items-center justify-between px-6 sm:px-12 py-5"
        style={{ borderBottom: `1px solid ${alpha(theme.color1, 0.15)}` }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            title="Back"
            className="w-[34px] h-[34px] rounded-full border flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/5"
            style={{ borderColor: alpha(theme.color1, 0.4), color: theme.color1 }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-bungee text-base tracking-wide" style={{ color: theme.color1 }}>PLAYHUB</span>
          {view === 'list' && (
            <>
              <span className="w-px h-[22px] hidden sm:inline-block" style={{ background: alpha(theme.color1, 0.15) }} />
              <h1 className="text-[13px] font-bungee uppercase tracking-wide hidden sm:block text-white">{theme.packsTitle}</h1>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {view === 'list' && user && (
            <button
              onClick={handleCreateNew}
              className="font-bungee uppercase text-xs px-5 py-2.5 rounded-md flex items-center transition-[filter] hover:brightness-110 active:scale-95"
              style={{ background: theme.color1, color: ON_PRIMARY, border: 'none' }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Pack
            </button>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ color: theme.color1, background: alpha(theme.color1, 0.15) }}>Admin</span>
              <button
                onClick={handleLogout}
                className="font-bungee uppercase text-xs px-4 py-2 rounded-md transition-colors hover:bg-white/5"
                style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,.2)' }}
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/admin')}
              className="font-bungee uppercase text-xs px-5 py-2.5 rounded-md transition-[filter] hover:brightness-110"
              style={{ background: theme.color1, color: ON_PRIMARY }}
            >
              Log in as admin
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 sm:px-12 py-9 w-full">
        {view === 'editor' && editingPack ? (
          <TerritoryPackEditor pack={editingPack} onSave={handleSave} onBack={() => setView('list')} isNew={isNewPack} user={user} />
        ) : (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <TerritoryPackList
              packs={packs}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={duplicatePack}
              onStartGame={handleStartGame}
              onImport={addPack}
              user={user}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
