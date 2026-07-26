import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { BeeWord } from '@/types/bee';

const GOLD = 'oklch(80% 0.16 92)';

interface BeeWordEditorProps {
  word: BeeWord;
  wordNumber?: number;
  onChange: (updated: BeeWord) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

const fieldStyle = {
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.1)',
  color: '#fff',
} as const;

export function BeeWordEditor({ word, wordNumber, onChange, onDelete, canDelete = false }: BeeWordEditorProps) {
  const update = (fields: Partial<BeeWord>) => onChange({ ...word, ...fields });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 flex flex-col gap-3.5"
      style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-bungee text-[11px]" style={{ color: GOLD }}>
          Word{wordNumber ? ` ${wordNumber}` : ''}
        </h4>
        {canDelete && onDelete && (
          <button onClick={onDelete} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/5" style={{ color: 'oklch(65% 0.2 25)' }}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Word</label>
          <input
            value={word.word}
            onChange={e => update({ word: e.target.value })}
            placeholder="e.g. accommodate"
            className="h-9 rounded-lg px-3 text-sm outline-none"
            style={fieldStyle}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Part of Speech (Optional)</label>
          <input
            value={word.partOfSpeech || ''}
            onChange={e => update({ partOfSpeech: e.target.value })}
            placeholder="e.g. verb"
            className="h-9 rounded-lg px-3 text-sm outline-none"
            style={fieldStyle}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Definition</label>
        <textarea
          value={word.definition}
          onChange={e => update({ definition: e.target.value })}
          placeholder="What the word means..."
          className="rounded-lg px-3 py-2.5 text-sm outline-none min-h-[60px] resize-none"
          style={fieldStyle}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Example Sentence (Optional hint)</label>
        <textarea
          value={word.exampleSentence || ''}
          onChange={e => update({ exampleSentence: e.target.value })}
          placeholder="Used as a hint during the game..."
          className="rounded-lg px-3 py-2.5 text-sm outline-none min-h-[50px] resize-none"
          style={fieldStyle}
        />
      </div>
    </motion.div>
  );
}
