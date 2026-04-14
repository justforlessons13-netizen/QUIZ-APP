import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface RemoteControlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameCode?: string;
  sessionId: string;
  packId?: string;
}

export function RemoteControlModal({ open, onOpenChange, gameCode, sessionId, packId }: RemoteControlModalProps) {
  const [copied, setCopied] = useState(false);

  // Fallback to full URL if gameCode isn't available to construct a short link
  // Fallback to full URL if gameCode isn't available to construct a short link
  // The host remote uses the same session id and needs the pack id
  const remoteUrl = `${window.location.origin}/host/game?session=${sessionId}&pack=${packId || ''}&remote=true`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(remoteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#2c2b48] text-white p-8 rounded-2xl shadow-2xl z-[101] w-full max-w-sm flex flex-col items-center gap-6">
          <Dialog.Close className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 rounded-md transition-colors">
            <X className="w-5 h-5 text-white/70 hover:text-white" />
          </Dialog.Close>

          <Dialog.Title className="sr-only">Remote Control</Dialog.Title>
          <Dialog.Description className="text-center text-[#adbbff] font-sugo tracking-wider text-xl leading-snug mt-2">
            Scan this code or copy the link to use another device as a remote controller:
          </Dialog.Description>

          <div className="bg-white p-4 rounded-xl shadow-inner">
            <QRCodeSVG value={remoteUrl} size={180} />
          </div>

          <span className="text-white/60 font-sugo tracking-widest uppercase text-sm">
            No login needed
          </span>

          <button
            onClick={copyToClipboard}
            className="w-full bg-[#6a35ff] hover:bg-[#8554ff] active:scale-[0.98] transition-all text-white font-sugo tracking-widest text-lg py-3 rounded-xl flex items-center justify-center gap-3 shadow-lg"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy link
              </>
            )}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
