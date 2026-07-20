import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { BeeWord } from '@/types/bee';

interface BeeWordEditorProps {
  word: BeeWord;
  wordNumber?: number;
  onChange: (updated: BeeWord) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export function BeeWordEditor({ word, wordNumber, onChange, onDelete, canDelete = false }: BeeWordEditorProps) {
  const update = (fields: Partial<BeeWord>) => {
    onChange({ ...word, ...fields });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-border bg-card space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-primary">
          Word{wordNumber ? ` ${wordNumber}` : ''}
        </h4>
        {canDelete && onDelete && (
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Word</Label>
          <Input
            value={word.word}
            onChange={e => update({ word: e.target.value })}
            placeholder="e.g. accommodate"
            className="bg-secondary/50 border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Part of Speech (Optional)</Label>
          <Input
            value={word.partOfSpeech || ''}
            onChange={e => update({ partOfSpeech: e.target.value })}
            placeholder="e.g. verb"
            className="bg-secondary/50 border-border"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Definition</Label>
        <Textarea
          value={word.definition}
          onChange={e => update({ definition: e.target.value })}
          placeholder="What the word means..."
          className="bg-secondary/50 border-border min-h-[60px] resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Example Sentence (Optional hint)</Label>
        <Textarea
          value={word.exampleSentence || ''}
          onChange={e => update({ exampleSentence: e.target.value })}
          placeholder="Used as a hint during the game..."
          className="bg-secondary/50 border-border min-h-[50px] resize-none"
        />
      </div>
    </motion.div>
  );
}
