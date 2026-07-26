import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Lock } from 'lucide-react';
import { useBeePacks } from '@/hooks/useBeePacks';
import { BeePack, BeeSession, createEmptyBeePack } from '@/types/bee';
import { BeePackList } from '@/components/bee/BeePackList';
import { BeeWordPackEditor } from '@/components/bee/BeeWordPackEditor';
import { BeeSessionList } from '@/components/bee/BeeSessionList';
import { useBeeSessions } from '@/hooks/useBeeSessions';
import { toast } from '@/hooks/use-toast';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';

const GOLD = 'oklch(80% 0.16 92)';
const ON_GOLD = 'oklch(30% 0.03 60)';

type View = 'list' | 'editor';

export default function BeeHostDashboard() {
  const navigate = useNavigate();
  const { packs, addPack, updatePack, deletePack, duplicatePack } = useBeePacks();
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState<'packs' | 'sessions'>('packs');
  const [editingPack, setEditingPack] = useState<BeePack | null>(null);
  const [isNewPack, setIsNewPack] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const { sessions, addSession, deleteSession } = useBeeSessions(user);

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [packToStart, setPackToStart] = useState<BeePack | null>(null);
  const [passwordAttempt, setPasswordAttempt] = useState('');

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
    const empty = createEmptyBeePack();
    setEditingPack(empty);
    setIsNewPack(true);
    setView('editor');
  };

  const handleEdit = (pack: BeePack) => {
    setEditingPack(pack);
    setIsNewPack(false);
    setView('editor');
  };

  const handleSave = (pack: BeePack) => {
    if (isNewPack) {
      addPack(pack);
      setIsNewPack(false);
      setEditingPack(pack);
    } else {
      updatePack(pack);
      setEditingPack(pack);
    }
  };

  const handleDelete = (id: string) => {
    deletePack(id);
    toast({ title: 'Pack deleted' });
  };

  const handleStartGame = (pack: BeePack) => {
    if (user) {
      proceedToGame(pack);
      return;
    }
    if (pack.packPassword) {
      setPackToStart(pack);
      setIsPasswordDialogOpen(true);
      return;
    }
    proceedToGame(pack);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packToStart) return;
    if (passwordAttempt === packToStart.packPassword) {
      setIsPasswordDialogOpen(false);
      setPasswordAttempt('');
      proceedToGame(packToStart);
    } else {
      toast({ title: 'Incorrect Password', description: 'You do not have permission to host this bee.', variant: 'destructive' });
    }
  };

  const proceedToGame = (pack: BeePack) => {
    const session: BeeSession = {
      id: crypto.randomUUID(),
      packId: pack.id,
      packName: pack.name,
      status: 'waiting',
      currentRound: 1,
      createdAt: new Date().toISOString(),
      playerCount: 0,
    };
    if (user) addSession(session);
    navigate(`/bee/game?session=${session.id}&pack=${pack.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'oklch(14% 0.02 70)' }}>
      <svg width="100%" height="100%" style={{ position: 'fixed', inset: 0, opacity: 0.05, pointerEvents: 'none' }} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
        <polygon points="20,0 40,11 40,33 20,44 0,33 0,11" fill="none" stroke={GOLD} strokeWidth="1" />
        <polygon points="60,0 80,11 80,33 60,44 40,33 40,11" fill="none" stroke={GOLD} strokeWidth="1" />
        <polygon points="100,0 120,11 120,33 100,44 80,33 80,11" fill="none" stroke={GOLD} strokeWidth="1" />
        <polygon points="40,44 60,55 60,77 40,88 20,77 20,55" fill="none" stroke={GOLD} strokeWidth="1" />
        <polygon points="80,44 100,55 100,77 80,88 60,77 60,55" fill="none" stroke={GOLD} strokeWidth="1" />
      </svg>

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-5" style={{ borderBottom: `1px solid ${GOLD}26` }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            title="Back"
            className="w-[34px] h-[34px] rounded-full border flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/5"
            style={{ borderColor: `${GOLD}40`, color: GOLD }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-bungee text-base tracking-wide" style={{ color: GOLD }}>PLAYHUB</span>
          {view === 'list' && (
            <>
              <span className="w-px h-[22px] hidden sm:inline-block" style={{ background: `${GOLD}26` }} />
              <h1 className="text-[13px] font-bungee uppercase tracking-wide hidden sm:block text-white">Spelling bee packs</h1>
            </>
          )}
        </div>
        {view === 'list' && (
          <div className="inline-flex gap-1.5 p-1 rounded-[10px]" style={{ background: 'rgba(255,255,255,.05)' }}>
            <button
              onClick={() => setTab('packs')}
              className="rounded-lg text-[13px] font-semibold px-[18px] py-2.5 transition-colors"
              style={{ background: tab === 'packs' ? GOLD : 'transparent', color: tab === 'packs' ? ON_GOLD : 'rgba(255,255,255,.6)' }}
            >
              Packs
            </button>
            <button
              onClick={() => setTab('sessions')}
              className="rounded-lg text-[13px] font-semibold px-[18px] py-2.5 transition-colors"
              style={{ background: tab === 'sessions' ? GOLD : 'transparent', color: tab === 'sessions' ? ON_GOLD : 'rgba(255,255,255,.6)' }}
            >
              Sessions
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {view === 'list' && user && tab === 'packs' && (
            <button
              onClick={handleCreateNew}
              className="font-bungee uppercase text-xs px-5 py-2.5 rounded-md flex items-center transition-[filter] hover:brightness-110 active:scale-95"
              style={{ background: GOLD, color: ON_GOLD, border: 'none' }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Pack
            </button>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ color: GOLD, background: `${GOLD}22` }}>Admin</span>
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
              style={{ background: GOLD, color: ON_GOLD }}
            >
              Log in as admin
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1 px-6 sm:px-12 py-9 w-full">
        {view === 'editor' && editingPack ? (
          <BeeWordPackEditor pack={editingPack} onSave={handleSave} onBack={() => setView('list')} isNew={isNewPack} user={user} />
        ) : (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'packs' ? (
              <BeePackList
                packs={packs}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={duplicatePack}
                onStartGame={handleStartGame}
                onImport={addPack}
                user={user}
              />
            ) : !user ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Lock className="w-[26px] h-[26px]" style={{ color: '#fff', opacity: 0.35 }} />
                <p className="text-[13px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,.5)' }}>Log in as admin to track sessions</p>
                <button
                  onClick={() => navigate('/admin')}
                  className="font-bungee uppercase text-xs px-6 py-2.5 rounded-md transition-[filter] hover:brightness-110"
                  style={{ background: GOLD, color: ON_GOLD }}
                >
                  Log in as admin
                </button>
              </div>
            ) : (
              <BeeSessionList sessions={sessions} onDelete={deleteSession} />
            )}
          </motion.div>
        )}
      </main>

      {isPasswordDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]" style={{ background: 'rgba(0,0,0,.6)' }} onClick={() => setIsPasswordDialogOpen(false)}>
          <div className="w-[360px] rounded-[14px] p-7" style={{ background: 'oklch(16% 0.02 70)', border: `1px solid ${GOLD}33`, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <Lock className="w-4 h-4" style={{ color: GOLD }} />
              <div className="font-bungee text-sm uppercase text-white">Protected pack</div>
            </div>
            <p className="text-[13px] leading-relaxed mb-[18px]" style={{ color: 'rgba(255,255,255,.6)' }}>
              Enter the host PIN to start a bee for <strong>{packToStart?.name}</strong>.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                placeholder="••••"
                value={passwordAttempt}
                onChange={(e) => setPasswordAttempt(e.target.value)}
                autoFocus
                maxLength={8}
                className="w-full box-border text-center text-2xl tracking-[.3em] rounded-lg py-3.5 outline-none"
                style={{ background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.15)', color: '#fff' }}
              />
              <div className="flex gap-2.5 mt-5">
                <button type="button" onClick={() => setIsPasswordDialogOpen(false)} className="flex-1 font-bungee uppercase text-xs py-3 rounded-[7px]" style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,.2)' }}>Cancel</button>
                <button type="submit" className="flex-1 font-bungee uppercase text-xs py-3 rounded-[7px]" style={{ background: GOLD, color: ON_GOLD }}>Verify &amp; start</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
