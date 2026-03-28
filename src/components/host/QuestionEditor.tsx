import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Image, Loader2 } from 'lucide-react'; // Added Loader2
import { Question } from '@/types/game';
import { useMediaUpload } from '@/hooks/useMediaUpload'; // <--- Import the hook

const CATEGORY_PRESETS = [
  '🌍 Geography', '📜 History', '🔬 Science', '🎨 Art', '🌿 Nature',
  '🎬 Movies', '🎵 Music', '⚽ Sports', '📺 TV Shows', '🍕 Food & Drink',
  '💻 Technology', '📖 Literature', '🎮 Gaming', '🧠 General Knowledge',
];

interface QuestionEditorProps {
  question: Question;
  packId: string; // <--- Added packId so we know where to upload
  roundNumber: number;
  questionNumber?: number;
  onChange: (updated: Question) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export function QuestionEditor({
  question,
  packId, // <--- Destructure packId
  roundNumber,
  questionNumber,
  onChange,
  onDelete,
  canDelete = false,
}: QuestionEditorProps) {
  // Initialize hook
  const { uploadMedia, uploading } = useMediaUpload();
  
  const isRound6 = roundNumber === 6;

  const update = (fields: Partial<Question>) => {
    onChange({ ...question, ...fields });
  };

  const updateOption = (index: number, value: string) => {
    const options = [...(question.options || ['', '', '', ''])];
    options[index] = value;
    update({ options });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Upload using the packId passed from parent
      const url = await uploadMedia(file, packId);
      // Save the URL to the question object
      update({ mediaUrl: url }); 
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-border bg-card space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-primary">
          Round {roundNumber}{questionNumber ? ` · Q${questionNumber}` : ''}
        </h4>
        {canDelete && onDelete && (
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Category</Label>
        <Select value={question.category} onValueChange={v => update({ category: v })}>
          <SelectTrigger className="bg-secondary/50 border-border">
            <SelectValue placeholder="Choose category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_PRESETS.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Question Text */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Question</Label>
        <Textarea
          value={question.text}
          onChange={e => update({ text: e.target.value })}
          placeholder="Enter your question..."
          className="bg-secondary/50 border-border min-h-[60px] resize-none"
        />
      </div>

      {/* Answer Type for Round 6 */}
      {isRound6 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Answer Type</Label>
          <Select value={question.type} onValueChange={(v: 'text' | 'mcq') => update({ type: v })}>
            <SelectTrigger className="bg-secondary/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text Input</SelectItem>
              <SelectItem value="mcq">Multiple Choice</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* MCQ Options */}
      {question.type === 'mcq' && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Options (mark the correct one as the Answer below)</Label>
          <div className="grid grid-cols-2 gap-2">
            {(question.options || ['', '', '', '']).map((opt, i) => (
              <Input
                key={i}
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="bg-secondary/50 border-border text-sm"
              />
            ))}
          </div>
        </div>
      )}

      {/* Answer */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Correct Answer</Label>
        <Input
          value={question.answer}
          onChange={e => update({ answer: e.target.value })}
          placeholder="Enter the correct answer..."
          className="bg-secondary/50 border-border"
        />
      </div>

      {/* Media Upload Section */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Media (Optional)</Label>
        
        {/* Upload Control */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <Button 
              type="button" 
              variant="secondary" 
              size="sm" 
              className="pointer-events-none" // Events pass through to input
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Image className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Choose File'}
            </Button>
          </div>
          
          {/* Fallback URL input (if they still want to paste links) */}
          <Input
            value={question.mediaUrl || ''}
            onChange={e => update({ mediaUrl: e.target.value })}
            placeholder="...or paste a URL here"
            className="bg-secondary/50 border-border text-xs flex-1 h-9"
            disabled={uploading}
          />
        </div>

        {/* Preview */}
        {question.mediaUrl && (
          <div className="mt-2 rounded-lg overflow-hidden border border-border bg-black/20 relative group">
            <div className="aspect-video w-full flex items-center justify-center">
              {/* Basic image preview - you can expand this for video/audio later */}
              <img
                src={question.mediaUrl}
                alt="Preview"
                className="max-h-48 object-contain"
                onError={(e) => {
                  // Fallback for non-image media (like audio/video)
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Show icon if image fails (likely audio/video) */}
              <div className="absolute inset-0 flex items-center justify-center -z-10 text-muted-foreground text-xs">
                Media File Loaded
              </div>
            </div>
            
            {/* Remove button */}
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => update({ mediaUrl: '' })}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}