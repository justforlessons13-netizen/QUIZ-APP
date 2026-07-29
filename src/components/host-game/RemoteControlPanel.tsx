// Full-page "remote" screen — what a host's phone shows after scanning the QR code
// from RemoteControlModal.tsx. Implements Remote Control Options.dc.html mockup 2A:
// accordion question card, split Start-timer / Next controls, icon-grid secondary
// controls, End game full-width row.
import { useState } from 'react';
import { Play, Pause, Pencil, SkipForward, Ticket, PartyPopper, Square, ChevronDown } from 'lucide-react';
import { Question } from '@/types/game';

interface RemoteControlPanelProps {
  question: Question | null;
  round: number;
  answeredCount: number;
  totalTeams: number;
  displayTime: number;
  isTimerRunning: boolean;
  canControlTimer: boolean;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onNext: () => void;
  canAdvance: boolean;
  onOpenScores: () => void;
  onSkipQuestion: () => void;
  canSkip: boolean;
  onOpenLottery: () => void;
  onReplayConfetti: () => void;
  onEndGame: () => void;
}

export function RemoteControlPanel({
  question, round, answeredCount, totalTeams, displayTime, isTimerRunning, canControlTimer,
  onStartTimer, onPauseTimer, onNext, canAdvance, onOpenScores, onSkipQuestion, canSkip,
  onOpenLottery, onReplayConfetti, onEndGame,
}: RemoteControlPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const secondaryControls = [
    { key: 'scores', label: 'Scores', icon: Pencil, onClick: onOpenScores },
    { key: 'skip', label: 'Skip Q', icon: SkipForward, onClick: onSkipQuestion, disabled: !canSkip },
    { key: 'lottery', label: 'Lottery', icon: Ticket, onClick: onOpenLottery, accent: true },
    { key: 'confetti', label: 'Confetti', icon: PartyPopper, onClick: onReplayConfetti, gold: true },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full sm:w-[380px] sm:rounded-3xl rounded-3xl bg-background border border-border flex flex-col overflow-hidden max-h-[90vh] my-4">
        <div className="px-5 pt-4 flex items-center justify-between flex-shrink-0">
          <span className="font-bungee text-sm text-foreground">Remote</span>
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Connected</span>
          </div>
        </div>

        <div className="mx-5 mt-3.5 bg-primary/10 border border-primary/30 rounded-2xl overflow-hidden flex-shrink-0">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full bg-transparent border-none px-4 py-3.5 flex items-center justify-between text-left"
          >
            <div>
              <div className="text-[10px] text-primary uppercase tracking-wider mb-1">
                Now showing · Round {round} · Q{question?.id ?? '—'}
              </div>
              <div className="text-xs text-foreground">{answeredCount} / {totalTeams} answered</div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-bungee text-[15px] text-primary">
                {String(Math.floor(displayTime / 60)).padStart(2, '0')}:{String(displayTime % 60).padStart(2, '0')}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {expanded && (
            <div className="px-4 pb-4 pt-2.5 border-t border-primary/20">
              <div className="text-xs text-muted-foreground leading-relaxed mb-2">
                {question?.text ?? 'No question loaded'}
              </div>
              {question?.mediaUrl && (
                <div className="w-full aspect-video rounded-lg bg-foreground/5 flex items-center justify-center text-muted-foreground text-[11px] overflow-hidden">
                  <img src={question.mediaUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 pt-3.5 flex-shrink-0">
          <button
            onClick={isTimerRunning ? onPauseTimer : onStartTimer}
            disabled={!canControlTimer}
            className="flex items-center justify-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl py-3 font-bungee text-[11px] uppercase hover:brightness-110 transition-[filter] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isTimerRunning ? 'Pause timer' : 'Start timer'}
          </button>
          <button
            onClick={onNext}
            disabled={!canAdvance}
            className="bg-primary text-primary-foreground border-none rounded-xl py-3 font-bungee text-[11px] uppercase hover:brightness-110 transition-[filter] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next ▶
          </button>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-2 px-5 pt-3 pb-5 overflow-auto content-start">
          {secondaryControls.map(({ key, label, icon: Icon, onClick, accent, gold, disabled }) => (
            <button
              key={key}
              onClick={onClick}
              disabled={disabled}
              className={`flex flex-col items-center gap-1 rounded-xl py-2.5 px-1.5 text-[10px] border transition-[filter] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                accent
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : gold
                  ? 'bg-amber-400/15 text-amber-400 border-amber-400/40'
                  : 'bg-foreground/5 text-foreground border-foreground/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          <button
            onClick={onEndGame}
            className="col-span-3 flex items-center justify-center gap-1.5 bg-destructive/15 text-destructive border border-destructive/40 rounded-xl py-3 font-bungee text-[10px] uppercase hover:brightness-110 transition-[filter]"
          >
            <Square className="w-3.5 h-3.5" />
            End game
          </button>
        </div>
      </div>
    </div>
  );
}
