# Theme starter kit (from MathMonarch, production-proven)

Copy into an Expo Router app and adapt the palettes/brand. See
`references/design-system.md` §3 for the wiring and the why.

| File | Destination | Adapt |
|---|---|---|
| `system.ts` | `src/theme/system.ts` | Replace DARK/LIGHT palette values with the brand's; keep every key. Drop `rank`/`RARITY` tables if the app has no such concept. Re-run `scripts/contrast_check.py` after any change. |
| `theme-store.ts` | `src/store/theme.ts` | Needs a `storage.ts` with `storageGet/storageSet` (SecureStore native, localStorage web). |
| `responsive.ts` | `src/theme/responsive.ts` | Tune breakpoint (700pt) and column widths if the design needs it. |
| `primitives.tsx` | `src/ui/System.tsx` | Rename components to taste; keep responsive scaling + `minHeight`. |
| `AppearancePicker.tsx` | `src/components/` | Uses `@/…` path aliases and Ionicons. |

Checklist after copying:
1. Root layout imports the theme store first, hydrates it, gates first paint on `hydrated`, sets the
   StatusBar style from `scheme`, and keys the root `<Stack>` by `scheme`.
2. `app.json`: `"userInterfaceStyle": "automatic"`.
3. Every module-level `StyleSheet.create` that reads `Sys.color` → `themedStyles(() => …)`.
4. Screens with in-progress state call `useThemeHold(active)`.
5. Profile gets `<AppearancePicker/>`; first-run intro page 0 gets a "Choose your look" step.
6. Grep for hardcoded `#hex` / `rgba(` outside `system.ts` and replace with tokens.
