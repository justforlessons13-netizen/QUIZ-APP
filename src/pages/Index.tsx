import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Timer, Trophy, Users } from 'lucide-react';

const features = [
  {
    icon: Timer,
    emoji: '⏱',
    title: 'Timed Rounds',
    desc: '45-second sprints with a 15-second review window. Think fast!',
  },
  {
    icon: Zap,
    emoji: '⚡',
    title: 'Go Hard or Go Home',
    desc: 'Round 6 wagering — double your points or lose them all.',
  },
  {
    icon: Trophy,
    emoji: '🏆',
    title: 'Dramatic Reveals',
    desc: 'Paged leaderboard reveals build tension to the final winner.',
  },
  {
    icon: Users,
    emoji: '👥',
    title: 'Team Play',
    desc: 'One device per team. Compete head-to-head in real time.',
  },
];

// Grey gradient matching in-game Sugo Display style
const sugoGradient: React.CSSProperties = {
  background: 'linear-gradient(180deg, #e8e8e8 0%, #9a9a9a 60%, #6b6b6b 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-radial-dark flex flex-col overflow-hidden">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-0">

        {/* ── LOGO / TITLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1
            className="font-bungee uppercase tracking-wider leading-none"
            style={{
              fontSize: 'clamp(56px, 8vw, 120px)',
              color: '#adbbff',
              textShadow: '0 0 40px rgba(173,187,255,0.5), 0 0 80px rgba(173,187,255,0.2)',
            }}
          >
            QGame
          </h1>

          {/* Underline bar */}
          <div className="flex justify-center mt-2 mb-5">
            <div
              className="rounded-full bg-[#adbbff]/50"
              style={{ width: 'clamp(120px, 12vw, 220px)', height: '3px' }}
            />
          </div>

          <p
            className="font-sugo uppercase tracking-[0.15em] leading-relaxed max-w-lg mx-auto"
            style={{ fontSize: 'clamp(13px, 1.4vw, 20px)', ...sugoGradient }}
          >
            The ultimate quiz experience.{' '}
            Six rounds. One winner. No mercy.
          </p>
        </motion.div>

        {/* ── CTA BUTTONS ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-3 mb-14"
        >
          {/* Primary — Host a Game */}
          <button
            onClick={() => navigate('/host')}
            className="font-bungee uppercase tracking-wide text-[#120524] bg-[#adbbff] hover:brightness-110 active:scale-95 transition-all leading-none pb-[2px]"
            style={{
              fontSize: 'clamp(13px, 1.2vw, 18px)',
              padding: '10px 32px',
              borderRadius: '6px',
              boxShadow: '0 0 24px rgba(173,187,255,0.3)',
            }}
          >
            Host a Game
          </button>

          {/* Secondary — Join a Game */}
          <button
            onClick={() => navigate('/join')}
            className="font-bungee uppercase tracking-wide text-[#adbbff] border border-[#adbbff]/40 bg-[#adbbff]/10 hover:bg-[#adbbff]/20 active:scale-95 transition-all leading-none pb-[2px]"
            style={{
              fontSize: 'clamp(13px, 1.2vw, 18px)',
              padding: '10px 32px',
              borderRadius: '6px',
            }}
          >
            Join a Game
          </button>

          {/* Secondary — Play Demo */}
          <button
            onClick={() => navigate('/demo')}
            className="font-bungee uppercase tracking-wide text-[#adbbff] border border-[#adbbff]/40 bg-[#adbbff]/10 hover:bg-[#adbbff]/20 active:scale-95 transition-all leading-none pb-[2px]"
            style={{
              fontSize: 'clamp(13px, 1.2vw, 18px)',
              padding: '10px 32px',
              borderRadius: '6px',
            }}
          >
            Play Demo
          </button>

          {/* Secondary — Printables */}
          <button
            onClick={() => navigate('/printables')}
            className="font-bungee uppercase tracking-wide text-[#adbbff] border border-[#adbbff]/40 bg-[#adbbff]/10 hover:bg-[#adbbff]/20 active:scale-95 transition-all leading-none pb-[2px]"
            style={{
              fontSize: 'clamp(13px, 1.2vw, 18px)',
              padding: '10px 32px',
              borderRadius: '6px',
            }}
          >
            Printables
          </button>
        </motion.div>

        {/* ── FEATURE CARDS ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 + i * 0.08 }}
              className="flex items-start gap-4 p-5 rounded-xl border border-[#adbbff]/15 bg-[#adbbff]/5 hover:border-[#adbbff]/30 hover:bg-[#adbbff]/10 transition-all duration-300"
            >
              {/* Icon circle */}
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-lg bg-[#adbbff]/10 border border-[#adbbff]/20"
                style={{ width: 40, height: 40 }}
              >
                <f.icon className="w-5 h-5" style={{ color: '#adbbff' }} />
              </div>

              <div>
                <h3
                  className="font-bungee uppercase tracking-wide leading-none mb-2"
                  style={{
                    fontSize: 'clamp(11px, 0.9vw, 14px)',
                    color: '#adbbff',
                  }}
                >
                  {f.title}
                </h3>
                <p
                  className="font-sugo uppercase tracking-wider leading-snug"
                  style={{ fontSize: 'clamp(10px, 0.8vw, 13px)', ...sugoGradient }}
                >
                  {f.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* ── FOOTER ── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center py-5 border-t border-[#adbbff]/10"
      >
        <span
          className="font-bungee uppercase tracking-widest"
          style={{ fontSize: '11px', color: 'rgba(173,187,255,0.3)' }}
        >
          Built for QGame
        </span>
      </motion.footer>
    </div>
  );
}