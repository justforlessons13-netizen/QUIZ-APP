import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RotateCcw, Plus } from 'lucide-react';
import { BeePack, BeeWord, createEmptyWord, BEE_DIFFICULTY_TIERS, wordDifficulty } from '@/types/bee';
import { BeeWordEditor } from './BeeWordEditor';
import { toast } from '@/hooks/use-toast';
import { User } from 'firebase/auth';

interface BeeWordPackEditorProps {
  pack: BeePack;
  onSave: (pack: BeePack) => void;
  onBack: () => void;
  isNew?: boolean;
  user: User | null;
}

const MIN_RECOMMENDED_WORDS = 15;
const GOLD = 'oklch(80% 0.16 92)';

const fieldStyle = {
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.1)',
  color: '#fff',
} as const;

const honeycombBg = `repeating-linear-gradient(120deg, transparent 0 2px, transparent 2px)`;

export function BeeWordPackEditor({ pack, onSave, onBack, isNew = false, user }: BeeWordPackEditorProps) {
  const [draft, setDraft] = useState<BeePack>({ ...pack, words: [...pack.words] });

  const updateMeta = (fields: Partial<BeePack>) => setDraft(prev => ({ ...prev, ...fields }));

  const updateWordById = (id: string, updated: BeeWord) => {
    setDraft(prev => ({ ...prev, words: prev.words.map(w => w.id === id ? updated : w) }));
  };

  const addWord = () => setDraft(prev => ({ ...prev, words: [...prev.words, createEmptyWord()] }));

  const deleteWord = (id: string) => {
    setDraft(prev => ({ ...prev, words: prev.words.filter(w => w.id !== id) }));
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast({ title: 'Pack name required', description: 'Give your word pack a name.', variant: 'destructive' });
      return;
    }
    if (draft.words.length === 0) {
      toast({ title: 'No words yet', description: 'Add at least one word.', variant: 'destructive' });
      return;
    }
    const incompleteWords = draft.words.filter(w => !w.word.trim() || !w.definition.trim());
    if (incompleteWords.length > 0) {
      toast({ title: 'Incomplete words', description: `${incompleteWords.length} word(s) are missing the word or definition.`, variant: 'destructive' });
      return;
    }
    if (draft.words.length < MIN_RECOMMENDED_WORDS) {
      toast({ title: 'Small word pool', description: `Games can run long — consider adding more words so you don't run out mid-game (currently ${draft.words.length}).` });
    }
    const finalDraft = { ...draft };
    if (isNew && user) finalDraft.ownerId = user.uid;
    onSave(finalDraft);
    toast({ title: isNew ? 'Pack created!' : 'Pack updated!', description: finalDraft.name });
  };

  const handleReset = () => {
    setDraft({ ...pack, words: [...pack.words] });
    toast({ title: 'Changes reset' });
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col relative"
      style={{ background: 'oklch(14% 0.02 70)' }}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none' }} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
        <polygon points="20,0 40,11 40,33 20,44 0,33 0,11" fill="none" stroke={GOLD} strokeWidth="1" />
        <polygon points="60,0 80,11 80,33 60,44 40,33 40,11" fill="none" stroke={GOLD} strokeWidth="1" />
        <polygon points="100,0 120,11 120,33 100,44 80,33 80,11" fill="none" stroke={GOLD} strokeWidth="1" />
        <polygon points="40,44 60,55 60,77 40,88 20,77 20,55" fill="none" stroke={GOLD} strokeWidth="1" />
        <polygon points="80,44 100,55 100,77 80,88 60,77 60,55" fill="none" stroke={GOLD} strokeWidth="1" />
      </svg>

      <div className="relative z-10 flex items-center justify-between gap-4 px-7 py-[18px]" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-bungee text-[15px] text-white tracking-wide">{draft.name || 'New Pack'}</span>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <button
              onClick={handleReset}
              className="font-bungee uppercase text-[10px] px-4 py-2.5 rounded-lg text-white hover:bg-white/5 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,.15)' }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 inline" /> Reset
            </button>
          )}
          <button
            onClick={handleSave}
            className="font-bungee uppercase text-[10px] px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition-all"
            style={{ background: GOLD, color: 'oklch(30% 0.03 60)' }}
          >
            <Save className="w-3.5 h-3.5 mr-1.5 inline" /> {isNew ? 'Create Pack' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-auto px-7 py-6 flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 flex flex-col gap-3.5"
          style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}
        >
          <div className="font-bungee text-xs uppercase tracking-wide" style={{ color: GOLD }}>Pack Details</div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Name</label>
            <input
              value={draft.name}
              onChange={e => updateMeta({ name: e.target.value })}
              placeholder="e.g. Regional Bee 2026"
              className="h-10 rounded-lg px-3 text-sm outline-none"
              style={fieldStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Description</label>
            <textarea
              value={draft.description}
              onChange={e => updateMeta({ description: e.target.value })}
              placeholder="Short description of this word pack..."
              className="rounded-lg px-3 py-2.5 text-sm outline-none min-h-[60px] resize-none"
              style={fieldStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Pack Access Password (Optional)</label>
            <input
              value={draft.packPassword || ''}
              onChange={e => updateMeta({ packPassword: e.target.value })}
              placeholder="Require the host to enter a password to start this pack"
              className="h-10 rounded-lg px-3 text-sm outline-none"
              style={fieldStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Rules (shown before the game starts)</label>
            <textarea
              value={draft.rules || ''}
              onChange={e => updateMeta({ rules: e.target.value })}
              placeholder="e.g. One misspelling and you're out. No phones allowed!"
              className="rounded-lg px-3 py-2.5 text-sm outline-none min-h-[80px] resize-none"
              style={fieldStyle}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl p-5 flex flex-col gap-2.5"
          style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}
        >
          <div className="font-bungee text-xs uppercase text-white flex items-center gap-2">
            Overview
            <span className="font-normal normal-case" style={{ color: 'rgba(255,255,255,.5)', fontFamily: 'inherit' }}>
              {draft.words.length} word{draft.words.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {draft.words.map(w => (
              <div key={w.id} className="h-1.5 flex-1 rounded-full" style={{ background: w.word.trim() && w.definition.trim() ? 'oklch(70% 0.15 150)' : 'rgba(255,255,255,.15)' }} />
            ))}
            {draft.words.length === 0 && <div className="h-1.5 flex-1 rounded-full" style={{ background: 'oklch(63% 0.2 25 / .4)' }} />}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>
            {BEE_DIFFICULTY_TIERS.map(tier => {
              const count = draft.words.filter(w => wordDifficulty(w) === tier).length;
              return (
                <span key={tier} className="capitalize">
                  {tier}: <span style={{ color: '#fff', fontWeight: 600 }}>{count}</span>
                </span>
              );
            })}
            <span>
              Each round needs at least as many words in its tier as remaining players — add more Easy
              words if you expect several rounds to play out before eliminations start.
            </span>
          </div>
        </motion.div>

        {draft.words.map((w, i) => (
          <BeeWordEditor
            key={w.id}
            word={w}
            wordNumber={i + 1}
            onChange={updated => updateWordById(w.id, updated)}
            onDelete={() => deleteWord(w.id)}
            canDelete={draft.words.length > 1}
          />
        ))}
        <button
          onClick={addWord}
          className="w-full py-3 rounded-xl font-bungee uppercase text-[11px] text-white hover:bg-white/5 transition-colors"
          style={{ border: `1.5px dashed ${GOLD}59` }}
        >
          <Plus className="w-4 h-4 mr-2 inline" /> Add Word
        </button>
      </div>
    </div>
  );
}
