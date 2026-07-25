import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Image, Loader2 } from 'lucide-react';
import { Question } from '@/types/game';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

interface QuestionEditorProps {
  question: Question;
  packId: string;
  roundNumber: number;
  questionNumber?: number;
  onChange: (updated: Question) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

const fieldStyle = {
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.1)',
  color: '#fff',
} as const;

export function QuestionEditor({
  question,
  packId,
  roundNumber,
  questionNumber,
  onChange,
  onDelete,
  canDelete = false,
}: QuestionEditorProps) {
  const { uploadMedia, uploading } = useMediaUpload();
  const isRound6 = roundNumber === 6;

  const update = (fields: Partial<Question>) => onChange({ ...question, ...fields });

  const updateOption = (index: number, value: string) => {
    const options = [...(question.options || ['', '', '', ''])];
    options[index] = value;
    update({ options });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'mediaUrl' | 'answerMediaUrl') => {
    if (e.target.files && e.target.files[0]) {
      const url = await uploadMedia(e.target.files[0], packId);
      update({ [field]: url });
    }
  };

  const renderMediaSlot = (label: string, value: string | undefined, field: 'mediaUrl' | 'answerMediaUrl') => (
    <div className="flex flex-col gap-2">
      <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>{label}</label>
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <input
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={(e) => handleMediaUpload(e, field)}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <button
            type="button"
            className="pointer-events-none flex items-center h-9 px-3 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)' }}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Image className="w-4 h-4 mr-2" />}
            {uploading ? 'Uploading...' : 'Choose File'}
          </button>
        </div>
        <input
          value={value || ''}
          onChange={e => update({ [field]: e.target.value } as Partial<Question>)}
          placeholder="...or paste a URL here"
          disabled={uploading}
          className="flex-1 h-9 rounded-lg px-3 text-xs outline-none"
          style={fieldStyle}
        />
      </div>
      {value && (
        <div className="mt-1 rounded-lg overflow-hidden relative group" style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(0,0,0,.3)' }}>
          <div className="aspect-video w-full flex items-center justify-center">
            {value.match(/\.(mp3|wav|ogg|m4a)($|\?)/i) ? (
              <audio src={value} controls className="w-full max-h-48" />
            ) : (
              <img src={value} alt="Preview" className="max-h-48 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
          </div>
          <button
            className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'oklch(55% 0.2 25)', color: '#fff' }}
            onClick={() => update({ [field]: '' } as Partial<Question>)}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4.5 flex flex-col gap-3.5"
      style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-bungee text-[11px]" style={{ color: theme.color1 }}>
          Round {roundNumber}{questionNumber ? ` · Q${questionNumber}` : ''}
        </h4>
        {canDelete && onDelete && (
          <button onClick={onDelete} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/5" style={{ color: 'oklch(65% 0.2 25)' }}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Question</label>
        <textarea
          value={question.text}
          onChange={e => update({ text: e.target.value })}
          placeholder="Enter your question..."
          className="rounded-lg px-3 py-2.5 text-sm outline-none min-h-[60px] resize-none"
          style={fieldStyle}
        />
      </div>

      {isRound6 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Answer Type</label>
          <Select value={question.type} onValueChange={(v: 'text' | 'mcq') => update({ type: v })}>
            <SelectTrigger className="text-white" style={fieldStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text Input</SelectItem>
              <SelectItem value="mcq">Multiple Choice</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {question.type === 'mcq' && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Options (mark the correct one as the Answer below)</label>
          <div className="grid grid-cols-2 gap-2">
            {(question.options || ['', '', '', '']).map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="h-9 rounded-lg px-3 text-sm outline-none"
                style={fieldStyle}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Correct Answer</label>
        <input
          value={question.answer}
          onChange={e => update({ answer: e.target.value })}
          placeholder="Enter the correct answer..."
          className="h-9 rounded-lg px-3 text-sm outline-none"
          style={fieldStyle}
        />
      </div>

      {renderMediaSlot('Media (Optional)', question.mediaUrl, 'mediaUrl')}
      {renderMediaSlot('Answer Media (Optional)', question.answerMediaUrl, 'answerMediaUrl')}
    </motion.div>
  );
}
