// Full-page "remote" screen — what a host's phone shows after scanning the QR code from
// RemoteControlModal.tsx. Phase-aware (a dedicated Lobby screen before the game starts) and
// split into two small tabs once live — Controls (timer/next) and Tools (scores/skip/lottery/
// confetti/end) — instead of one page with every button visible at once. Game Rules and Round
// Rules get their own Previous/Next steppers here too, mirroring the main screen's carousel,
// instead of one "Next" that jumps straight past every rule card to the next phase.
import { useState } from 'react';
import { Play, Pause, Pencil, SkipForward, Ticket, PartyPopper, Square, ChevronDown, ChevronLeft, ChevronRight, Users, Wand2 } from 'lucide-react';
import { Question } from '@/types/game';
import { HostGamePhase, LiveTeam } from '@/types/live-game';
import { GamePhaseBackground } from '@/components/layout/GamePhaseBackground';
import { GAME_RULES } from './GameRulesDisplay';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

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
  // Game Rules / Round Rules pagination — synced with the main screen via the same Firestore
  // fields, so stepping through on the remote moves the carousel on the main screen too.
  currentRuleIndex: number;
  onSetRuleIndex: (index: number) => void;
  roundRulesIndex: number;
  onSetRoundRulesIndex: (index: number) => void;
  roundRulesText?: string;
}

function RemoteHeader() {
  return (
    <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
      <span className="font-bungee text-sm uppercase tracking-wide" style={{ color: theme.color1 }}>Remote</span>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(70% 0.01 195)' }}>Connected</span>
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-bungee text-[11px] uppercase tracking-wide transition-[filter] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ background: theme.color1, color: theme.onColor1 }}
    >
      {children}
    </button>
  );
}

