// Full-page "remote" screen — what a host's phone shows after scanning the QR code from
// RemoteControlModal.tsx. Phase-aware (a dedicated Lobby screen before the game starts, since
// the old version had no way to start a game from the remote at all) and split into two small
// tabs once live — Controls (timer/next) and Tools (scores/skip/lottery/confetti/end) — instead
// of one page with every button visible at once. Buttons are intentionally compact, not big
// touch-target tiles, per the reference this was modeled on (Canva's presenter remote).
import { useState } from 'react';
import { Play, Pause, Pencil, SkipForward, Ticket, PartyPopper, Square, ChevronDown, Users, Wand2 } from 'lucide-react';
import { Question } from '@/types/game';
import { HostGamePhase, LiveTeam } from '@/types/live-game';

interface RemoteControlPanelProps {
  phase: HostGamePhase;
  teams: LiveTeam[];
  onStartGame: () => void;
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

const NEXT_LABELS: Partial<Record<HostGamePhase, string>> = {
  'round-rules': 'Start round ▶',
  question: 'Collect answers ▶',
};

function RemoteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full sm:w-[360px] sm:rounded-3xl rounded-3xl bg-background border border-border flex flex-col overflow-hidden max-h-[90vh] my-4">
        {children}
      </div>
    </div>
  );
}

function RemoteHeader() {
  return (
    <div className="px-5 pt-4 pb-3 flex items-center justify-between flex-shrink-0 border-b border-border">
      <span className="font-bungee text-sm text-foreground">Remote</span>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Connected</span>
      </div>
    </div>
  );
}

export function RemoteControlPanel({
  phase, teams, onStartGame,
  question, round, answeredCount, totalTeams, displayTime, isTimerRunning, canControlTimer,
  onStartTimer, onPauseTimer, onNext, canAdvance, onOpenScores, onSkipQuestion, canSkip,
  onOpenLottery, onReplayConfetti, onEndGame,
}: RemoteControlPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'controls' | 'tools'>('controls');

  // ── Lobby: the game hasn't started yet — nothing to control but starting it. ──
  if (phase === 'team-setup') {
    const canStart = teams.length >= 2;
    return (
      <RemoteShell>
        <RemoteHeader />
        <div className="px-5 pt-4 pb-2 flex items-center gap-2 text-muted-foreground flex-shrink-0">
          <Users className="w-3.5 h-3.5" />
          <span className="text-[11px] uppercase tracking-wider">{teams.length} team{teams.length === 1 ? '' : 's'} waiting</span>
        </div>
        <div className="flex-1 overflow-auto px-5 py-2 flex flex-wrap content-start gap-1.5 min-h-[80px]">
          {teams.length === 0 && (
            <p className="text-xs text-muted-foreground/60 py-4">Waiting for teams to join…</p>
          )}
          {teams.map((t) => (
            <span key={t.id} className="flex items-center gap-1 bg-foreground/5 border border-foreground/10 rounded-full pl-1.5 pr-2.5 py-1 text-[11px] text-foreground">
              <span>{t.emoji}</span>{t.name}
            </span>
          ))}
        </div>
        <div className="px-5 pb-5 pt-2 flex-shrink-0">
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground border-none rounded-lg py-2.5 font-bungee text-[11px] uppercase hover:brightness-110 transition-[filter] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5" />
            Start game
          </button>
          {!canStart && (
            <p className="text-center text-[10px] text-muted-foreground/60 mt-2">Need at least 2 teams to start</p>
          )}
        </div>
      </RemoteShell>
    );
  }

  // ── Live game: two small tabs instead of every control on one screen. ──
  const secondaryControls = [
    { key: 'scores', label: 'Scores', icon: Pencil, onClick: onOpenScores },
    { key: 'skip', label: 'Skip Q', icon: SkipForward, onClick: onSkipQuestion, disabled: !canSkip },
    { key: 'lottery', label: 'Lottery', icon: Ticket, onClick: onOpenLottery, accent: true },
    { key: 'confetti', label: 'Confetti', icon: PartyPopper, onClick: onReplayConfetti, gold: true },
  ];
  const nextLabel = NEXT_LABELS[phase] ?? 'Next ▶';

  return (
    <RemoteShell>
      <RemoteHeader />

      <div className="mx-5 mt-3 bg-primary/10 border border-primary/30 rounded-xl overflow-hidden flex-shrink-0">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full bg-transparent border-none px-3.5 py-2.5 flex items-center justify-between text-left"
        >
          <div>
            <div className="text-[9px] text-primary uppercase tracking-wider mb-0.5">
              Round {round} · Q{question?.id ?? '—'}
            </div>
            <div className="text-[11px] text-foreground">{answeredCount} / {totalTeams} answered</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bungee text-[13px] text-primary">
              {String(Math.floor(displayTime / 60)).padStart(2, '0')}:{String(displayTime % 60).padStart(2, '0')}
            </span>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {expanded && (
          <div className="px-3.5 pb-3.5 pt-2 border-t border-primary/20">
            <div className="text-[11px] text-muted-foreground leading-relaxed mb-2">
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

      {/* Tab switcher */}
      <div className="mx-5 mt-3 flex gap-1 bg-foreground/5 rounded-lg p-1 flex-shrink-0">
        <button
          onClick={() => setTab('controls')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-bungee uppercase transition-colors ${
            tab === 'controls' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          <Wand2 className="w-3 h-3" /> Controls
        </button>
        <button
          onClick={() => setTab('tools')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-bungee uppercase transition-colors ${
            tab === 'tools' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          }`}
        >
          <Pencil className="w-3 h-3" /> Tools
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 pt-3 pb-5">
        {tab === 'controls' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={isTimerRunning ? onPauseTimer : onStartTimer}
              disabled={!canControlTimer}
              className="flex items-center justify-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg py-2 font-bungee text-[10px] uppercase hover:brightness-110 transition-[filter] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isTimerRunning ? 'Pause' : 'Start timer'}
            </button>
            <button
              onClick={onNext}
              disabled={!canAdvance}
              className="bg-primary text-primary-foreground border-none rounded-lg py-2 font-bungee text-[10px] uppercase hover:brightness-110 transition-[filter] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {nextLabel}
            </button>
            {!canAdvance && phase !== 'question' && (
              <p className="col-span-2 text-center text-[10px] text-muted-foreground/60 pt-1">
                Follow the main screen — nothing to advance here yet.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {secondaryControls.map(({ key, label, icon: Icon, onClick, accent, gold, disabled }) => (
              <button
                key={key}
                onClick={onClick}
                disabled={disabled}
                className={`flex flex-col items-center gap-1 rounded-lg py-2 px-1 text-[9px] border transition-[filter] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                  accent
                    ? 'bg-primary/15 text-primary border-primary/40'
                    : gold
                    ? 'bg-amber-400/15 text-amber-400 border-amber-400/40'
                    : 'bg-foreground/5 text-foreground border-foreground/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
            <button
              onClick={onEndGame}
              className="col-span-3 flex items-center justify-center gap-1.5 bg-destructive/15 text-destructive border border-destructive/40 rounded-lg py-2 font-bungee text-[10px] uppercase hover:brightness-110 transition-[filter]"
            >
              <Square className="w-3 h-3" />
              End game
            </button>
          </div>
        )}
      </div>
    </RemoteShell>
  );
}
