export interface GameCta {
  label: string;
  to?: string;
  scrollTo?: string;
}

export interface GameFeature {
  title: string;
  desc: string;
}

export interface GameTheme {
  id: 'qgame' | 'bee';
  label: string;
  tag: string;
  title: string;
  description: string;
  packsTitle: string;
  primaryCta: GameCta;
  secondaryCta: GameCta;
  color1: string;
  color2: string;
  color3: string;
  onColor1: string;
  features: GameFeature[];
}

// Appends an alpha fraction to an oklch(...) color string. The hex-suffix alpha
// trick (`${color}33`) doesn't work on oklch() strings — this inserts `/ alpha)`
// before the closing paren instead.
export function alpha(oklchColor: string, opacity: number): string {
  return oklchColor.replace(/\)$/, ` / ${opacity})`);
}

export const gameThemes: GameTheme[] = [
  {
    id: 'qgame',
    label: 'QGame Trivia',
    tag: 'Six rounds. One winner.',
    title: 'Prove your quiz power',
    description:
      'Fast rounds, real stakes, and a live leaderboard reveal that keeps every team guessing until the end.',
    packsTitle: 'Trivia packs',
    primaryCta: { label: 'Host a game', to: '/host' },
    secondaryCta: { label: 'Join a game', to: '/join' },
    color1: 'oklch(58% 0.14 300)',
    color2: 'oklch(70% 0.12 300)',
    color3: 'oklch(46% 0.13 300)',
    onColor1: '#fff',
    features: [
      { title: 'Timed rounds', desc: '45s sprints' },
      { title: 'Wagering', desc: 'Double or nothing' },
      { title: 'Live reveals', desc: 'Paged leaderboard' },
      { title: 'Team play', desc: 'One device each' },
    ],
  },
  {
    id: 'bee',
    label: 'Spelling Bee',
    tag: 'Spell it. Win it.',
    title: 'Master the spelling bee',
    description:
      'Progressive word rounds and a stage device for the room — the bee keeps buzzing until one speller remains.',
    packsTitle: 'Spelling bee packs',
    primaryCta: { label: 'Start a bee', to: '/bee' },
    secondaryCta: { label: 'Join a bee', to: '/bee' },
    color1: 'oklch(80% 0.16 92)',
    color2: 'oklch(90% 0.1 98)',
    color3: 'oklch(38% 0.03 60)',
    onColor1: 'oklch(30% 0.03 60)',
    features: [
      { title: 'Progressive rounds', desc: 'Words get harder' },
      { title: 'Sudden death', desc: 'One miss, you’re out' },
      { title: 'Stage display', desc: 'Word on the big screen' },
      { title: 'Solo or team', desc: 'Flexible format' },
    ],
  },
];
