# Design system — review-proof by construction

## Contents
1. Apple/Google numbers that matter
2. Tokens and contrast
3. Light + dark theming architecture (the starter kit)
4. Responsive layer (phone → tablet)
5. Typography
6. Motion, backdrops and hero art
7. Onboarding: appearance choice
8. Paywall layout
9. Getting the HIG as text

## 1. Apple/Google numbers that matter

| Rule | Value | Source |
|---|---|---|
| Body text default / minimum (iOS/iPadOS) | 17pt / 11pt | HIG Typography |
| Text contrast ≤17pt | ≥ 4.5:1 (aim 7:1 for small text); ≥18pt or bold: 3:1 | HIG Accessibility / WCAG |
| Min control size | 44×44pt iOS, 48×48dp Android | HIG / Material |
| Tab bar, regular width (iPad) | icon + label **side by side** | HIG Tab bars |
| Tabs | keep few; avoid overflow "More"; single-word labels | HIG Tab bars |
| Layout | decide by available width (size classes), not device model | HIG Layout |
| Appearance | respect system; avoid app-only setting (offer as override if the product wants it) | HIG Dark Mode |
| Text scaling | support Dynamic Type; never set `allowFontScaling={false}` globally | HIG Typography |

## 2. Tokens and contrast

Palette shape (one per appearance): `bg, surface, surfaceAlt, border, borderGlow, text, textDim,
textFaint, primary, gold, success, danger, violet, onAccent, goldTint, successTint, dangerTint,
scrim, scrimSolid, chrome`.

- `onAccent` = text colour on filled accent buttons/chips. Dark themes use neon accents + dark ink;
  light themes need DEEPER accents + white ink (neon gold is 1.6:1 on white).
- `*Tint` = selection/answer-state fills (never hardcode `#12331f`-style dark tints in screens).
- `scrim` (dim behind a card modal) vs `scrimSolid` (content drawn directly on it — must match the
  appearance or text vanishes).
- Run `python3 scripts/contrast_check.py <palette.json>` — it checks every text token on every
  surface and every `onAccent`/accent pair, failing under 4.5:1.

Audit an existing app: `grep -rnE "'#[0-9A-Fa-f]{3,8}'|rgba\(" src` — every hit outside the
theme file is a bug waiting for the other appearance.

## 3. Light + dark theming architecture (the starter kit)

`assets/theme-starter/` holds the production-proven implementation. Copy into `src/`:

| File | Goes to | Role |
|---|---|---|
| `system.ts` | `src/theme/system.ts` | `Sys` tokens; `PALETTES`; `applyScheme()` swaps LIVE colour tables; `themedStyles()` lazy per-scheme stylesheets; contrast notes |
| `theme-store.ts` | `src/store/theme.ts` | preference `system|light|dark` persisted; resolves device scheme; `Appearance.setColorScheme` so native alerts/keyboards match; **holds** |
| `responsive.ts` | `src/theme/responsive.ts` | tablet breakpoint, font scale + 12pt floor, spacing, content max width, hit size |
| `primitives.tsx` | `src/ui/System.tsx` | `SysText`/`SysCard`/`SysButton` consuming both — every screen inherits scaling |
| `AppearancePicker.tsx` | `src/components/` | segmented System/Light/Dark control (radio semantics, 44pt) |

Wiring (root `_layout.tsx`):
```tsx
import { useTheme } from '@/store/theme';          // import FIRST: applies palette before screens
const scheme = useTheme(t => t.scheme);
const themeReady = useTheme(t => t.hydrated);
useEffect(() => { useTheme.getState().hydrate(); }, []);
if (!themeReady) return <Splash/>;                    // no flash of the wrong appearance
<StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
<Stack key={scheme} …/>                               // remount on switch; route state survives
```
app.json: `"userInterfaceStyle": "automatic"` (a hardcoded `"dark"` forces the OS appearance and
hides the device setting from `Appearance`).

