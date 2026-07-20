import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RotateCcw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BeePack, BeeWord, createEmptyWord } from '@/types/bee';
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

export function BeeWordPackEditor({ pack, onSave, onBack, isNew = false, user }: BeeWordPackEditorProps) {
  const [draft, setDraft] = useState<BeePack>({ ...pack, words: [...pack.words] });

  const updateMeta = (fields: Partial<BeePack>) => {
    setDraft(prev => ({ ...prev, ...fields }));
  };

  const updateWordById = (id: string, updated: BeeWord) => {
    setDraft(prev => ({
      ...prev,
      words: prev.words.map(w => w.id === id ? updated : w),
    }));
  };

  const addWord = () => {
    setDraft(prev => ({ ...prev, words: [...prev.words, createEmptyWord()] }));
  };

  const deleteWord = (id: string) => {
    setDraft(prev => ({
      ...prev,
      words: prev.words.filter(w => w.id !== id),
    }));
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
      toast({
        title: 'Incomplete words',
        description: `${incompleteWords.length} word(s) are missing the word or definition.`,
        variant: 'destructive',
      });
      return;
    }

    if (draft.words.length < MIN_RECOMMENDED_WORDS) {
      toast({
        title: 'Small word pool',
        description: `Games can run long — consider adding more words so you don't run out mid-game (currently ${draft.words.length}).`,
      });
    }

    const finalDraft = { ...draft };
    if (isNew && user) {
      finalDraft.ownerId = user.uid;
    }

    onSave(finalDraft);
    toast({ title: isNew ? 'Pack created!' : 'Pack updated!', description: finalDraft.name });
  };

  const handleReset = () => {
    setDraft({ ...pack, words: [...pack.words] });
    toast({ title: 'Changes reset' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="secondary" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
          )}
          <Button size="sm" onClick={handleSave} className="box-glow-primary">
            <Save className="w-4 h-4 mr-1" /> {isNew ? 'Create Pack' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl border border-border bg-card space-y-4"
      >
        <h3 className="text-lg font-bold text-foreground">Pack Details</h3>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            value={draft.name}
            onChange={e => updateMeta({ name: e.target.value })}
            placeholder="e.g. Regional Bee 2026"
            className="bg-secondary/50 border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea
            value={draft.description}
            onChange={e => updateMeta({ description: e.target.value })}
            placeholder="Short description of this word pack..."
            className="bg-secondary/50 border-border min-h-[60px] resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Pack Access Password (Optional)</Label>
          <Input
            value={draft.packPassword || ''}
            onChange={e => updateMeta({ packPassword: e.target.value })}
            placeholder="Require the host to enter a password to start this pack"
            className="bg-secondary/50 border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Rules (shown before the game starts)</Label>
          <Textarea
            value={draft.rules || ''}
            onChange={e => updateMeta({ rules: e.target.value })}
            placeholder="e.g. One misspelling and you're out. No phones allowed!"
            className="bg-secondary/50 border-border min-h-[80px] resize-none"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="p-5 rounded-xl border border-border bg-card space-y-3"
      >
        <h3 className="text-sm font-bold text-foreground">
          Overview
          <span className="text-muted-foreground font-normal ml-2">
            {draft.words.length} word{draft.words.length === 1 ? '' : 's'}
          </span>
        </h3>
        <div className="flex items-center gap-1">
          {draft.words.map(w => (
            <div
              key={w.id}
              className={`h-2 flex-1 rounded-full transition-colors ${w.word.trim() && w.definition.trim() ? 'bg-success/60' : 'bg-muted'
                }`}
            />
          ))}
          {draft.words.length === 0 && (
            <div className="h-2 flex-1 rounded-full bg-destructive/30" />
          )}
        </div>
      </motion.div>

      <div className="space-y-3">
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
        <Button
          variant="secondary"
          onClick={addWord}
          className="w-full py-2.5 rounded-xl border-dashed border-2 border-border hover:border-primary/40"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Word
        </Button>
      </div>
    </div>
  );
}
