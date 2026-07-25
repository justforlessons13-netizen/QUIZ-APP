import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { gameThemes, GameCta } from '@/lib/game-themes';
import { GameCube } from '@/components/landing/GameCube';

export default function Index() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const theme = gameThemes[active];

  const prev = () => setActive((i) => (i - 1 + gameThemes.length) % gameThemes.length);
  const next = () => setActive((i) => (i + 1) % gameThemes.length);

  const goTo = (cta: GameCta) => {
    if (cta.to) navigate(cta.to);
    else if (cta.scrollTo) document.getElementById(cta.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'oklch(97% 0.012 195)' }}>
      {/* ── Decorative honeycomb (Spelling Bee theme only) ── */}
      <svg
        viewBox="0 0 1180 760"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-[400ms]"
        style={{ opacity: theme.id === 'bee' ? 1 : 0, zIndex: 1 }}
      >
        <polygon points="980,120 1030,148 1030,204 980,232 930,204 930,148" fill="oklch(84% 0.13 92 / .35)" />
        <polygon points="1060,300 1096,320 1096,362 1060,382 1024,362 1024,320" fill="oklch(84% 0.13 92 / .28)" />
        <polygon points="120,560 160,582 160,626 120,648 80,626 80,582" fill="oklch(84% 0.13 92 / .3)" />
      </svg>

      {/* ── NAV ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-6">
        <div className="font-bungee text-lg tracking-wide" style={{ color: 'oklch(30% 0.06 195)' }}>
          PLAYHUB
        </div>
        <div className="hidden sm:flex items-center gap-8 text-sm" style={{ color: 'oklch(30% 0.02 195)' }}>
          <button onClick={scrollToFeatures} className="hover:opacity-70 transition-opacity">How it works</button>
          <button onClick={scrollToFeatures} className="hover:opacity-70 transition-opacity">Rounds</button>
          <button onClick={() => navigate('/printables')} className="hover:opacity-70 transition-opacity">Printables</button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'oklch(30% 0.02 195)' }}
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="font-bungee uppercase text-xs px-5 py-2.5 rounded-md text-white transition-[filter] hover:brightness-110 active:scale-95"
            style={{ background: 'oklch(58% 0.14 45)' }}
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <main className="relative z-10 flex-1">
        <div className="grid md:grid-cols-2 items-center gap-10 px-6 sm:px-12 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={theme.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] mb-4"
                style={{ color: theme.color3 }}
              >
                {theme.tag}
              </div>
              <h1
                className="font-bungee uppercase leading-[1.04] mb-5"
                style={{ fontSize: 'clamp(36px, 5vw, 52px)', color: 'oklch(28% 0.06 195)' }}
              >
                {theme.title}
              </h1>
              <p className="text-base leading-relaxed max-w-md mb-7" style={{ color: 'oklch(42% 0.03 195)' }}>
                {theme.description}
              </p>
              <div className="flex flex-wrap gap-3.5 mb-7">
                <button
                  onClick={() => goTo(theme.primaryCta)}
                  className="font-bungee uppercase text-sm px-8 py-4 rounded-lg transition-[filter] hover:brightness-110 active:scale-95"
                  style={{ background: theme.color1, color: theme.onColor1 }}
                >
                  {theme.primaryCta.label}
                </button>
                <button
                  onClick={() => goTo(theme.secondaryCta)}
                  className="font-bungee uppercase text-sm px-7 py-4 rounded-lg border-[1.5px] transition-opacity hover:opacity-70 active:scale-95"
                  style={{ color: 'oklch(30% 0.06 195)', borderColor: 'oklch(30% 0.06 195 / .25)' }}
                >
                  {theme.secondaryCta.label}
                </button>
              </div>
              <div className="flex items-center gap-3.5">
                <button
                  onClick={prev}
                  aria-label="Previous game"
                  className="w-[34px] h-[34px] rounded-full border flex items-center justify-center transition-colors hover:bg-black/5 flex-shrink-0"
                  style={{ borderColor: 'oklch(30% 0.06 195 / .25)', color: 'oklch(30% 0.06 195)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-2">
                  {gameThemes.map((g, i) => (
                    <button
                      key={g.id}
                      onClick={() => setActive(i)}
                      aria-label={`Show ${g.label}`}
                      className="w-[9px] h-[9px] rounded-full transition-transform hover:scale-125"
                      style={{ background: i === active ? g.color1 : 'oklch(30% 0.06 195 / .25)' }}
                    />
                  ))}
                </div>
                <button
                  onClick={next}
                  aria-label="Next game"
                  className="w-[34px] h-[34px] rounded-full border flex items-center justify-center transition-colors hover:bg-black/5 flex-shrink-0"
                  style={{ borderColor: 'oklch(30% 0.06 195 / .25)', color: 'oklch(30% 0.06 195)' }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-[11px] tracking-wide" style={{ color: 'oklch(45% 0.02 195)' }}>
                  {theme.label}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="relative flex items-center justify-center h-[380px]">
            <GameCube theme={theme} />
            <div
              className="absolute top-5 right-5 w-16 h-16 rounded-full"
              style={{ background: theme.color1, opacity: 0.15 }}
            />
          </div>
        </div>

        {/* ── FEATURE GRID ── */}
        <div
          id="features"
          className="grid grid-cols-2 sm:grid-cols-4 gap-px p-px"
          style={{ background: 'oklch(88% 0.015 195)' }}
        >
          {theme.features.map((f) => (
            <motion.div
              key={theme.id + f.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="p-5 sm:p-6"
              style={{ background: 'oklch(97% 0.012 195)' }}
            >
              <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'oklch(30% 0.06 195)' }}>
                {f.title}
              </div>
              <div className="text-[12.5px]" style={{ color: 'oklch(48% 0.02 195)' }}>
                {f.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