Why remount instead of hooks everywhere: converting 30 files × 450 colour references to hook-based
styles is a huge diff; wrapping each module-level `StyleSheet.create` in `themedStyles(() => …)`
plus a keyed remount is mechanical and, with the React Compiler memoising JSX, it is the only way
to guarantee every inline `Sys.color.x` refreshes. React Navigation keeps route state in the
container, so the user stays on the same screen.

**Holds:** a remount wipes component state. Any screen with in-progress state (quiz, wizard,
unsaved form) calls `useThemeHold(active)`; theme switches — including iOS "Auto" flipping at
sunset mid-question — are parked and applied when the hold releases. Include result screens in the
hold or the parked switch wipes the score screen the moment the quiz ends. Show "switching after
your current quiz" in the picker while pending.

Conversion script idea for an existing app: for each top-level
`const styles = StyleSheet.create({…})` containing `Sys.color`, wrap as
`themedStyles(() => StyleSheet.create({…}))` and add the import; convert module-level colour maps
into functions.

## 4. Responsive layer (phone → tablet)

- Breakpoint by window width (≥700pt = tablet), never by device model — iPad Split View/Stage
  Manager windows can be phone-width.
- Scale in the primitives: font ×1.15 on tablet with a 12pt floor; spacing ×1.3; button minHeight
  52 → 60; card radius up.
- Content column: `maxWidth` 640 phone / 760 tablet portrait / 1040 tablet landscape, centred.
- Tab bar on tablet: label beside icon, ~15pt, ~76pt tall.
- Scale non-primitive content too: WebView/KaTeX text, SVG diagrams (×1.5 max width on tablet),
  images.
- Orientation: iPhone portrait is fine; iPad should support all four
  (`ios.infoPlist.UISupportedInterfaceOrientations~ipad`), keep root `orientation: "default"`.
- Fixed `height:` on buttons/chips clips labels at large text sizes → use `minHeight`.

## 5. Typography

- Default body ≥16pt (HIG default 17), never below 12pt after scaling; weight ≥500 for small text.
- Uppercase letter-spaced labels read small — give them ≥12pt and `textFaint`-or-stronger colour.
- Use the system font for body; a display face only for headings.

## 6. Motion, backdrops and hero art

- Ambient video/particles are allowed and loved — but behind content they get a scrim
  (lobby screens ~40%, focus/quiz screens ~75%) and respect Reduce Motion (static fallback).
- Pre-rendered video is dark footage → it is dark-mode only. Light mode needs its OWN rendition of
  the art, not a recolour: e.g. black spectral silhouettes with glowing eyes (dark) became
  translucent "stained-glass" tints with crisp coloured edges over a lavender mist (light), flames
  at ~60% opacity so saturated colour doesn't shout on white.
- Celebrations/cinematic modals may stay dark in both appearances (HIG allows immersive dark) —
  then pin their text colours instead of using theme tokens.
- Never convey state with opacity alone on text (locked/disabled rows) — use a dashed/recessed
  card, icon, or label.

## 7. Onboarding: appearance choice

First-run intro opens with "Choose your look": two miniature previews each painted in ITS OWN
palette (not the active one) + "Match my device" (default, preselected). Put it on **page 0**: a
pick remounts the screen and the intro reopens on page 0 — right back on this step, now in the new
look. Keep the Profile → Appearance control for later changes; the intro reopened from Profile can
skip the step.

## 8. Paywall layout

- Phones: plans stacked, paid plan FIRST; tablets: side by side is fine.
- Each plan CTA a distinct fill; Restore Purchases visible (≥44pt) next to the plans.
- State: subscription title, length ("1-month subscription", "12 months"), price (store
  `priceString`), auto-renew terms, tappable **Terms of Use (EULA)** and **Privacy Policy**.

## 9. Getting the HIG as text

The HIG HTML pages are JS-rendered and scrape empty. Fetch JSON instead:
`https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`
(`typography`, `layout`, `dark-mode`, `accessibility`, `color`, `tab-bars`, …) and walk
`primaryContentSections` for `type: "text"` nodes.
