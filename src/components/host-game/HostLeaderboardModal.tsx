import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { LiveTeam } from '@/types/live-game';
import { gameThemes } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

const TEAMS_PER_PAGE = 5;

interface HostLeaderboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: LiveTeam[];
  currentRound: number;
  totalRounds: number;
  onAdjustScore: (teamId: string, pointDelta: number, specificRoundIndex?: number) => void;
}

export function HostLeaderboardModal({
  open,
  onOpenChange,
  teams,
  currentRound,
  totalRounds,
  onAdjustScore,
}: HostLeaderboardModalProps) {
  // Snapshot the row ORDER once when the modal opens and never change it.
  // This prevents rows from jumping under your cursor as scores change.
  const [rowOrder, setRowOrder] = React.useState<string[]>([]);
  const [selectedRound, setSelectedRound] = React.useState(1);
  const [page, setPage] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setRowOrder([...teams].sort((a, b) => b.score - a.score).map((t) => t.id));
      setSelectedRound(Math.min(currentRound, totalRounds));
      setPage(0);
    }
    // Intentionally NOT re-running when teams changes — we want the order frozen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    setPage(0);
  }, [selectedRound]);

  // Derive display list from the frozen order, but pull live score/roundScores
  // from the teams prop so numbers update without rows moving.
  const displayTeams = rowOrder
    .map((id) => teams.find((t) => t.id === id))
    .filter((t): t is LiveTeam => !!t);

  const totalPages = Math.max(1, Math.ceil(displayTeams.length / TEAMS_PER_PAGE));
  const pageTeams = displayTeams.slice(page * TEAMS_PER_PAGE, page * TEAMS_PER_PAGE + TEAMS_PER_PAGE);

  const isFinalRound = selectedRound === totalRounds;
  const roundIndex = selectedRound - 1;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[100]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#14161c] border border-white/10 text-white p-7 rounded-2xl shadow-2xl z-[101] w-full max-w-[440px] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-bungee text-[16px] uppercase tracking-wide text-white">
              Edit scores
            </Dialog.Title>
            <Dialog.Close className="w-[30px] h-[30px] rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white/70 hover:text-white" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Adjust each team's score for a specific round.
          </Dialog.Description>

          {/* Round tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => {
              const active = r === selectedRound;
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRound(r)}
                  className="flex-1 min-w-[44px] py-2 rounded-lg border text-xs font-bungee transition-colors"
                  style={{
                    background: active ? theme.color1 : 'rgba(255,255,255,0.06)',
                    color: active ? theme.onColor1 : 'rgba(255,255,255,0.7)',
                    borderColor: active ? theme.color1 : 'rgba(255,255,255,0.12)',
                  }}
                >
                  R{r}
                </button>
              );
            })}
          </div>

          {/* Team list for the selected round */}
          <div className="flex flex-col gap-2.5">
            {pageTeams.map((team) => {
              const roundScore = team.roundScores[roundIndex] ?? 0;
              return (
                <div
                  key={team.id}
                  className="flex items-center gap-2.5 bg-white/[0.05] rounded-[10px] px-3.5 py-2.5"
                >
                  <span className="text-xl">{team.emoji}</span>
                  <span className="flex-1 font-bungee tracking-wide text-sm truncate text-white">
                    {team.name}
                  </span>
                  <span
                    className="text-[15px] font-bold tabular-nums min-w-[44px] text-center"
                    style={{ color: theme.color1 }}
                  >
                    {roundScore}
                  </span>
                  <div className="flex gap-1">
                    {isFinalRound && (
                      <ScoreBumpButton onClick={() => onAdjustScore(team.id, -2, roundIndex)}>−2</ScoreBumpButton>
                    )}
                    {!isFinalRound && (
                      <ScoreBumpButton onClick={() => onAdjustScore(team.id, -1, roundIndex)}>−1</ScoreBumpButton>
                    )}
                    <ScoreBumpButton onClick={() => onAdjustScore(team.id, 1, roundIndex)}>+1</ScoreBumpButton>
                    {isFinalRound && (
                      <ScoreBumpButton onClick={() => onAdjustScore(team.id, 2, roundIndex)}>+2</ScoreBumpButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {displayTeams.length > TEAMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-[34px] h-[34px] rounded-lg bg-white/[0.08] border border-white/[0.15] flex items-center justify-center disabled:opacity-30 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-white/60">
                Page {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-[34px] h-[34px] rounded-lg bg-white/[0.08] border border-white/[0.15] flex items-center justify-center disabled:opacity-30 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ScoreBumpButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-[26px] h-[26px] rounded-md bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.16] text-[11px] font-bold flex items-center justify-center transition-colors"
    >
      {children}
    </button>
  );
}
