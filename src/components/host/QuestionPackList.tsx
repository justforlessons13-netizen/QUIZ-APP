import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Copy, Play, FileText, Download, Upload, Lock } from 'lucide-react';
import { User } from 'firebase/auth';
import { QuestionPack } from '@/types/host';
import { exportPackAsJson, readJsonFile, parseImportedPack } from '@/lib/pack-io';
import { toast } from '@/hooks/use-toast';

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
          <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No question packs yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
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

      <div className="grid gap-4 sm:grid-cols-2">
        {packs.map((pack, i) => {
          const completedCount = pack.questions.filter(q => q.text.trim() && q.answer.trim()).length;
          const totalCount = pack.questions.length;

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-card border-border hover:border-primary/30 transition-colors group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate text-foreground">{pack.name || 'Untitled Pack'}</CardTitle>
                      <CardDescription className="text-xs mt-1 line-clamp-2">
                        {pack.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(completedCount / totalCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {completedCount}/{totalCount}
                    </span>
                  </div>

                  {/* Metadata */}
                  <p className="text-[11px] text-muted-foreground">
                    Updated {new Date(pack.updatedAt).toLocaleDateString()}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStartPack(pack)}
                      disabled={completedCount < totalCount}
                      className="flex-1 text-xs"
                    >
                      {!user && pack.packPassword ? <Lock className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />} 
                      {!user && pack.packPassword ? "Unlock Pack" : "Start Game"}
                    </Button>
                    {user && (
                      <>
                        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => onEdit(pack)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => exportPackAsJson(pack)} title="Export as JSON">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => onDuplicate(pack.id)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(pack.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Required</DialogTitle>
            <DialogDescription>
              Please enter the password to open "{selectedPack?.name}".
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
            <Input
              type="password"
              placeholder="Enter pack password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Unlock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
