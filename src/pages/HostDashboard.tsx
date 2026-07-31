import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Lock } from 'lucide-react';
import { useQuestionPacks } from '@/hooks/useQuestionPacks';
import { QuestionPack, GameSession, createEmptyPack } from '@/types/host';
import { QuestionPackList } from '@/components/host/QuestionPackList';
import { QuestionPackEditor } from '@/components/host/QuestionPackEditor';
import { GameSessionList } from '@/components/host/GameSessionList';
import { useSessions } from '@/hooks/useSessions';
import { toast } from '@/hooks/use-toast';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;
const ON_PRIMARY = theme.onColor1;

type View = 'list' | 'editor';

export default function HostDashboard() {
  const navigate = useNavigate();
  const { packs, addPack, updatePack, deletePack, duplicatePack } = useQuestionPacks();
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState<'packs' | 'sessions'>('packs');
  const [editingPack, setEditingPack] = useState<QuestionPack | null>(null);
  const [isNewPack, setIsNewPack] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const { sessions, addSession, deleteSession } = useSessions(user);

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [packToStart, setPackToStart] = useState<QuestionPack | null>(null);
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
    const empty = createEmptyPack();
    setEditingPack(empty);
    setIsNewPack(true);
    setView('editor');
  };

  const handleEdit = (pack: QuestionPack) => {
    setEditingPack(pack);
    setIsNewPack(false);
    setView('editor');
  };

  // Only flips isNewPack/editingPack once the write actually succeeded — addPack/updatePack
  // can silently fail (not logged in, network error), and the editor needs to know so it can
  // keep showing "Create Pack" instead of falsely acting like the pack is already saved.
  const handleSave = async (pack: QuestionPack): Promise<boolean> => {
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

  const handleStartGame = (pack: QuestionPack) => {
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
      toast({ title: 'Incorrect Password', description: 'You do not have permission to host this game.', variant: 'destructive' });
    }
  };

  const proceedToGame = (pack: QuestionPack) => {
    const session: GameSession = {
      id: crypto.randomUUID(),
      packId: pack.id,
      packName: pack.name,
      status: 'waiting',
      currentRound: 1,
      createdAt: new Date().toISOString(),
      teamCount: 0,
    };
    if (user) addSession(session);
    navigate(`/host/game?session=${session.id}&pack=${pack.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'oklch(14% 0.015 290)' }}>
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
        {view === 'list' && (
          <div className="inline-flex gap-1.5 p-1 rounded-[10px]" style={{ background: 'rgba(255,255,255,.05)' }}>
            <button
              onClick={() => setTab('packs')}
              className="rounded-lg text-[13px] font-semibold px-[18px] py-2.5 transition-colors"
              style={{ background: tab === 'packs' ? theme.color1 : 'transparent', color: tab === 'packs' ? ON_PRIMARY : 'rgba(255,255,255,.6)' }}
            >
              Packs
            </button>
            <button
              onClick={() => setTab('sessions')}
              className="rounded-lg text-[13px] font-semibold px-[18px] py-2.5 transition-colors"
              style={{ background: tab === 'sessions' ? theme.color1 : 'transparent', color: tab === 'sessions' ? ON_PRIMARY : 'rgba(255,255,255,.6)' }}
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
          <QuestionPackEditor pack={editingPack} onSave={handleSave} onBack={() => setView('list')} isNew={isNewPack} user={user} />
        ) : (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'packs' ? (
              <QuestionPackList
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
                  style={{ background: theme.color1, color: ON_PRIMARY }}
                >
                  Log in as admin
                </button>
              </div>
            ) : (
              <GameSessionList sessions={sessions} onDelete={deleteSession} />
            )}
          </motion.div>
        )}
      </main>

      {isPasswordDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]" style={{ background: 'rgba(0,0,0,.6)' }} onClick={() => setIsPasswordDialogOpen(false)}>
          <div className="w-[360px] rounded-[14px] p-7" style={{ background: 'oklch(17% 0.015 290)', border: `1px solid ${alpha(theme.color1, 0.3)}`, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <Lock className="w-4 h-4" style={{ color: theme.color1 }} />
              <div className="font-bungee text-sm uppercase text-white">Protected pack</div>
            </div>
            <p className="text-[13px] leading-relaxed mb-[18px]" style={{ color: 'rgba(255,255,255,.6)' }}>
              Enter the host PIN to start a session for <strong>{packToStart?.name}</strong>.
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
                <button type="submit" className="flex-1 font-bungee uppercase text-xs py-3 rounded-[7px]" style={{ background: theme.color1, color: ON_PRIMARY }}>Verify &amp; start</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
