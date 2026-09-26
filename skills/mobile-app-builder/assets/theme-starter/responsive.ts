// Responsive layout system — one source of truth for how the app adapts from a
// 375pt iPhone SE to a 1180pt iPad in landscape.
//
// Why this exists: the app was phone-designed and shipped with iPad support, so
// App Review opened it on an 11" iPad and saw phone-sized type stranded in a
// large canvas ("hard to read type… crowded interface", guideline 4). Rather
// than hand-tuning every screen, the shared primitives in ui/System.tsx consume
// these values, so text, padding and controls scale everywhere at once and each
// screen only decides its own COLUMN structure.
import { useWindowDimensions } from 'react-native';

// A 700pt floor keeps iPad Split View (320–507pt) on the phone layout, where the
// phone design is already correct — only genuinely large canvases scale up.
export const TABLET_MIN_WIDTH = 700;

// Apple's HIG treats 11pt as the smallest comfortable size and reserves it for
// short secondary labels; body copy wants 15–17pt. The app had 10–11pt labels
// scattered through it, which is what "hard to read type" refers to on any
// device — so every size is lifted to this floor before scaling.
export const MIN_FONT_SIZE = 12;

export interface Responsive {
  width: number;
  height: number;
  /** True on iPad-class canvases (and large landscape phones are excluded). */
  isTablet: boolean;
  landscape: boolean;
  /** Max width of a reading column — long lines hurt readability most on iPad. */
  contentMaxWidth: number;
  /** Card-grid columns for tile layouts (armory, exam papers, topic chips). */
  columns: number;
  /** Scale a phone-tuned font size for this canvas (applies the floor too). */
  font: (size: number) => number;
  /** Scale a phone-tuned spacing/padding value. */
  space: (value: number) => number;
  /** Minimum tappable height — iPad wants a bit more than the 44pt phone floor. */
  hitSize: number;
}

/** Pure so it can be unit-tested and reused outside React. */
export function scaleFont(size: number, isTablet: boolean): number {
  const floored = Math.max(size, MIN_FONT_SIZE);
  // 1.15 keeps hierarchy intact: big display type stays dominant without
  // overflowing, while small labels gain the most in relative legibility.
  return isTablet ? Math.round(floored * 1.15) : floored;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;
  const landscape = width > height;

  return {
    width,
    height,
    isTablet,
    landscape,
    // Portrait iPad reads well at ~760; in landscape we allow a wider canvas so
    // two-column screens have room, but never the full 1180 (unreadable lines).
    contentMaxWidth: isTablet ? (landscape ? 1040 : 760) : 640,
    columns: isTablet ? (landscape ? 3 : 2) : 1,
    font: (size: number) => scaleFont(size, isTablet),
    space: (value: number) => (isTablet ? Math.round(value * 1.3) : value),
    hitSize: isTablet ? 52 : 44,
  };
}
