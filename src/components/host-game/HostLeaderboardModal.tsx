// Replace the entire HostLeaderboardModal component in
// src/components/host-game/HostLeaderboardModal.tsx

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { LiveTeam } from '@/types/live-game';

interface HostLeaderboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: LiveTeam[];
  currentRound: number;
  onAdjustScore: (teamId: string, pointDelta: number, specificRoundIndex?: number) => void;
}

export function HostLeaderboardModal({
  open,
  onOpenChange,
  teams,
  currentRound,
  onAdjustScore,
}: HostLeaderboardModalProps) {
  // Snapshot the row ORDER once when the modal opens and never change it.
  // This prevents rows from jumping under your cursor as scores change.
  const [rowOrder, setRowOrder] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setRowOrder(
        [...teams]
          .sort((a, b) => b.score - a.score)
          .map(t => t.id)
      );
    }
    // Intentionally NOT re-running when teams changes — we want the order frozen.
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive display list from the frozen order, but pull live score/roundScores
  // from the teams prop so numbers update without rows moving.
  const displayTeams = rowOrder
    .map(id => teams.find(t => t.id === id))
    .filter((t): t is LiveTeam => !!t);

  // Live rank badge derived from current scores (updates in real time).
  const liveRanks = React.useMemo(() => {
    const sorted = [...teams].sort((a, b) => b.score - a.score);
    const map = new Map<string, number>();
    sorted.forEach((t, i) => map.set(t.id, i + 1));
    return map;
  }, [teams]);

  const maxRounds = 6;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#2d2b4a] text-white py-10 px-8 rounded-2xl shadow-2xl z-[101] w-full max-w-4xl flex flex-col items-center border border-white/5">

          <Dialog.Close className="absolute top-4 right-4 p-1 rounded-md transition-colors text-white/50 hover:bg-black/20 hover:text-white">
            <X className="w-5 h-5" />
          </Dialog.Close>

          <Dialog.Title className="flex flex-col items-center gap-1 w-full text-center mb-8">
            <span className="text-[32px] font-bungee tracking-widest text-[#adbbff] uppercase drop-shadow-[0_0_12px_rgba(173,187,255,0.3)]">
              Leaderboard
            </span>
            <Dialog.Description className="text-white/60 font-sugo tracking-widest text-[13px] uppercase mt-1">
              {teams.length} players — rows stay fixed while you edit
            </Dialog.Description>
          </Dialog.Title>

          <div className="w-full flex flex-col gap-3 max-w-[850px] mx-auto">
            {displayTeams.map(team => {
              const rank = liveRanks.get(team.id) ?? 0;

              return (
                <div key={team.id} className="w-full flex items-center justify-center gap-[10px]">

                  {/* Live rank badge */}
                  <div className="w-6 h-6 rounded-full bg-[#1c1b33] flex items-center justify-center font-bungee text-white/50 text-[11px] flex-shrink-0 pt-0.5">
                    {rank}
                  </div>

                  {/* Team name */}
                  <div className="flex items-center bg-[#cccccc] text-[#120524] rounded-[10px] px-3 w-[260px] h-[46px] shadow-sm flex-shrink-0">
                    <span className="text-[22px] mr-2.5 leading-none">{team.emoji}</span>
                    <span className="font-bungee tracking-wider truncate text-[17px] pt-1 drop-shadow-sm">
                      {team.name}
                    </span>
                  </div>

                  {/* Round score pillars */}
                  {Array.from({ length: maxRounds }).map((_, rIdx) => {
                    const rNum = rIdx + 1;
                    const isPlayedOrCurrent = rNum <= currentRound;

                    if (isPlayedOrCurrent) {
                      const roundScore = team.roundScores[rIdx] ?? 0;
                      return (
                        <div
                          key={rIdx}
                          className="relative flex items-center bg-[#e0e0e0] text-[#120524] rounded-[10px] w-[66px] h-[46px] shadow-sm flex-shrink-0"
                        >
                          <div className="font-sugo text-[22px] flex-1 text-center pt-1 pl-1.5 tabular-nums">
                            {roundScore}
                          </div>

                          <div className="mr-1.5 flex flex-col items-center justify-center w-[16px] h-[24px] bg-white/40 border border-black/10 rounded-[4px] shadow-sm overflow-hidden flex-shrink-0">
                            <button
                              onClick={() => onAdjustScore(team.id, 1, rIdx)}
                              className="w-full flex-1 flex items-center justify-center hover:bg-black/10 text-[#120524]/60 hover:text-[#120524] transition-colors"
                            >
                              <ChevronUp className="w-2.5 h-2.5" strokeWidth={3} />
                            </button>
                            <div className="w-full h-[1px] bg-black/10 min-h-[1px]" />
                            <button
                              onClick={() => onAdjustScore(team.id, -1, rIdx)}
                              className="w-full flex-1 flex items-center justify-center hover:bg-black/10 text-[#120524]/60 hover:text-[#120524] transition-colors"
                            >
                              <ChevronDown className="w-2.5 h-2.5" strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Future round placeholder
                    return (
                      <div
                        key={rIdx}
                        className="flex items-center justify-center bg-[#a6a6a6] text-[#120524]/50 rounded-[10px] w-[54px] h-[46px] shadow-inner flex-shrink-0"
                      >
                        <span className="font-sugo text-[20px] pt-1 tracking-widest uppercase">
                          R{rNum}
                        </span>
                      </div>
                    );
                  })}

                  {/* Total */}
                  <div className="flex items-center justify-center bg-[#e0e0e0] text-[#120524] rounded-[10px] w-[56px] h-[46px] shadow-sm ml-1 flex-shrink-0">
                    <span className="font-sugo text-[22px] pt-1 tabular-nums">{team.score}</span>
                  </div>

                </div>
              );
            })}
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}