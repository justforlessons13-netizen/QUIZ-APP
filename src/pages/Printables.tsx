import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';

const PRINTABLE_FILES = {
  first: 'printables/1st-place-certificate.pdf',
  second: 'printables/2nd-place-certificate.pdf',
  third: 'printables/3rd-place-certificate.pdf',
  score: 'printables/score-sheet.pdf',
  answer: 'printables/answer-sheet.pdf',
  lottery: 'printables/lottery-tickets.pdf',
} as const;

type PrintableKey = keyof typeof PRINTABLE_FILES;

async function downloadFromStorage(storagePath: string, fileName: string) {
  const storage = getStorage();
  const fileRef = ref(storage, storagePath);
  const url = await getDownloadURL(fileRef);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface PrintableCard {
  key: PrintableKey;
  emoji: string;
  label: string;
  sublabel: string;
  description: string;
  fileName: string;
  accentColor: string;
  borderColor: string;
}

const CARDS: PrintableCard[] = [
  {
    key: 'first',
    emoji: '🥇',
    label: '1st Place',
    sublabel: 'Winner Certificate',
    description: 'Gold certificate for the champion team. Sign and present at the end of the night.',
    fileName: '1st-place-certificate.pdf',
    accentColor: '#facc15',
    borderColor: 'rgba(250,204,21,0.25)',
  },
  {
    key: 'second',
    emoji: '🥈',
    label: '2nd Place',
    sublabel: 'Runner-up Certificate',
    description: 'Silver certificate for the runners-up.',
    fileName: '2nd-place-certificate.pdf',
    accentColor: '#cbd5e1',
    borderColor: 'rgba(203,213,225,0.25)',
  },
  {
    key: 'third',
    emoji: '🥉',
    label: '3rd Place',
    sublabel: 'Bronze Certificate',
    description: 'Bronze certificate for the 3rd place team.',
    fileName: '3rd-place-certificate.pdf',
    accentColor: '#fb923c',
    borderColor: 'rgba(251,146,60,0.25)',
  },
  {
    key: 'score',
    emoji: '📋',
    label: 'Score Sheet',
    sublabel: 'Host Tracking',
    description: 'Track all team scores across all 6 rounds.',
    fileName: 'score-sheet.pdf',
    accentColor: '#adbbff',
    borderColor: 'rgba(173,187,255,0.25)',
  },
  {
    key: 'answer',
    emoji: '📝',
    label: 'Answer Sheet',
    sublabel: 'One Per Team',
    description: 'Teams write their answers per round. Includes a wager box for Round 6.',
    fileName: 'answer-sheet.pdf',
    accentColor: '#adbbff',
    borderColor: 'rgba(173,187,255,0.25)',
  },
  {
    key: 'lottery',
    emoji: '🎟️',
    label: 'Lottery Tickets',
    sublabel: 'Bonus Activity',
    description: 'Printable tickets for prize draws or bonus rounds.',
    fileName: 'lottery-tickets.pdf',
    accentColor: '#c084fc',
    borderColor: 'rgba(192,132,252,0.25)',
  },
];

const sugoGradient: React.CSSProperties = {
  background: 'linear-gradient(180deg, #e8e8e8 0%, #9a9a9a 60%, #6b6b6b 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export default function Printables() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState<PrintableKey | null>(null);

  const handleDownload = async (card: PrintableCard) => {
    if (downloading) return;
    setDownloading(card.key);
    try {
      await downloadFromStorage(PRINTABLE_FILES[card.key], card.fileName);
      toast({ title: `Downloading ${card.label}…` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Download failed', description: 'File not found in Firebase Storage.', variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-radial-dark flex flex-col">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-[#adbbff]/10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-bungee uppercase tracking-wide text-[#adbbff] hover:brightness-110 transition-all"
          style={{ fontSize: '13px' }}
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1
            className="font-bungee uppercase tracking-wider leading-none"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)', color: '#adbbff', textShadow: '0 0 30px rgba(173,187,255,0.4)' }}
          >
            Printables
          </h1>
          <div className="mt-2 mb-3" style={{ width: 'clamp(80px, 8vw, 140px)', height: '3px', borderRadius: '999px', background: 'rgba(173,187,255,0.4)' }} />
          <p className="font-sugo uppercase tracking-widest" style={{ fontSize: '12px', ...sugoGradient }}>
            Download and print game materials for your quiz night.
          </p>
        </motion.div>

        {/* Certificates */}
        <Section label="Certificates" emoji="🏆" delay={0.05}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CARDS.filter(c => ['first', 'second', 'third'].includes(c.key)).map((card, i) => (
              <Card key={card.key} card={card} index={i} downloading={downloading} onDownload={handleDownload} />
            ))}
          </div>
        </Section>

        {/* Game Aids */}
        <Section label="Game Aids" emoji="🎮" delay={0.15}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CARDS.filter(c => ['score', 'answer'].includes(c.key)).map((card, i) => (
              <Card key={card.key} card={card} index={i} downloading={downloading} onDownload={handleDownload} />
            ))}
          </div>
        </Section>

        {/* Extras */}
        <Section label="Extras" emoji="✨" delay={0.25}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CARDS.filter(c => c.key === 'lottery').map((card, i) => (
              <Card key={card.key} card={card} index={i} downloading={downloading} onDownload={handleDownload} />
            ))}
          </div>
        </Section>

        {/* Setup note */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-6 p-4 rounded-xl border border-[#adbbff]/15 bg-[#adbbff]/5"
        >
          <p className="font-bungee uppercase tracking-wide mb-2" style={{ fontSize: '11px', color: '#adbbff' }}>
            📁 How to set up your files
          </p>
          <ol className="list-decimal list-inside space-y-1 font-sugo uppercase tracking-wider" style={{ fontSize: '10px', ...sugoGradient }}>
            <li>Open Firebase Console → Storage</li>
            <li>Create a folder called <span style={{ color: '#adbbff', WebkitTextFillColor: '#adbbff' }}>printables/</span></li>
            <li>Upload your PDFs with exact filenames from Printables.tsx</li>
            <li>Downloads will work automatically once uploaded</li>
          </ol>
        </motion.div>
      </main>
    </div>
  );
}

function Section({ label, emoji, delay, children }: { label: string; emoji: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span>{emoji}</span>
        <h2 className="font-bungee uppercase tracking-widest" style={{ fontSize: '11px', color: 'rgba(173,187,255,0.6)' }}>
          {label}
        </h2>
        <div className="flex-1 h-px" style={{ background: 'rgba(173,187,255,0.15)' }} />
      </div>
      {children}
    </motion.section>
  );
}

function Card({ card, index, downloading, onDownload }: {
  card: PrintableCard; index: number; downloading: PrintableKey | null; onDownload: (c: PrintableCard) => void;
}) {
  const isLoading = downloading === card.key;
  const isDisabled = downloading !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group flex flex-col gap-3 p-5 rounded-xl transition-all duration-300"
      style={{
        background: 'rgba(173,187,255,0.04)',
        border: `1px solid ${card.borderColor}`,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(173,187,255,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(173,187,255,0.04)')}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <span className="text-3xl leading-none">{card.emoji}</span>
        <span
          className="font-bungee uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ fontSize: '9px', color: card.accentColor, background: `${card.accentColor}18`, border: `1px solid ${card.borderColor}` }}
        >
          PDF
        </span>
      </div>

      {/* Text */}
      <div className="flex-1">
        <p className="font-bungee uppercase tracking-wide leading-none mb-1" style={{ fontSize: '13px', color: '#d9d9d9' }}>
          {card.label}
        </p>
        <p className="font-bungee uppercase tracking-wide mb-2" style={{ fontSize: '10px', color: card.accentColor }}>
          {card.sublabel}
        </p>
        <p className="font-sugo uppercase tracking-wider leading-relaxed" style={{ fontSize: '10px', ...sugoGradient }}>
          {card.description}
        </p>
      </div>

      {/* Download button */}
      <button
        disabled={isDisabled}
        onClick={() => onDownload(card)}
        className="w-full font-bungee uppercase tracking-wide text-[#120524] hover:brightness-110 active:scale-95 transition-all leading-none pb-[2px] flex items-center justify-center gap-2 disabled:opacity-50"
        style={{
          background: '#adbbff',
          fontSize: '13px',
          padding: '9px 0',
          borderRadius: '6px',
          boxShadow: '0 0 16px rgba(173,187,255,0.2)',
        }}
      >
        {isLoading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Downloading…</>
          : <><Download className="w-4 h-4" /> Download</>
        }
      </button>
    </motion.div>
  );
}