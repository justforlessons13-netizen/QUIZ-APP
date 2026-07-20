import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Copy, Play, FileText, Download, Upload, Lock } from 'lucide-react';
import { User } from 'firebase/auth';
import { BeePack } from '@/types/bee';
import { exportBeePackAsJson, parseImportedBeePack } from '@/lib/bee-pack-io';
import { readJsonFile } from '@/lib/pack-io';
import { toast } from '@/hooks/use-toast';

interface BeePackListProps {
  packs: BeePack[];
  onEdit: (pack: BeePack) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onStartGame: (pack: BeePack) => void;
  onImport: (pack: BeePack) => void;
  user: User | null;
}

export function BeePackList({ packs, onEdit, onDelete, onDuplicate, onStartGame, onImport, user }: BeePackListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedPack, setSelectedPack] = useState<BeePack | null>(null);

  const handleStartPack = (pack: BeePack) => {
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
      const pack = parseImportedBeePack(json);
      onImport(pack);
      toast({ title: 'Pack imported!', description: pack.name });
    } catch (err) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Could not read file.',
        variant: 'destructive',
      });
    }

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
          <h3 className="text-lg font-semibold text-foreground">No word packs yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first word pack or import one from a JSON file.
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
          const completedCount = pack.words.filter(w => w.word.trim() && w.definition.trim()).length;
          const totalCount = pack.words.length;

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
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {completedCount}/{totalCount}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Updated {new Date(pack.updatedAt).toLocaleDateString()}
                  </p>

                  <div className="flex gap-1.5 pt-1">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStartPack(pack)}
                      disabled={totalCount === 0 || completedCount < totalCount}
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
                        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => exportBeePackAsJson(pack)} title="Export as JSON">
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
