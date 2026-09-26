// Appearance preference (Zustand). Default is 'system': the app follows the
// device's Light/Dark setting, as Apple's HIG expects. People who want the app
// to differ from the rest of their phone can pin Light or Dark in Profile.
//
// The resolved scheme is pushed into the live palette (applyScheme) and into
// the native Appearance override, so system-drawn UI (alerts, keyboards,
// pickers, the status bar) matches the app instead of the device.
//
// HOLDS: switching scheme remounts the navigator (see app/_layout), which would
// wipe an in-progress battle, exam, gate or placement — including when iOS
// "Auto" appearance flips at sunset mid-question. Screens with live quiz state
// call useThemeHold(active); while any hold is open the new scheme is parked in
// `pending` and applied the moment the last hold is released.
import { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import { create } from 'zustand';
import { applyScheme, type Scheme } from '../theme/system';
import { storageGet, storageSet } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'mm_theme_pref';

function deviceScheme(): Scheme {
  return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
}

interface ThemeState {
  preference: ThemePreference;
  /** the device's own appearance, tracked while preference === 'system' */
  device: Scheme;
  /** the scheme currently painted */
  scheme: Scheme;
  /** a scheme waiting for the active quiz to finish */
  pending: Scheme | null;
  holds: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (p: ThemePreference) => void;
  hold: () => void;
  release: () => void;
}

function pushNative(pref: ThemePreference) {
  // Override native chrome only when pinned; 'system' hands control back to
  // the OS (null → 'unspecified'). Web has no native appearance to drive.
  if (Platform.OS === 'web') return;
  try { Appearance.setColorScheme(pref === 'system' ? null : pref); } catch {}
}

const initialDevice = deviceScheme();
applyScheme(initialDevice);

export const useTheme = create<ThemeState>((set, get) => {
  // Paint `next` now, or park it while a quiz holds the current scheme.
  const commit = (next: Scheme) => {
    if (get().holds > 0) {
      set({ pending: next === get().scheme ? null : next });
      return;
    }
    applyScheme(next);
    set({ scheme: next, pending: null });
  };

  return {
    preference: 'system',
    device: initialDevice,
    scheme: initialDevice,
    pending: null,
    holds: 0,
    hydrated: false,

    hydrate: async () => {
      const saved = (await storageGet(KEY)) as ThemePreference | null;
      const pref: ThemePreference = saved === 'light' || saved === 'dark' ? saved : 'system';
      pushNative(pref);
      const device = pref === 'system' ? deviceScheme() : get().device;
      set({ preference: pref, device });
      commit(pref === 'system' ? device : pref);
      set({ hydrated: true });
    },

    setPreference: (pref) => {
      storageSet(KEY, pref);
      pushNative(pref);
      // Returning to 'system' must re-read the device now that the override
      // is cleared; a pinned choice keeps the last known device value.
      const device = pref === 'system' ? deviceScheme() : get().device;
      set({ preference: pref, device });
      commit(pref === 'system' ? device : pref);
    },

    hold: () => set({ holds: get().holds + 1 }),

    release: () => {
      const holds = Math.max(0, get().holds - 1);
      set({ holds });
      const p = get().pending;
      if (holds === 0 && p) commit(p);
    },
  };
});

/** Keep the current appearance while `active` (e.g. a quiz is in progress). */
export function useThemeHold(active: boolean) {
  useEffect(() => {
    if (!active) return;
    useTheme.getState().hold();
    return () => useTheme.getState().release();
  }, [active]);
}

// Follow the device while in 'system' mode (e.g. iOS Auto appearance flipping
// at sunset while the app is open). While pinned, the listener fires with our
// own override and is ignored.
Appearance.addChangeListener(({ colorScheme }) => {
  const s = useTheme.getState();
  if (s.preference !== 'system') return;
  const device: Scheme = colorScheme === 'light' ? 'light' : 'dark';
  useTheme.setState({ device });
  if (device !== s.scheme || s.pending) {
    // route through the same hold-aware path as a manual change
    const holds = s.holds;
    if (holds > 0) useTheme.setState({ pending: device === s.scheme ? null : device });
    else { applyScheme(device); useTheme.setState({ scheme: device, pending: null }); }
  }
});
