// Shared initials-avatar helper for Spelling Bee screens (host + stage device).
// Drop at src/lib/beeAvatar.ts. Deterministic per name so the same speller
// gets the same ring color everywhere (roster, turn-intro, leaderboard, standings).

const BEE_AVATAR_COLORS = ['#d9b23d', '#5fb8c9', '#e0725a', '#7bc48f', '#b98fdb', '#e0a552'];

export function beeInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function beeAvatarColor(name: string): string {
  return BEE_AVATAR_COLORS[hashStr(name || '') % BEE_AVATAR_COLORS.length];
}
