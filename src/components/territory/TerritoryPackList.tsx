import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Copy, FileText, Download, Upload, Lock, Swords } from 'lucide-react';
import { User } from 'firebase/auth';
import { TerritoryPack, TerritoryMode, TerritoryVisibility } from '@/types/territory';
import { exportTerritoryPackAsJson, readTerritoryJsonFile, parseImportedTerritoryPack } from '@/lib/territory-pack-io';
import { toast } from '@/hooks/use-toast';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

interface TerritoryPackListProps {
  packs: TerritoryPack[];
  onEdit: (pack: TerritoryPack) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onStartGame: (pack: TerritoryPack, mode: TerritoryMode, visibility: TerritoryVisibility) => void;
  onImport: (pack: TerritoryPack) => void;
  user: User | null;
}

function SegmentedChoice<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { value: T; label: string; desc: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-bungee text-[10px] uppercase" style={{ color: theme.color1 }}>{label}</label>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="rounded-lg px-2 py-2.5 text-center transition-colors"
              style={{
                background: active ? alpha(theme.color1, 0.18) : 'rgba(255,255,255,.05)',
                border: `1px solid ${active ? alpha(theme.color1, 0.5) : 'rgba(255,255,255,.1)'}`,
              }}
            >
              <div className="font-bungee text-[11px] uppercase" style={{ color: active ? theme.color1 : '#fff' }}>{opt.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,.5)' }}>{opt.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TerritoryPackList({ packs, onEdit, onDelete, onDuplicate, onStartGame, onImport, user }: TerritoryPackListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [setupPack, setSetupPack] = useState<TerritoryPack | null>(null);
  const [mode, setMode] = useState<TerritoryMode>('duo');
  const [visibility, setVisibility] = useState<TerritoryVisibility>('public');

  const openSetup = (pack: TerritoryPack) => {
    setMode('duo');
    setVisibility('public');
    setSetupPack(pack);
  };

  const handleStartPack = (pack: TerritoryPack) => {
    if (!user && pack.packPassword) {
      setSetupPack(null);
      setPasswordInput('');
      setPasswordDialogOpen(true);
      // Remember which pack the password unlocks by reusing setupPack after verification.
      setSetupPack(pack);
    } else {
      openSetup(pack);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPack && passwordInput === setupPack.packPassword) {
      setPasswordDialogOpen(false);
      openSetup(setupPack);
    } else {
      toast({ title: 'Incorrect password', variant: 'destructive' });
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = await readTerritoryJsonFile(file);
      const pack = parseImportedTerritoryPack(json);
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

  const ImportButton = user && (
    <div className="flex justify-end mb-4">
      <Button variant="secondary" size="sm" onClick={handleImportClick}>
        <Upload className="w-4 h-4 mr-1" /> Import JSON
      </Button>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
    </div>
  );

  if (packs.length === 0) {
    return (
      <div>
        {ImportButton}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-12 h-12 mb-4" style={{ color: 'rgba(255,255,255,.25)' }} />
          <h3 className="text-lg font-semibold text-white">No battle packs yet</h3>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,.5)' }}>
            Create your first battle pack or import one from a JSON file.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {ImportButton}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack, i) => {
          const completedCount = pack.questions.filter(q => q.text.trim() && q.answer.trim()).length;
          const totalCount = pack.questions.length;
          const isReady = completedCount === totalCount;
          const locked = !!pack.packPassword && !user;

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-[14px] overflow-hidden"
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}
            >
              <div
                className="h-[88px] flex items-center justify-center relative"
                style={{ background: locked ? 'rgba(255,255,255,.08)' : theme.color1 }}
              >
                <span className="font-bungee text-[34px]" style={{ color: locked ? 'rgba(255,255,255,.4)' : theme.onColor1 }}>
                  {(pack.name || '?').trim().charAt(0).toUpperCase()}
                </span>
                {pack.packPassword && (
                  <span className="absolute top-2.5 right-2.5 w-[26px] h-[26px] rounded-full bg-black/35 flex items-center justify-center">
                    <Lock className="w-3 h-3 text-white" />
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="font-bold text-[14.5px] truncate mb-1 text-white">
                  {pack.name || 'Untitled Pack'}
                </div>
                <p className="text-xs mb-3.5" style={{ color: 'rgba(255,255,255,.5)' }}>
                  {totalCount} questions
                </p>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleStartPack(pack)}
                    disabled={!isReady}
                    className="flex-1 flex items-center justify-center gap-1.5 font-semibold text-[13px] rounded-[7px] py-2.5 transition-[filter] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: locked ? 'rgba(255,255,255,.08)' : theme.color1, color: locked ? '#fff' : theme.onColor1 }}
                  >
                    <Swords className="w-3.5 h-3.5" /> {locked ? 'Unlock & host' : 'Host'}
                  </button>
                  {user && (
                    <>
                      <button
                        onClick={() => onEdit(pack)}
                        className="h-9 w-9 flex-shrink-0 rounded-[7px] flex items-center justify-center transition-colors hover:bg-white/10"
                        style={{ background: 'rgba(255,255,255,.06)', color: '#fff' }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => exportTerritoryPackAsJson(pack)}
                        title="Export as JSON"
                        className="h-9 w-9 flex-shrink-0 rounded-[7px] flex items-center justify-center transition-colors hover:bg-white/10"
                        style={{ background: 'rgba(255,255,255,.06)', color: '#fff' }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicate(pack.id)}
                        className="h-9 w-9 flex-shrink-0 rounded-[7px] flex items-center justify-center transition-colors hover:bg-white/10"
                        style={{ background: 'rgba(255,255,255,.06)', color: '#fff' }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(pack.id)}
                        className="h-9 w-9 flex-shrink-0 rounded-[7px] flex items-center justify-center transition-colors hover:bg-red-500/10"
                        style={{ background: 'rgba(255,255,255,.06)', color: 'oklch(65% 0.2 25)' }}
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

      {passwordDialogOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100]"
          style={{ background: 'rgba(0,0,0,.6)' }}
          onClick={() => setPasswordDialogOpen(false)}
        >
          <div
            className="w-[360px] rounded-[14px] p-7"
            style={{ background: 'oklch(17% 0.02 40)', border: `1px solid ${alpha(theme.color1, 0.3)}`, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <Lock className="w-4 h-4" style={{ color: theme.color1 }} />
              <div className="font-bungee text-sm uppercase text-white">Protected pack</div>
            </div>
            <p className="text-[13px] leading-relaxed mb-[18px]" style={{ color: 'rgba(255,255,255,.6)' }}>
              Enter the password to open "{setupPack?.name}".
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                placeholder="••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                maxLength={8}
                className="w-full box-border text-center text-2xl tracking-[.3em] rounded-lg py-3.5 outline-none"
                style={{ background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.15)', color: '#fff' }}
              />
              <div className="flex gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setPasswordDialogOpen(false)}
                  className="flex-1 font-bungee uppercase text-xs py-3 rounded-[7px]"
                  style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,.2)' }}
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

      {setupPack && !passwordDialogOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100] p-4"
          style={{ background: 'rgba(0,0,0,.6)' }}
          onClick={() => setSetupPack(null)}
        >
          <div
            className="w-full max-w-[400px] rounded-[14px] p-7 flex flex-col gap-4"
            style={{ background: 'oklch(17% 0.02 40)', border: `1px solid ${alpha(theme.color1, 0.3)}`, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="font-bungee text-sm uppercase text-white mb-1">Battle setup</div>
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,.6)' }}>"{setupPack.name}"</p>
            </div>

            <SegmentedChoice<TerritoryMode>
              label="Players"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'duo', label: 'Duo', desc: '2 players' },
                { value: 'trio', label: 'Trio', desc: '3 players' },
              ]}
            />
            <SegmentedChoice<TerritoryVisibility>
              label="Visibility"
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: 'public', label: 'Public', desc: 'Share the link' },
                { value: 'private', label: 'Private', desc: 'Friends only' },
              ]}
            />
            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setSetupPack(null)}
                className="flex-1 font-bungee uppercase text-xs py-3 rounded-[7px]"
                style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,.2)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { onStartGame(setupPack, mode, visibility); setSetupPack(null); }}
                className="flex-1 font-bungee uppercase text-xs py-3 rounded-[7px] flex items-center justify-center gap-1.5"
                style={{ background: theme.color1, color: theme.onColor1 }}
              >
                <Swords className="w-3.5 h-3.5" /> Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
