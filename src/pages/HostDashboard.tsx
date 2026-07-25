import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

type View = 'list' | 'editor';

export default function HostDashboard() {
  const navigate = useNavigate();
  const { packs, addPack, updatePack, deletePack, duplicatePack } = useQuestionPacks();
  const [view, setView] = useState<View>('list');
  const [editingPack, setEditingPack] = useState<QuestionPack | null>(null);
  const [isNewPack, setIsNewPack] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const { sessions, addSession, deleteSession } = useSessions(user);

  // --- Password Protection State ---
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [packToStart, setPackToStart] = useState<QuestionPack | null>(null);
  const [passwordAttempt, setPasswordAttempt] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
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

  const handleSave = (pack: QuestionPack) => {
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
      toast({
        title: 'Incorrect Password',
        description: 'You do not have permission to host this game.',
        variant: 'destructive'
      });
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

    // Save to Firestore if logged in, otherwise skip (guest host)
    if (user) {
      addSession(session);
    }

    navigate(`/host/game?session=${session.id}&pack=${pack.id}`);
  };

  return (
    <Tabs defaultValue="packs" className="w-full">
    <div className="min-h-screen flex flex-col" style={{ background: 'oklch(96% 0.012 195)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 sm:px-12 py-5 bg-white"
        style={{ borderBottom: '1px solid oklch(88% 0.015 195)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            title="Back"
            className="w-[34px] h-[34px] rounded-full border flex items-center justify-center flex-shrink-0 transition-colors hover:bg-black/5"
            style={{ borderColor: 'oklch(30% 0.06 195 / .25)', color: 'oklch(30% 0.06 195)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-bungee text-base tracking-wide" style={{ color: theme.color1 }}>
            PLAYHUB
          </span>
          {view === 'list' && (
            <>
              <span className="w-px h-[22px] hidden sm:inline-block" style={{ background: 'oklch(88% 0.015 195)' }} />
              <h1
                className="text-[13px] font-bungee uppercase tracking-wide hidden sm:block"
                style={{ color: 'oklch(30% 0.06 195)' }}
              >
                {theme.packsTitle}
              </h1>
            </>
          )}
        </div>
        {view === 'list' && (
          <TabsList
            className="inline-flex gap-1.5 p-1 rounded-[10px]"
            style={{ background: 'oklch(94% 0.01 195)' }}
          >
            <TabsTrigger
              value="packs"
              className="rounded-lg text-[13px] font-semibold px-[18px] py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              style={{ color: 'oklch(30% 0.02 195)' }}
            >
              Packs
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="rounded-lg text-[13px] font-semibold px-[18px] py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              style={{ color: 'oklch(30% 0.02 195)' }}
            >
              Sessions
            </TabsTrigger>
          </TabsList>
        )}
        <div className="flex items-center gap-2">
          {view === 'list' && user && (
            <button
              onClick={handleCreateNew}
              className="font-bungee uppercase text-xs px-5 py-2.5 rounded-md flex items-center transition-[filter] hover:brightness-110 active:scale-95"
              style={{ background: theme.color1, color: theme.onColor1, border: 'none' }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Pack
            </button>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ color: theme.color3, background: alpha(theme.color1, 0.13) }}
              >
                Admin
              </span>
              <button
                onClick={handleLogout}
                className="font-bungee uppercase text-xs px-4 py-2 rounded-md transition-colors hover:bg-black/5"
                style={{ background: 'transparent', color: 'oklch(30% 0.02 195)', border: '1.5px solid oklch(30% 0.02 195 / .2)' }}
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/admin')}
              className="font-bungee uppercase text-xs px-5 py-2.5 rounded-md text-white transition-[filter] hover:brightness-110"
              style={{ background: 'oklch(30% 0.06 195)' }}
            >
              Log in as admin
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 sm:px-12 py-9 w-full">
        {view === 'editor' && editingPack ? (
          <QuestionPackEditor
            pack={editingPack}
            onSave={handleSave}
            onBack={() => setView('list')}
            isNew={isNewPack}
            user={user}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
              <TabsContent value="packs" className="mt-0">
                <QuestionPackList
                  packs={packs}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={duplicatePack}
                  onStartGame={handleStartGame}
                  onImport={addPack}
                  user={user}
                />
              </TabsContent>

              <TabsContent value="sessions" className="mt-0">
                {!user ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <Lock className="w-[26px] h-[26px]" style={{ color: 'oklch(30% 0.02 195)', opacity: 0.35 }} />
                    <p
                      className="text-[13px] uppercase tracking-wider"
                      style={{ color: 'oklch(50% 0.02 195)' }}
                    >
                      Log in as admin to track sessions
                    </p>
                    <button
                      onClick={() => navigate('/admin')}
                      className="font-bungee uppercase text-xs px-6 py-2.5 rounded-md text-white transition-[filter] hover:brightness-110"
                      style={{ background: 'oklch(30% 0.06 195)' }}
                    >
                      Log in as admin
                    </button>
                  </div>
                ) : (
                  <GameSessionList
                    sessions={sessions}
                    onDelete={deleteSession}
                  />
                )}
              </TabsContent>
          </motion.div>
        )}
      </main>

      {/* Password Protection Dialog */}
      {isPasswordDialogOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100]"
          style={{ background: 'rgba(20,25,30,.5)' }}
          onClick={() => setIsPasswordDialogOpen(false)}
        >
          <div
            className="w-[360px] bg-white rounded-[14px] p-7"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <Lock className="w-4 h-4" style={{ color: 'oklch(28% 0.06 195)' }} />
              <div className="font-bungee text-sm uppercase" style={{ color: 'oklch(28% 0.06 195)' }}>
                Protected pack
              </div>
            </div>
            <p className="text-[13px] leading-relaxed mb-[18px]" style={{ color: 'oklch(45% 0.02 195)' }}>
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
                className="w-full box-border text-center text-2xl tracking-[.3em] rounded-lg py-3.5"
                style={{ border: '1.5px solid oklch(80% 0.02 195)', color: 'oklch(28% 0.06 195)' }}
              />
              <div className="flex gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsPasswordDialogOpen(false)}
                  className="flex-1 font-bungee uppercase text-xs py-3 rounded-[7px]"
                  style={{ background: 'transparent', color: 'oklch(30% 0.02 195)', border: '1.5px solid oklch(30% 0.02 195 / .2)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 font-bungee uppercase text-xs py-3 rounded-[7px]"
                  style={{ background: theme.color1, color: theme.onColor1 }}
                >
                  Verify &amp; start
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </Tabs>
  );
}
