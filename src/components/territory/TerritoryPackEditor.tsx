import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RotateCcw, Plus } from 'lucide-react';
import { TerritoryPack, createEmptyTerritoryQuestion, MIN_TERRITORY_QUESTIONS } from '@/types/territory';
import { TerritoryQuestionEditor } from './TerritoryQuestionEditor';
import { toast } from '@/hooks/use-toast';
import { User } from 'firebase/auth';

const GOLD = 'oklch(70% 0.18 40)';

interface TerritoryPackEditorProps {
  pack: TerritoryPack;
  onSave: (pack: TerritoryPack) => Promise<boolean>;
  onBack: () => void;
  isNew?: boolean;
  user: User | null;
}

const fieldStyle = {
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.1)',
  color: '#fff',
} as const;

export function TerritoryPackEditor({ pack, onSave, onBack, isNew = false, user }: TerritoryPackEditorProps) {
  const [draft, setDraft] = useState<TerritoryPack>({ ...pack, questions: [...pack.questions] });
  const [isSaving, setIsSaving] = useState(false);

  const updateMeta = (fields: Partial<TerritoryPack>) => setDraft(prev => ({ ...prev, ...fields }));

  const updateQuestionById = (id: number, updated: typeof draft.questions[number]) => {
    setDraft(prev => ({ ...prev, questions: prev.questions.map(q => q.id === id ? updated : q) }));
  };

  const addQuestion = () => setDraft(prev => ({ ...prev, questions: [...prev.questions, createEmptyTerritoryQuestion()] }));

  const deleteQuestion = (id: number) => {
    setDraft(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast({ title: 'Pack name required', description: 'Give your question pack a name.', variant: 'destructive' });
      return;
    }
    if (draft.questions.length === 0) {
      toast({ title: 'No questions yet', description: 'Add at least one question.', variant: 'destructive' });
      return;
    }
    const incomplete = draft.questions.filter(q => !q.text.trim() || !q.answer.trim());
    if (incomplete.length > 0) {
      toast({ title: 'Incomplete questions', description: `${incomplete.length} question(s) are missing text or an answer.`, variant: 'destructive' });
      return;
    }
    if (draft.questions.length < MIN_TERRITORY_QUESTIONS) {
      toast({ title: 'Small question pool', description: `A battle can run 12 rounds — consider adding more questions so you don't run out mid-game (currently ${draft.questions.length}).` });
    }
    const finalDraft = { ...draft };
    if (isNew && user) finalDraft.ownerId = user.uid;
    setIsSaving(true);
    // onSave (TerritoryDashboard) awaits the actual Firestore write and returns whether it
    // succeeded — mirrors QuestionPackEditor.tsx's handleSave, which fixed a real bug where a
    // silently-failed save (not logged in, network error) still showed a false "created!" toast.
    await onSave(finalDraft);
    setIsSaving(false);
  };

  const handleReset = () => {
    setDraft({ ...pack, questions: [...pack.questions] });
    toast({ title: 'Changes reset' });
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(255,140,60,0.14) 0%, rgb(18,20,24) 60%)` }}
    >
      <div className="flex items-center justify-between gap-4 px-7 py-[18px]" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
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
            disabled={isSaving}
            className="font-bungee uppercase text-[10px] px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: GOLD, color: '#1a0f05' }}
          >
            <Save className="w-3.5 h-3.5 mr-1.5 inline" /> {isSaving ? 'Saving…' : isNew ? 'Create Pack' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-7 py-6 flex flex-col gap-4">
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
              placeholder="e.g. General Knowledge Battle"
              className="h-10 rounded-lg px-3 text-sm outline-none"
              style={fieldStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Description</label>
            <textarea
              value={draft.description}
              onChange={e => updateMeta({ description: e.target.value })}
              placeholder="Short description of this question pack..."
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
              {draft.questions.length} question{draft.questions.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {draft.questions.map(q => (
              <div key={q.id} className="h-1.5 flex-1 rounded-full" style={{ background: q.text.trim() && q.answer.trim() ? 'oklch(70% 0.15 150)' : 'rgba(255,255,255,.15)' }} />
            ))}
            {draft.questions.length === 0 && <div className="h-1.5 flex-1 rounded-full" style={{ background: 'oklch(63% 0.2 25 / .4)' }} />}
          </div>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>
            A Long battle plays 12 rounds plus the Capture question — questions are drawn randomly
            from this pool each round, without repeats until the pool runs out.
          </p>
        </motion.div>

        {draft.questions.map((q, i) => (
          <TerritoryQuestionEditor
            key={q.id}
            question={q}
            packId={pack.id}
            questionNumber={i + 1}
            onChange={updated => updateQuestionById(q.id, updated)}
            onDelete={() => deleteQuestion(q.id)}
            canDelete={draft.questions.length > 1}
          />
        ))}
        <button
          onClick={addQuestion}
          className="w-full py-3 rounded-xl font-bungee uppercase text-[11px] text-white hover:bg-white/5 transition-colors"
          style={{ border: `1.5px dashed ${GOLD}59` }}
        >
          <Plus className="w-4 h-4 mr-2 inline" /> Add Question
        </button>
      </div>
    </div>
  );
}
