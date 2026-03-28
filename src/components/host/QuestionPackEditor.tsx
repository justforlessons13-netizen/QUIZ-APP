import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RotateCcw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionPack, createEmptyQuestion } from '@/types/host';
import { Question } from '@/types/game';
import { QuestionEditor } from './QuestionEditor';
import { toast } from '@/hooks/use-toast';
import { User } from 'firebase/auth';

interface QuestionPackEditorProps {
  pack: QuestionPack;
  onSave: (pack: QuestionPack) => void;
  onBack: () => void;
  isNew?: boolean;
  user: User | null;
}

export function QuestionPackEditor({ pack, onSave, onBack, isNew = false, user }: QuestionPackEditorProps) {
  const [draft, setDraft] = useState<QuestionPack>({ ...pack, questions: [...pack.questions] });
  const [activeRound, setActiveRound] = useState('1');

  const updateMeta = (fields: Partial<QuestionPack>) => {
    setDraft(prev => ({ ...prev, ...fields }));
  };

  const updateQuestionById = (id: number, updated: Question) => {
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? updated : q),
    }));
  };

  const addQuestionToRound = (round: number) => {
    setDraft(prev => {
      const newQ = createEmptyQuestion(round);
      // Insert after the last question of this round
      const lastIndex = prev.questions.reduce((last, q, i) => q.round === round ? i : last, -1);
      const questions = [...prev.questions];
      if (lastIndex === -1) {
        // Find correct insertion point to keep sorted by round
        const insertAt = questions.findIndex(q => q.round > round);
        questions.splice(insertAt === -1 ? questions.length : insertAt, 0, newQ);
      } else {
        questions.splice(lastIndex + 1, 0, newQ);
      }
      return { ...prev, questions };
    });
  };

  const deleteQuestion = (id: number) => {
    setDraft(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id),
    }));
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast({ title: 'Pack name required', description: 'Give your question pack a name.', variant: 'destructive' });
      return;
    }

    // Ensure every round has at least 1 question
    const emptyRounds = [1, 2, 3, 4, 5, 6].filter(r => !draft.questions.some(q => q.round === r));
    if (emptyRounds.length > 0) {
      toast({
        title: 'Missing rounds',
        description: `Round${emptyRounds.length > 1 ? 's' : ''} ${emptyRounds.join(', ')} need at least one question.`,
        variant: 'destructive',
      });
      return;
    }

    const emptyQuestions = draft.questions.filter(q => !q.text.trim() || !q.answer.trim());
    if (emptyQuestions.length > 0) {
      toast({
        title: 'Incomplete questions',
        description: `${emptyQuestions.length} question(s) are missing text or answers.`,
        variant: 'destructive',
      });
      return;
    }

    const finalDraft = { ...draft };
    if (isNew && user) {
      finalDraft.ownerId = user.uid;
    }

    onSave(finalDraft);
    toast({ title: isNew ? 'Pack created!' : 'Pack updated!', description: finalDraft.name });
    onBack();
  };

  const handleReset = () => {
    setDraft({ ...pack, questions: [...pack.questions] });
    toast({ title: 'Changes reset' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Pack Metadata */}
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
            placeholder="e.g. Friday Night Trivia Vol. 1"
            className="bg-secondary/50 border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea
            value={draft.description}
            onChange={e => updateMeta({ description: e.target.value })}
            placeholder="Short description of this question pack..."
            className="bg-secondary/50 border-border min-h-[60px] resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Pack Access Password (Optional)</Label>
          <Input
            value={draft.packPassword || ''}
            onChange={e => updateMeta({ packPassword: e.target.value })}
            placeholder="Require audience to enter a password to play"
            className="bg-secondary/50 border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Game Rules (displayed at start)</Label>
          <Textarea
            value={draft.gameRules || ''}
            onChange={e => updateMeta({ gameRules: e.target.value })}
            placeholder="e.g. No phones allowed! Spelling doesn't count."
            className="bg-secondary/50 border-border min-h-[80px] resize-none"
          />
        </div>
      </motion.div>

      {/* Overview panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="p-5 rounded-xl border border-border bg-card space-y-3"
      >
        <h3 className="text-sm font-bold text-foreground">
          Overview
          <span className="text-muted-foreground font-normal ml-2">
            {draft.questions.length} questions across 6 rounds
          </span>
        </h3>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map(round => {
            const roundQs = draft.questions.filter(q => q.round === round);
            return (
              <div key={round} className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary w-8">R{round}</span>
                <div className="flex-1 flex items-center gap-1">
                  {roundQs.map(q => (
                    <div
                      key={q.id}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        q.text.trim() && q.answer.trim() ? 'bg-success/60' : 'bg-muted'
                      }`}
                    />
                  ))}
                  {roundQs.length === 0 && (
                    <div className="h-2 flex-1 rounded-full bg-destructive/30" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground w-6 text-right">{roundQs.length}Q</span>
                {round === 6 && <span className="text-[10px] text-accent">⚡</span>}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Round Tabs */}
      <Tabs value={activeRound} onValueChange={setActiveRound}>
        <TabsList className="w-full grid grid-cols-6 bg-secondary/50">
          {[1, 2, 3, 4, 5, 6].map(r => {
            const roundQs = draft.questions.filter(q => q.round === r);
            const allComplete = roundQs.length > 0 && roundQs.every(q => q.text.trim() && q.answer.trim());
            return (
              <TabsTrigger
                key={r}
                value={String(r)}
                className="relative data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                R{r}
                {roundQs.length > 1 && (
                  <span className="ml-1 text-[10px] text-muted-foreground">{roundQs.length}</span>
                )}
                {r === 6 && <span className="ml-1 text-[10px] text-accent">⚡</span>}
                {allComplete && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-success" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {[1, 2, 3, 4, 5, 6].map(r => {
          const roundQs = draft.questions.filter(q => q.round === r);
          return (
            <TabsContent key={r} value={String(r)} className="space-y-3">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2 mb-4">
    <Label className="text-xs font-bold text-primary">Round {r} Rules</Label>
    <Input
      value={draft.roundRules?.[r] || ''}
      onChange={e => {
        const newRules = { ...draft.roundRules, [r]: e.target.value };
        updateMeta({ roundRules: newRules });
      }}
      placeholder={`Special rules for Round ${r}...`}
      className="bg-secondary/50 border-border"
    />
  </div>
              {roundQs.map((q, qIdx) => (
                <QuestionEditor
                  key={q.id}
                  question={q}
                  packId={pack.id}
                  roundNumber={r}
                  questionNumber={roundQs.length > 1 ? qIdx + 1 : undefined}
                  onChange={updated => updateQuestionById(q.id, updated)}
                  onDelete={() => deleteQuestion(q.id)}
                  canDelete={roundQs.length > 1}
                />
              ))}
              <Button
                variant="secondary"
                onClick={() => addQuestionToRound(r)}
                className="w-full py-2.5 rounded-xl border-dashed border-2 border-border hover:border-primary/40"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question to Round {r}
              </Button>
              {r === 6 && (
                <p className="mt-2 text-xs text-accent italic">
                  ⚡ Round 6 is "Go Hard or Go Home" — MCQ allowed, wagering enabled.
                </p>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
