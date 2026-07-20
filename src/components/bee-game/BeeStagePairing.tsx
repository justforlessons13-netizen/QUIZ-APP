import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRight, Tablet } from 'lucide-react';

interface BeeStagePairingProps {
  gameCode: string;
  onContinue: () => void;
}

export function BeeStagePairing({ gameCode, onContinue }: BeeStagePairingProps) {
  const codeChars = gameCode.padEnd(4, ' ').split('');
  const stageUrl = `${window.location.origin}/bee/stage?code=${gameCode}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto flex flex-col items-center gap-6 py-10 px-4 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Tablet className="w-6 h-6 text-primary" />
      </div>

      <div>
        <h1 className="text-2xl font-bungee text-white uppercase tracking-wide">Pair the Stage Device</h1>
        <p className="text-muted-foreground text-sm mt-1 font-sugo uppercase tracking-widest">
          Hand this to whoever's spelling first
        </p>
      </div>

      <div className="bg-white rounded-[16px] p-[10px] flex items-center justify-center shadow-[0_0_40px_rgba(173,187,255,0.15)] w-[160px] h-[160px]">
        <QRCodeSVG value={stageUrl} size={140} className="opacity-95" />
      </div>

      <div className="text-muted-foreground/60 text-[10px] tracking-[2px] uppercase font-sugo">
        — or type the code —
      </div>

      <div className="flex gap-2.5">
        {codeChars.map((char, i) => (
          <div
            key={i}
            className="bg-card/40 border-2 border-primary/40 rounded-xl flex items-center justify-center font-black text-primary font-mono w-[52px] h-[60px] text-[28px]"
          >
            {char}
          </div>
        ))}
      </div>

      <div className="text-muted-foreground/50 text-[11px] font-mono tracking-widest">
        {window.location.host}/bee/stage
      </div>

      <button
        onClick={onContinue}
        className="relative w-full max-w-[280px] bg-transparent border-2 border-primary rounded-xl py-3 px-6 text-primary text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 hover:bg-primary/10 transition-colors shadow-2xl mt-2"
      >
        Continue
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
