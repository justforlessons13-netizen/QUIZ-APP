import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Copy, Download, Upload, Lock, FileText } from 'lucide-react';
import { User } from 'firebase/auth';
import { BeePack } from '@/types/bee';
import { exportBeePackAsJson, parseImportedBeePack } from '@/lib/bee-pack-io';
import { readJsonFile } from '@/lib/pack-io';
import { toast } from '@/hooks/use-toast';

const GOLD = 'oklch(80% 0.16 92)';
const ON_GOLD = 'oklch(30% 0.03 60)';

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

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = await readJsonFile(file);
      const pack = parseImportedBeePack(json);
      onImport(pack);
      toast({ title: 'Pack imported!', description: pack.name });
    } catch (err) {
      toast({ title: 'Import failed', description: err instanceof Error ? err.message : 'Could not read file.', variant: 'destructive' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const ImportButton = user && (
    <div className="flex justify-end mb-4">
      <button
        onClick={handleImportClick}
        className="font-bungee uppercase text-[10px] px-4 py-2.5 rounded-lg text-white hover:bg-white/5 transition-colors flex items-center"
        style={{ border: '1px solid rgba(255,255,255,.15)' }}
      >
        <Upload className="w-3.5 h-3.5 mr-1.5" /> Import JSON
      </button>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
    </div>
  );

  if (packs.length === 0) {
    return (
      <div>
        {ImportButton}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-12 h-12 mb-4" style={{ color: 'rgba(255,255,255,.25)' }} />
          <h3 className="text-lg font-semibold text-white">No word packs yet</h3>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,.5)' }}>Create your first word pack or import one from a JSON file.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {ImportButton}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {packs.map((pack, i) => {
          const completedCount = pack.words.filter(w => w.word.trim() && w.definition.trim()).length;
          const totalCount = pack.words.length;
          const ready = totalCount > 0 && completedCount === totalCount;

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group relative rounded-xl p-3 flex flex-col gap-2"
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', minHeight: 130 }}
            >
              {pack.packPassword && (
                <Lock className="w-3 h-3 absolute top-2.5 right-2.5" style={{ color: GOLD }} />
              )}
              <div className="font-bungee text-[11px] text-white leading-tight pr-4" style={{ minHeight: 29 }}>
                {pack.name || 'Untitled Pack'}
              </div>
              <div className="text-[9.5px]" style={{ color: 'rgba(255,255,255,.5)' }}>{totalCount} word{totalCount === 1 ? '' : 's'}</div>

              {user && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(pack)} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10" title="Edit"><Pencil className="w-3 h-3 text-white" /></button>
                  <button onClick={() => exportBeePackAsJson(pack)} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10" title="Export"><Download className="w-3 h-3 text-white" /></button>
                  <button onClick={() => onDuplicate(pack.id)} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10" title="Duplicate"><Copy className="w-3 h-3 text-white" /></button>
                  <button onClick={() => onDelete(pack.id)} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-500/10" title="Delete"><Trash2 className="w-3 h-3" style={{ color: 'oklch(65% 0.2 25)' }} /></button>
                </div>
              )}

              <button
                onClick={() => handleStartPack(pack)}
                disabled={!ready}
                className="font-bungee uppercase text-[9px] py-1.5 rounded-md mt-auto disabled:opacity-40"
                style={{ background: GOLD, color: ON_GOLD, border: 'none' }}
              >
                {!user && pack.packPassword ? 'Unlock' : 'Host'}
              </button>
            </motion.div>
          );
        })}
      </div>

      {passwordDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]" style={{ background: 'rgba(0,0,0,.6)' }} onClick={() => setPasswordDialogOpen(false)}>
          <div className="w-[340px] rounded-[14px] p-6" style={{ background: 'oklch(16% 0.02 70)', border: `1px solid ${GOLD}33` }} onClick={e => e.stopPropagation()}>
            <div className="font-bungee text-sm uppercase text-white mb-1">Password required</div>
            <p className="text-[13px] mb-4" style={{ color: 'rgba(255,255,255,.6)' }}>Enter the password to open "{selectedPack?.name}".</p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                placeholder="Enter pack password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                className="w-full box-border rounded-lg px-3 py-2.5 text-sm outline-none mb-4"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)', color: '#fff' }}
              />
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setPasswordDialogOpen(false)} className="flex-1 font-bungee uppercase text-xs py-2.5 rounded-[7px]" style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,.2)' }}>Cancel</button>
                <button type="submit" className="flex-1 font-bungee uppercase text-xs py-2.5 rounded-[7px]" style={{ background: GOLD, color: ON_GOLD }}>Unlock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
