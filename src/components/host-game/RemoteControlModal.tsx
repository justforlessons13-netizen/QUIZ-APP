import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

interface RemoteControlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameCode?: string;
  sessionId: string;
  packId?: string;
}

export function RemoteControlModal({ open, onOpenChange, sessionId, packId }: RemoteControlModalProps) {
  // The host remote uses the same session id and needs the pack id
  const remoteUrl = `${window.location.origin}/host/game?session=${sessionId}&pack=${packId || ''}&remote=true`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[100]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#14161c] border border-white/10 text-white p-7 rounded-2xl shadow-2xl z-[101] w-[320px] flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full">
            <Dialog.Title className="font-bungee text-[15px] uppercase tracking-wide text-white">
              Remote control
            </Dialog.Title>
            <Dialog.Close className="w-[30px] h-[30px] rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white" />
            </Dialog.Close>
          </div>

          <div className="bg-white p-2.5 rounded-[14px]" style={{ boxShadow: `0 0 30px ${alpha(theme.color1, 0.15)}` }}>
            <QRCodeSVG value={remoteUrl} size={150} />
          </div>

          <div className="text-center text-white/50 text-[11px] uppercase tracking-widest">
            Scan to drive this screen from your phone
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
