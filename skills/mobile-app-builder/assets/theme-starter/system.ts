// MathMonarch "System" design language — a dark, high-impact hunter world with
// a clean light counterpart. Referenced by every screen.
//
// THEMING MODEL
// `Sys.color`, `Sys.rank` and `RARITY_COLOR` are LIVE objects: applyScheme()
// swaps their values in place when the appearance changes, and the root layout
// remounts the navigator (keyed by scheme — navigation state is preserved) so
// every screen re-renders against the new palette. Module-level StyleSheets
// must therefore be built lazily through themedStyles(), which rebuilds them
// once per scheme change instead of freezing the colours at import time.
//
// CONTRAST RULES (Apple HIG / WCAG): body-size text ≥ 4.5:1 against the
// surfaces it sits on, aiming for 7:1 on small text. Every text token below was
// chosen against `bg`, `surface` and `surfaceAlt` of its own palette. Accent
// fills carry `onAccent` text (dark ink on the neon dark-mode accents, white on
// the deeper light-mode accents).

export type Scheme = 'dark' | 'light';

export type Palette = {
  bg: string; surface: string; surfaceAlt: string;
  border: string; borderGlow: string;
  text: string; textDim: string; textFaint: string;
  primary: string; primaryDim: string;
  gold: string; goldDim: string;
  success: string; danger: string; violet: string;
  /** text/icon colour drawn ON a filled accent (primary/gold/danger/…) */
  onAccent: string;
  /** tinted selection / answer-state fills */
  goldTint: string; successTint: string; dangerTint: string;
  /** dimming layer behind a card-style modal */
  scrim: string;
  /** near-opaque layer that content is drawn directly on */
  scrimSolid: string;
  /** tab bar / chrome */
  chrome: string;
};

const DARK: Palette = {
  bg: '#0A0A0F',          // near-black app background
  surface: '#12131A',     // cards / panels
  surfaceAlt: '#1A1C26',  // raised elements
  border: '#2A2F40',
  borderGlow: '#3B82F6',  // neon blue system frame
  text: '#F5F7FF',
  textDim: '#B0B8D9',     // 9.9:1 on bg
  textFaint: '#8A92AE',   // 6.4:1 on bg (was #5B6178 ≈ 3.2:1 — failed HIG)
  primary: '#4B8DF8',
  primaryDim: '#1E3A8A',
  gold: '#F5C542',        // XP / rewards
  goldDim: '#7A5C10',
  success: '#34D399',
  danger: '#F87171',
  violet: '#A78BFA',
  onAccent: '#06070C',
  goldTint: '#2A2410',
  successTint: '#12331F',
  dangerTint: '#331416',
  scrim: 'rgba(0,0,0,0.72)',
  scrimSolid: 'rgba(4,5,10,0.94)',
  chrome: '#101118',
};

const LIGHT: Palette = {
  bg: '#F3F5FA',          // soft paper — never pure white behind content
  surface: '#FFFFFF',
  surfaceAlt: '#E9EDF6',
  border: '#CDD4E3',
  borderGlow: '#2563EB',
  text: '#0B1020',        // 18:1 on surface
  textDim: '#3B4460',     // 9.6:1 on surface
  textFaint: '#56607A',   // 6.3:1 on surface, 5.8:1 on bg
  primary: '#1D4ED8',     // 6.7:1 on white — legible as text and as a fill
  primaryDim: '#DBE6FF',
  gold: '#915306',        // deep amber: 6.1:1 on white (neon gold is 1.6:1)
  goldDim: '#E3B45A',
  success: '#036B4E',
  danger: '#B91C1C',
  violet: '#6D28D9',
  onAccent: '#FFFFFF',
  goldTint: '#FDF1D3',
  successTint: '#DCF5E8',
  dangerTint: '#FDE4E4',
  scrim: 'rgba(15,20,35,0.45)',
  scrimSolid: 'rgba(243,245,250,0.97)',
  chrome: '#FFFFFF',
};

// Rank identity colours (E lowest → Monarch highest)
const RANK_DARK: Record<string, string> = {
  E: '#22D3EE', D: '#3B82F6', C: '#818CF8', B: '#A78BFA', A: '#E879F9', S: '#F5C542', Monarch: '#F472B6',
};
const RANK_LIGHT: Record<string, string> = {
  E: '#0E7490', D: '#1D4ED8', C: '#4338CA', B: '#6D28D9', A: '#A21CAF', S: '#915306', Monarch: '#BE185D',
};

// Rarity colours for collectible items (common → legendary)
const RARITY_DARK: Record<string, string> = {
  common: '#B0B8D9', uncommon: '#34D399', rare: '#4B8DF8', epic: '#C084FC', legendary: '#F5C542',
};
const RARITY_LIGHT: Record<string, string> = {
  common: '#475569', uncommon: '#047857', rare: '#1D4ED8', epic: '#7E22CE', legendary: '#915306',
};

export const PALETTES: Record<Scheme, Palette> = { dark: DARK, light: LIGHT };

export const Sys = {
  color: { ...DARK } as Palette,
  rank: { ...RANK_DARK } as Record<string, string>,
  radius: { sm: 8, md: 14, lg: 20, xl: 28 },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  font: {
    display: { fontWeight: '800' as const, letterSpacing: 0.5 },
    heading: { fontWeight: '700' as const },
    body: { fontWeight: '500' as const },
  },
};

export const RARITY_COLOR: Record<string, string> = { ...RARITY_DARK };

let currentScheme: Scheme = 'dark';
let schemeVersion = 0;

export function currentAppScheme(): Scheme {
  return currentScheme;
}

/** Swap every live colour table to `scheme`. Idempotent. */
export function applyScheme(scheme: Scheme): void {
  if (scheme === currentScheme) return;
  currentScheme = scheme;
  schemeVersion += 1;
  Object.assign(Sys.color, PALETTES[scheme]);
  Object.assign(Sys.rank, scheme === 'light' ? RANK_LIGHT : RANK_DARK);
  Object.assign(RARITY_COLOR, scheme === 'light' ? RARITY_LIGHT : RARITY_DARK);
}

/**
 * Lazily-built, scheme-aware stylesheet. Use exactly like StyleSheet.create's
 * result: `const styles = themedStyles(() => StyleSheet.create({...}))`. The
 * factory re-runs (once) after each scheme change, so `Sys.color.*` inside it
 * always reflects the active palette.
 */
export function themedStyles<T extends object>(factory: () => T): T {
  let builtFor = -1;
  let cache: T;
  return new Proxy({} as T, {
    get(_t, key) {
      if (builtFor !== schemeVersion) { cache = factory(); builtFor = schemeVersion; }
      return (cache as any)[key];
    },
  });
}

export const RANK_ORDER = ['E', 'D', 'C', 'B', 'A', 'S', 'Monarch'] as const;
export type Rank = (typeof RANK_ORDER)[number];

export function rankColor(rank: string): string {
  return Sys.rank[rank] ?? Sys.color.primary;
}

export function rarityColor(rarity: string): string {
  return RARITY_COLOR[rarity] ?? Sys.color.textDim;
}

const SLOT_ICON: Record<string, string> = { weapon: '⚔️', armor: '🛡️', artifact: '🔮' };
export function slotIcon(slot: string): string {
  return SLOT_ICON[slot] ?? '◆';
}