function Stepper({ index, total, onPrev, onNext }: { index: number; total: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={onPrev}
        disabled={index === 0}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        style={{ border: `1px solid ${alpha(theme.color1, 0.35)}`, background: alpha(theme.color1, 0.1), color: theme.color1 }}
        aria-label="Previous"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-[11px] uppercase tracking-wider" style={{ color: 'oklch(70% 0.01 195)' }}>
        {index + 1} / {total}
      </span>
      <button
        onClick={onNext}
        disabled={index === total - 1}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        style={{ border: `1px solid ${alpha(theme.color1, 0.35)}`, background: alpha(theme.color1, 0.1), color: theme.color1 }}
        aria-label="Next"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export function RemoteControlPanel({
  phase, teams, onStartGame,
  question, round, answeredCount, totalTeams, displayTime, isTimerRunning, canControlTimer,
  onStartTimer, onPauseTimer, onNext, canAdvance, onOpenScores, onSkipQuestion, canSkip,
  onOpenLottery, onReplayConfetti, onEndGame,
  currentRuleIndex, onSetRuleIndex, roundRulesIndex, onSetRoundRulesIndex, roundRulesText,
}: RemoteControlPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'controls' | 'tools'>('controls');

  const shell = (content: React.ReactNode) => (
    <div className="relative min-h-screen w-full flex flex-col">
      <GamePhaseBackground phase={phase} />
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-[420px] mx-auto">
        {content}
      </div>
    </div>
  );

  // ── Lobby: the game hasn't started yet — nothing to control but starting it. ──
  if (phase === 'team-setup') {
    const canStart = teams.length >= 2;
    return shell(
      <>
        <RemoteHeader />
        <div className="px-5 pt-6 pb-2 flex items-center gap-2 flex-shrink-0" style={{ color: 'oklch(70% 0.01 195)' }}>
          <Users className="w-3.5 h-3.5" />
          <span className="text-[11px] uppercase tracking-wider">{teams.length} team{teams.length === 1 ? '' : 's'} waiting</span>
        </div>
        <div className="flex-1 px-5 py-3 flex flex-wrap content-start gap-1.5 min-h-[100px]">
          {teams.length === 0 && (
            <p className="text-xs py-4" style={{ color: 'oklch(60% 0.01 195)' }}>Waiting for teams to join…</p>
          )}
          {teams.map((t) => (
            <span
              key={t.id}
              className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1 text-[11px] text-white"
              style={{ background: alpha(theme.color1, 0.12), border: `1px solid ${alpha(theme.color1, 0.25)}` }}
            >
              <span>{t.emoji}</span>{t.name}
            </span>
          ))}
        </div>
        <div className="px-5 pb-8 pt-2 flex-shrink-0">
          <PrimaryButton onClick={onStartGame} disabled={!canStart}>
            <Play className="w-3.5 h-3.5" /> Start game
          </PrimaryButton>
          {!canStart && (
            <p className="text-center text-[10px] mt-2" style={{ color: 'oklch(60% 0.01 195)' }}>Need at least 2 teams to start</p>
          )}
        </div>
      </>
    );
  }

  // ── Live game: two small tabs instead of every control on one screen. ──
  const secondaryControls = [
    { key: 'scores', label: 'Scores', icon: Pencil, onClick: onOpenScores },
    { key: 'skip', label: 'Skip Q', icon: SkipForward, onClick: onSkipQuestion, disabled: !canSkip },
    { key: 'lottery', label: 'Lottery', icon: Ticket, onClick: onOpenLottery, accent: true },
    { key: 'confetti', label: 'Confetti', icon: PartyPopper, onClick: onReplayConfetti, gold: true },
  ];

  const roundRulesList = (roundRulesText && roundRulesText.trim().length > 0
    ? roundRulesText.split('\n').map((r) => r.trim()).filter((r) => r !== '')
    : ['NO PHONES ALLOWED', 'DO NOT SHOUT', 'WRITE CLEARLY']);
  const roundRulesIdx = Math.min(roundRulesIndex, roundRulesList.length - 1);

  return shell(
    <>
      <RemoteHeader />

      <div className="mx-5 mt-1 rounded-xl overflow-hidden flex-shrink-0" style={{ background: alpha(theme.color1, 0.08), border: `1px solid ${alpha(theme.color1, 0.25)}` }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full bg-transparent border-none px-3.5 py-2.5 flex items-center justify-between text-left"
        >
          <div>
            <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: theme.color1 }}>
              Round {round} · Q{question?.id ?? '—'}
            </div>
            <div className="text-[11px] text-white">{answeredCount} / {totalTeams} answered</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bungee text-[13px]" style={{ color: theme.color1 }}>
              {String(Math.floor(displayTime / 60)).padStart(2, '0')}:{String(displayTime % 60).padStart(2, '0')}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: 'oklch(60% 0.01 195)' }} />
          </div>
        </button>
        {expanded && (
          <div className="px-3.5 pb-3.5 pt-2" style={{ borderTop: `1px solid ${alpha(theme.color1, 0.15)}` }}>
            <div className="text-[11px] leading-relaxed mb-2" style={{ color: 'oklch(75% 0.01 195)' }}>
              {question?.text ?? 'No question loaded'}
            </div>
            {question?.mediaUrl && (
              <div className="w-full aspect-video rounded-lg overflow-hidden" style={{ background: alpha(theme.color1, 0.06) }}>
                <img src={question.mediaUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="mx-5 mt-3 flex gap-1 rounded-lg p-1 flex-shrink-0" style={{ background: alpha(theme.color1, 0.08) }}>
        <button
          onClick={() => setTab('controls')}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-bungee uppercase transition-colors"
          style={tab === 'controls' ? { background: theme.color1, color: theme.onColor1 } : { color: 'oklch(65% 0.01 195)' }}
        >
          <Wand2 className="w-3 h-3" /> Controls
        </button>
        <button
          onClick={() => setTab('tools')}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-bungee uppercase transition-colors"
          style={tab === 'tools' ? { background: theme.color1, color: theme.onColor1 } : { color: 'oklch(65% 0.01 195)' }}
        >
          <Pencil className="w-3 h-3" /> Tools
        </button>
      </div>

      <div className="flex-1 px-5 pt-4 pb-8">
        {tab === 'controls' ? (
          phase === 'game-rules' ? (
            <div className="flex flex-col gap-3">
              <div className="text-center">
                <div className="text-[28px] leading-none mb-1.5">{GAME_RULES[currentRuleIndex]?.emoji}</div>
                <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: theme.color1 }}>
                  {GAME_RULES[currentRuleIndex]?.title}
                </div>
                <p className="text-[12px] leading-snug" style={{ color: 'oklch(78% 0.01 195)' }}>
                  {GAME_RULES[currentRuleIndex]?.description}
                </p>
              </div>
              <Stepper
                index={currentRuleIndex}
                total={GAME_RULES.length}
                onPrev={() => onSetRuleIndex(Math.max(0, currentRuleIndex - 1))}
                onNext={() => onSetRuleIndex(Math.min(GAME_RULES.length - 1, currentRuleIndex + 1))}
              />
              <PrimaryButton onClick={onNext} disabled={currentRuleIndex !== GAME_RULES.length - 1}>
                Let's go ▶
              </PrimaryButton>
            </div>
          ) : phase === 'round-rules' ? (
            <div className="flex flex-col gap-3">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'oklch(60% 0.01 195)' }}>
                  Rule {roundRulesIdx + 1} of {roundRulesList.length}
                </div>
                <p className="text-[16px] font-semibold" style={{ color: 'oklch(90% 0.005 195)' }}>
                  {roundRulesList[roundRulesIdx]}
                </p>
              </div>
              <Stepper
                index={roundRulesIdx}
                total={roundRulesList.length}
                onPrev={() => onSetRoundRulesIndex(Math.max(0, roundRulesIdx - 1))}
                onNext={() => onSetRoundRulesIndex(Math.min(roundRulesList.length - 1, roundRulesIdx + 1))}
              />
              <PrimaryButton onClick={onNext}>▶ Start round</PrimaryButton>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={isTimerRunning ? onPauseTimer : onStartTimer}
                disabled={!canControlTimer}
                className="flex items-center justify-center gap-1.5 rounded-lg py-2 font-bungee text-[10px] uppercase hover:brightness-110 transition-[filter] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: 'oklch(60% 0.14 155 / 0.18)', color: 'oklch(75% 0.15 155)', border: '1px solid oklch(60% 0.14 155 / 0.4)' }}
              >
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isTimerRunning ? 'Pause' : 'Start timer'}
              </button>
              <button
                onClick={onNext}
                disabled={!canAdvance}
                className="rounded-lg py-2 font-bungee text-[10px] uppercase hover:brightness-110 transition-[filter] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: theme.color1, color: theme.onColor1 }}
              >
                {phase === 'question' ? 'Collect answers ▶' : 'Next ▶'}
              </button>
              {!canAdvance && phase !== 'question' && (
                <p className="col-span-2 text-center text-[10px] pt-1" style={{ color: 'oklch(60% 0.01 195)' }}>
                  Follow the main screen — nothing to advance here yet.
                </p>
              )}
            </div>
          )
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {secondaryControls.map(({ key, label, icon: Icon, onClick, accent, gold, disabled }) => (
              <button
                key={key}
                onClick={onClick}
                disabled={disabled}
                className="flex flex-col items-center gap-1 rounded-lg py-2 px-1 text-[9px] transition-[filter] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
                style={
                  accent
                    ? { background: alpha(theme.color1, 0.12), color: theme.color1, border: `1px solid ${alpha(theme.color1, 0.35)}` }
                    : gold
                    ? { background: 'oklch(75% 0.15 85 / 0.15)', color: 'oklch(75% 0.15 85)', border: '1px solid oklch(75% 0.15 85 / 0.4)' }
                    : { background: 'rgba(255,255,255,.05)', color: '#fff', border: '1px solid rgba(255,255,255,.1)' }
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
            <button
              onClick={onEndGame}
              className="col-span-3 flex items-center justify-center gap-1.5 rounded-lg py-2 font-bungee text-[10px] uppercase hover:brightness-110 transition-[filter]"
              style={{ background: 'oklch(58% 0.2 25 / 0.15)', color: 'oklch(65% 0.2 25)', border: '1px solid oklch(58% 0.2 25 / 0.4)' }}
            >
              <Square className="w-3 h-3" />
              End game
            </button>
          </div>
        )}
      </div>
    </>
  );
}
