import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, LayoutDashboard, Radio, LogOut, LogIn, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBeePacks } from '@/hooks/useBeePacks';
import { BeePack, BeeSession, createEmptyBeePack } from '@/types/bee';
import { BeePackList } from '@/components/bee/BeePackList';
import { BeeWordPackEditor } from '@/components/bee/BeeWordPackEditor';
import { BeeSessionList } from '@/components/bee/BeeSessionList';
import { useBeeSessions } from '@/hooks/useBeeSessions';
import { toast } from '@/hooks/use-toast';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type View = 'list' | 'editor';

export default function BeeHostDashboard() {
  const navigate = useNavigate();
  const { packs, addPack, updatePack, deletePack, duplicatePack } = useBeePacks();
  const [view, setView] = useState<View>('list');
  const [editingPack, setEditingPack] = useState<BeePack | null>(null);
  const [isNewPack, setIsNewPack] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const { sessions, addSession, deleteSession } = useBeeSessions(user);

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [packToStart, setPackToStart] = useState<BeePack | null>(null);
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
      toast({
        title: 'Incorrect Password',
        description: 'You do not have permission to host this game.',
        variant: 'destructive'
      });
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

    if (user) {
      addSession(session);
    }

    navigate(`/bee/game?session=${session.id}&pack=${pack.id}`);
  };

  return (
    <div className="min-h-screen bg-radial-dark flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
          {view === 'list' && (
            <h1 className="text-lg font-bold text-primary hidden sm:block">Spelling Bee Dashboard</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {view === 'list' && user && (
            <Button size="sm" onClick={handleCreateNew} className="box-glow-primary">
              <Plus className="w-4 h-4 mr-1" /> New Pack
            </Button>
          )}
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} title="Log Out">
              <LogOut className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} title="Admin Login">
              <LogIn className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
        {view === 'editor' && editingPack ? (
          <BeeWordPackEditor
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
            className="space-y-6"
          >
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground">
                <span className="text-primary text-glow-primary">Spelling</span> Bee Panel
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create word packs and run live spelling bee sessions.
              </p>
            </div>

            <Tabs defaultValue="packs" className="w-full">
              <TabsList className="w-full grid grid-cols-2 bg-secondary/50">
                <TabsTrigger value="packs" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <LayoutDashboard className="w-4 h-4 mr-1.5" /> Packs ({packs.length})
                </TabsTrigger>
                <TabsTrigger value="sessions" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <Radio className="w-4 h-4 mr-1.5" /> Sessions ({sessions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="packs" className="mt-4">
                <BeePackList
                  packs={packs}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDuplicate={duplicatePack}
                  onStartGame={handleStartGame}
                  onImport={addPack}
                  user={user}
                />
              </TabsContent>

              <TabsContent value="sessions" className="mt-4">
                {!user ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                    <Lock className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground font-sugo uppercase tracking-widest">
                      Log in as admin to track sessions
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/admin')}>
                      Admin Login
                    </Button>
                  </div>
                ) : (
                  <BeeSessionList
                    sessions={sessions}
                    onDelete={deleteSession}
                  />
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </main>

      {/* Password Protection Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Protected Pack
            </DialogTitle>
            <DialogDescription>
              Please enter the host password to start a session for <strong>{packToStart?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="py-4">
              <Input
                type="password"
                placeholder="Enter PIN..."
                value={passwordAttempt}
                onChange={(e) => setPasswordAttempt(e.target.value)}
                autoFocus
                className="text-center text-2xl tracking-widest font-bold"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Verify & Start</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
