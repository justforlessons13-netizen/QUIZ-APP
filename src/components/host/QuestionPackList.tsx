import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Copy, FileText, Download, Upload, Lock } from 'lucide-react';
import { User } from 'firebase/auth';
import { QuestionPack } from '@/types/host';
import { exportPackAsJson, readJsonFile, parseImportedPack } from '@/lib/pack-io';
import { toast } from '@/hooks/use-toast';
import { gameThemes } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

interface QuestionPackListProps {
  packs: QuestionPack[];
  onEdit: (pack: QuestionPack) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onStartGame: (pack: QuestionPack) => void;
  onImport: (pack: QuestionPack) => void;
  user: User | null;
}

export function QuestionPackList({ packs, onEdit, onDelete, onDuplicate, onStartGame, onImport, user }: QuestionPackListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedPack, setSelectedPack] = useState<QuestionPack | null>(null);

  const handleStartPack = (pack: QuestionPack) => {
    // If not logged in and pack has a password, prompt for it
    if (!user && pack.packPassword) {
      setSelectedPack(pack);
      setPasswordInput('');
      setPasswordDialogOpen(true);
    } else {
      onStartGame(pack);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPack && passwordInput === selectedPack.packPassword) {
      setPasswordDialogOpen(false);
      onStartGame(selectedPack);
    } else {
      toast({ title: 'Incorrect password', variant: 'destructive' });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const json = await readJsonFile(file);
      const pack = parseImportedPack(json);
      onImport(pack);
      toast({ title: 'Pack imported!', description: pack.name });
    } catch (err) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Could not read file.',
        variant: 'destructive',
      });
    }

    // Reset input so the same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (packs.length === 0) {
    return (
      <div>
        {user && (
          <div className="flex justify-end mb-4">
            <Button variant="secondary" size="sm" onClick={handleImportClick}>
              <Upload className="w-4 h-4 mr-1" /> Import JSON
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </div>
        )}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <FileText className="w-12 h-12 mb-4" style={{ color: 'oklch(30% 0.02 195)', opacity: 0.3 }} />
          <h3 className="text-lg font-semibold" style={{ color: 'oklch(24% 0.04 195)' }}>No question packs yet</h3>
          <p className="text-sm mt-1" style={{ color: 'oklch(52% 0.02 195)' }}>
            Create your first question pack or import one from a JSON file.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {user && (
        <div className="flex justify-end mb-4">
          <Button variant="secondary" size="sm" onClick={handleImportClick}>
            <Upload className="w-4 h-4 mr-1" /> Import JSON
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack, i) => {
          const completedCount = pack.questions.filter(q => q.text.trim() && q.answer.trim()).length;
          const totalCount = pack.questions.length;
          const isReady = completedCount === totalCount;
          const locked = !!pack.packPassword && !user;
          const totalRounds = pack.questions.length ? Math.max(...pack.questions.map(q => q.round)) : 0;

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-[14px] overflow-hidden bg-white"
              style={{ border: '1px solid oklch(88% 0.015 195)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}
            >
              <div
                className="h-[88px] flex items-center justify-center relative"
                style={{ background: locked ? 'oklch(80% 0.01 195)' : theme.color1 }}
              >
                <span className="font-bungee text-[34px]" style={{ color: locked ? 'oklch(55% 0.01 195)' : theme.onColor1 }}>
                  {(pack.name || '?').trim().charAt(0).toUpperCase()}
                </span>
                {pack.packPassword && (
                  <span className="absolute top-2.5 right-2.5 w-[26px] h-[26px] rounded-full bg-black/35 flex items-center justify-center">
                    <Lock className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="font-bold text-[14.5px] truncate mb-1" style={{ color: 'oklch(24% 0.04 195)' }}>
                  {pack.name || 'Untitled Pack'}
                </div>
                <p className="text-xs mb-3.5" style={{ color: 'oklch(52% 0.02 195)' }}>
                  {totalRounds} rounds · {totalCount} questions
                </p>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleStartPack(pack)}
                    disabled={!isReady}
                    className="flex-1 flex items-center justify-center font-semibold text-[13px] rounded-[7px] py-2.5 transition-[filter] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: locked ? 'oklch(93% 0.01 195)' : theme.color1, color: locked ? 'oklch(35% 0.02 195)' : theme.onColor1 }}
                  >
                    {locked ? 'Unlock & host' : 'Host'}
                  </button>
                  {user && (
                    <>
                      <button
                        onClick={() => onEdit(pack)}
                        className="h-9 w-9 flex-shrink-0 rounded-[7px] flex items-center justify-center transition-colors hover:bg-black/5"
                        style={{ background: 'oklch(94% 0.01 195)', color: 'oklch(30% 0.02 195)' }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => exportPackAsJson(pack)}
                        title="Export as JSON"
                        className="h-9 w-9 flex-shrink-0 rounded-[7px] flex items-center justify-center transition-colors hover:bg-black/5"
                        style={{ background: 'oklch(94% 0.01 195)', color: 'oklch(30% 0.02 195)' }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicate(pack.id)}
                        className="h-9 w-9 flex-shrink-0 rounded-[7px] flex items-center justify-center transition-colors hover:bg-black/5"
                        style={{ background: 'oklch(94% 0.01 195)', color: 'oklch(30% 0.02 195)' }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(pack.id)}
                        className="h-9 w-9 flex-shrink-0 rounded-[7px] flex items-center justify-center transition-colors hover:bg-red-50"
                        style={{ background: 'oklch(94% 0.01 195)', color: 'oklch(58% 0.2 25)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Password Dialog */}
      {passwordDialogOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100]"
          style={{ background: 'rgba(20,25,30,.5)' }}
          onClick={() => setPasswordDialogOpen(false)}
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
              Enter the password to open "{selectedPack?.name}".
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                placeholder="••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                maxLength={8}
                className="w-full box-border text-center text-2xl tracking-[.3em] rounded-lg py-3.5"
                style={{ border: '1.5px solid oklch(80% 0.02 195)', color: 'oklch(28% 0.06 195)' }}
              />
              <div className="flex gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setPasswordDialogOpen(false)}
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
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
