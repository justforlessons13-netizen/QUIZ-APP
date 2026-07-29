import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RotateCcw, Plus, Minus, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { QuestionPack, createEmptyQuestion, getRoundCount, MIN_ROUNDS, MAX_ROUNDS } from '@/types/host';
import { Question } from '@/types/game';
import { QuestionEditor } from './QuestionEditor';
import { toast } from '@/hooks/use-toast';
import { User } from 'firebase/auth';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

interface QuestionPackEditorProps {
  pack: QuestionPack;
  onSave: (pack: QuestionPack) => void;
  onBack: () => void;
  isNew?: boolean;
  user: User | null;
}

const fieldStyle = {
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.1)',
  color: '#fff',
} as const;

export function QuestionPackEditor({ pack, onSave, onBack, isNew = false, user }: QuestionPackEditorProps) {
  const [draft, setDraft] = useState<QuestionPack>({ ...pack, questions: [...pack.questions], roundCount: getRoundCount(pack) });
  const [activeRound, setActiveRound] = useState(1);

  const roundCount = draft.roundCount ?? getRoundCount(draft);
  const rounds = Array.from({ length: roundCount }, (_, i) => i + 1);

  const updateMeta = (fields: Partial<QuestionPack>) => setDraft(prev => ({ ...prev, ...fields }));

  const setRoundCount = (nextCount: number) => {
    const clamped = Math.max(MIN_ROUNDS, Math.min(MAX_ROUNDS, nextCount));
    if (clamped === roundCount) return;

    setDraft(prev => {
      let questions = [...prev.questions];

      if (clamped > roundCount) {
        // Adding rounds: give each new round one empty question, and re-derive which round is
        // "final" (only the last round gets MCQ + wagering) — the previous final round's leftover
        // mcq/options data is harmless since scoring no longer treats it as final.
        for (let r = roundCount + 1; r <= clamped; r++) {
          questions.push(createEmptyQuestion(r, r === clamped));
        }
      } else {
        const removedRounds = questions.filter(q => q.round > clamped);
        if (removedRounds.some(q => q.text.trim() || q.answer.trim())) {
          const ok = window.confirm(
            `Reducing to ${clamped} round${clamped === 1 ? '' : 's'} will delete ${removedRounds.length} question(s) already filled in for round${clamped === roundCount - 1 ? '' : 's'} ${clamped + 1}–${roundCount}. Continue?`
          );
          if (!ok) return prev;
        }
        questions = questions.filter(q => q.round <= clamped);
      }

      const pruneRecord = <T,>(record?: Record<number, T>) => {
        if (!record) return record;
        const next: Record<number, T> = {};
        for (const [k, v] of Object.entries(record)) {
          if (Number(k) <= clamped) next[Number(k)] = v;
        }
        return next;
      };

      return {
        ...prev,
        roundCount: clamped,
        questions,
        roundNames: pruneRecord(prev.roundNames),
        roundRules: pruneRecord(prev.roundRules),
        lotteryAfterRound: pruneRecord(prev.lotteryAfterRound),
        standingsAfterRound: pruneRecord(prev.standingsAfterRound),
      };
    });

    if (activeRound > clamped) setActiveRound(clamped);
  };

  const updateQuestionById = (id: number, updated: Question) => {
    setDraft(prev => ({ ...prev, questions: prev.questions.map(q => q.id === id ? updated : q) }));
  };

  const addQuestionToRound = (round: number) => {
    setDraft(prev => {
      const newQ = createEmptyQuestion(round, round === roundCount);
      const lastIndex = prev.questions.reduce((last, q, i) => q.round === round ? i : last, -1);
      const questions = [...prev.questions];
      if (lastIndex === -1) {
        const insertAt = questions.findIndex(q => q.round > round);
        questions.splice(insertAt === -1 ? questions.length : insertAt, 0, newQ);
      } else {
        questions.splice(lastIndex + 1, 0, newQ);
      }
      return { ...prev, questions };
    });
  };

  const deleteQuestion = (id: number) => {
    setDraft(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast({ title: 'Pack name required', description: 'Give your question pack a name.', variant: 'destructive' });
      return;
    }
    const emptyRounds = rounds.filter(r => !draft.questions.some(q => q.round === r));
    if (emptyRounds.length > 0) {
      toast({ title: 'Missing rounds', description: `Round${emptyRounds.length > 1 ? 's' : ''} ${emptyRounds.join(', ')} need at least one question.`, variant: 'destructive' });
      return;
    }
    const emptyQuestions = draft.questions.filter(q => !q.text.trim() || !q.answer.trim());
    if (emptyQuestions.length > 0) {
      toast({ title: 'Incomplete questions', description: `${emptyQuestions.length} question(s) are missing text or answers.`, variant: 'destructive' });
      return;
    }
    const finalDraft = { ...draft };
    if (isNew && user) finalDraft.ownerId = user.uid;
    onSave(finalDraft);
    toast({ title: isNew ? 'Pack created!' : 'Pack updated!', description: finalDraft.name });
  };

  const handleReset = () => {
    setDraft({ ...pack, questions: [...pack.questions] });
    toast({ title: 'Changes reset' });
  };

  const roundQs = draft.questions.filter(q => q.round === activeRound);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(168,150,255,0.16) 0%, rgb(18,20,24) 60%)` }}
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
            className="font-bungee uppercase text-[10px] px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition-all"
            style={{ background: theme.color1, color: theme.onColor1 }}
          >
            <Save className="w-3.5 h-3.5 mr-1.5 inline" /> {isNew ? 'Create Pack' : 'Save Changes'}
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
          <div className="font-bungee text-xs uppercase tracking-wide" style={{ color: theme.color1 }}>Pack Details</div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Name</label>
            <input
              value={draft.name}
              onChange={e => updateMeta({ name: e.target.value })}
              placeholder="e.g. Friday Night Trivia Vol. 1"
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
              placeholder="Require audience to enter a password to play"
              className="h-10 rounded-lg px-3 text-sm outline-none"
              style={fieldStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Game Rules (displayed at start)</label>
            <textarea
              value={draft.gameRules || ''}
              onChange={e => updateMeta({ gameRules: e.target.value })}
              placeholder="e.g. No phones allowed! Spelling doesn't count."
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
          <div className="font-bungee text-xs uppercase text-white flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              Overview
              <span className="font-normal normal-case" style={{ color: 'rgba(255,255,255,.5)', fontFamily: 'inherit' }}>
                {draft.questions.length} questions across {roundCount} round{roundCount === 1 ? '' : 's'}
              </span>
            </span>
            <div className="flex items-center gap-2 normal-case">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,.5)' }}>Rounds</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRoundCount(roundCount - 1)}
                  disabled={roundCount <= MIN_ROUNDS}
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#fff' }}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-bungee text-xs w-5 text-center" style={{ color: theme.color1 }}>{roundCount}</span>
                <button
                  type="button"
                  onClick={() => setRoundCount(roundCount + 1)}
                  disabled={roundCount >= MAX_ROUNDS}
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#fff' }}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {rounds.map(round => {
              const rQs = draft.questions.filter(q => q.round === round);
              return (
                <div key={round} className="flex items-center gap-2.5">
                  <span className="font-bungee text-[10px] w-6" style={{ color: theme.color1 }}>R{round}</span>
                  <div className="flex-1 flex items-center gap-1">
                    {rQs.map(q => (
                      <div key={q.id} className="h-1.5 flex-1 rounded-full" style={{ background: q.text.trim() && q.answer.trim() ? 'oklch(70% 0.15 150)' : 'rgba(255,255,255,.15)' }} />
                    ))}
                    {rQs.length === 0 && <div className="h-1.5 flex-1 rounded-full" style={{ background: 'oklch(63% 0.2 25 / .4)' }} />}
                  </div>
                  <span className="text-[10px] w-6 text-right" style={{ color: 'rgba(255,255,255,.5)' }}>{rQs.length}Q</span>
                  {round === roundCount && <span className="text-[10px]" style={{ color: theme.color1 }}>⚡</span>}
                </div>
              );
            })}
          </div>
        </motion.div>

        <div className="flex gap-1.5 p-1 rounded-lg overflow-x-auto" style={{ background: 'rgba(255,255,255,.04)' }}>
          {rounds.map(r => {
            const rQs = draft.questions.filter(q => q.round === r);
            const allComplete = rQs.length > 0 && rQs.every(q => q.text.trim() && q.answer.trim());
            const active = activeRound === r;
            return (
              <button
                key={r}
                onClick={() => setActiveRound(r)}
                className="relative flex-1 text-center py-2 rounded-md font-bungee text-[11px] transition-colors whitespace-nowrap"
                style={{ background: active ? alpha(theme.color1, 0.18) : 'transparent', color: active ? theme.color1 : 'rgba(255,255,255,.6)' }}
              >
                R{r}
                {rQs.length > 1 && <span className="ml-1 text-[9px]" style={{ color: 'rgba(255,255,255,.4)' }}>{rQs.length}</span>}
                {r === roundCount && <span className="ml-1 text-[9px]" style={{ color: theme.color1 }}>⚡</span>}
                {allComplete && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full" style={{ background: 'oklch(70% 0.15 150)' }} />}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl p-4 flex flex-col gap-3.5" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}>
          <div className="flex flex-col gap-1.5">
            <label className="font-bungee text-[10px] uppercase" style={{ color: theme.color1 }}>Round {activeRound} Display Title</label>
            <input
              value={draft.roundNames?.[activeRound] || ''}
              onChange={e => updateMeta({ roundNames: { ...draft.roundNames, [activeRound]: e.target.value } })}
              placeholder="e.g. Science & Nature"
              className="h-9 rounded-lg px-3 text-sm outline-none"
              style={fieldStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-bungee text-[10px] uppercase" style={{ color: theme.color1 }}>Round {activeRound} Rules</label>
            <textarea
              value={draft.roundRules?.[activeRound] || ''}
              onChange={e => updateMeta({ roundRules: { ...draft.roundRules, [activeRound]: e.target.value } })}
              placeholder="Each rule on a new line..."
              className="rounded-lg px-3 py-2.5 text-sm outline-none min-h-[90px] resize-none"
              style={fieldStyle}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-bungee text-[10px] uppercase" style={{ color: theme.color1 }}>Lottery Draw After This Round</label>
            <Switch
              checked={!!draft.lotteryAfterRound?.[activeRound]}
              onCheckedChange={checked => updateMeta({ lotteryAfterRound: { ...draft.lotteryAfterRound, [activeRound]: checked } })}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-bungee text-[10px] uppercase" style={{ color: theme.color1 }}>Show Standings After This Round</label>
            <Switch
              checked={draft.standingsAfterRound?.[activeRound] !== false}
              onCheckedChange={checked => updateMeta({ standingsAfterRound: { ...draft.standingsAfterRound, [activeRound]: checked } })}
            />
          </div>
        </div>

        {roundQs.map((q, qIdx) => (
          <QuestionEditor
            key={q.id}
            question={q}
            packId={pack.id}
            roundNumber={activeRound}
            questionNumber={roundQs.length > 1 ? qIdx + 1 : undefined}
            isFinalRound={activeRound === roundCount}
            onChange={updated => updateQuestionById(q.id, updated)}
            onDelete={() => deleteQuestion(q.id)}
            canDelete={roundQs.length > 1}
          />
        ))}
        <button
          onClick={() => addQuestionToRound(activeRound)}
          className="w-full py-3 rounded-xl font-bungee uppercase text-[11px] text-white hover:bg-white/5 transition-colors"
          style={{ border: `1.5px dashed ${alpha(theme.color1, 0.35)}` }}
        >
          <Plus className="w-4 h-4 mr-2 inline" /> Add Question to Round {activeRound}
        </button>
        {activeRound === roundCount && (
          <p className="mt-1 text-xs italic" style={{ color: theme.color1 }}>
            ⚡ Round {roundCount} is "Go Hard or Go Home" — MCQ allowed, wagering enabled.
          </p>
        )}
      </div>
    </div>
  );
}
