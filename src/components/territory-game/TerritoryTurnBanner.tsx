import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hourglass, Flag } from 'lucide-react';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

interface TerritoryTurnBannerProps {
  label: string; // e.g. "Capture Phase" or "Battle Round 3"
  bannerKey: string; // changes to retrigger the slide-in (e.g. `${phase}-${round}`)
}

export function TerritoryTurnBanner({ label, bannerKey }: TerritoryTurnBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [bannerKey]);

  return (
    <div className="absolute top-4 right-4 md:top-6 md:right-8 z-30 pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={bannerKey}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2"
            style={{ background: alpha(theme.color1, 0.92), boxShadow: `0 4px 16px ${alpha('#000', 0.4)}` }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20">
              {label.toLowerCase().includes('capture') ? <Flag className="w-4 h-4 text-white" /> : <Hourglass className="w-4 h-4 text-white" />}
            </div>
            <span className="font-bungee text-[12px] uppercase tracking-wide text-white whitespace-nowrap">{label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
