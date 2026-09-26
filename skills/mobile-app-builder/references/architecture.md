# Architecture — decisions that keep an app shippable

## Contents
1. Default stack
2. Project layout & hygiene
3. API client and environment
4. Config gating (paid surfaces, store keys)
5. Auth patterns
6. Platform splits (native vs web)
7. State, storage, and the React Compiler
8. Server-side responsibilities

## 1. Default stack

| Concern | Default | Why |
|---|---|---|
| Framework | Expo (latest SDK), CNG (no committed `ios/`/`android/`) | One codebase for iOS/Android/web; config plugins instead of hand-edited native projects |
| Routing | Expo Router (`src/app/`), tabs + stacks | File-based, deep-linkable, web-compatible |
| Language | TypeScript strict; `tsc --noEmit` in CI | Catches the refactor bugs review won't forgive |
| State | Zustand stores per domain (`auth`, `theme`, …) | Tiny, works outside React (listeners, stores calling stores) |
| Storage | `expo-secure-store` native / `localStorage` web behind one helper | Tokens encrypted on device; web still works |
| Animation | Reanimated + SVG; pre-rendered video only for hero cinematics | UI-thread motion; video for what SVG can't do |
| Payments | RevenueCat (App Store + Play) + Stripe (web) → one server entitlement | See `mobile-app-release` |
| Builds | EAS; local builds for TestFlight iteration, **cloud builds for App Store submission** (a beta Xcode binary is rejected as Invalid Binary, ITMS-90111) | |

Go native (SwiftUI / Compose) only for capabilities Expo can't reach; route to
`swiftui-expert-skill` / `mobile-android-design`. `@expo/ui` gives real SwiftUI/Compose controls
inside Expo — prefer it over JS look-alikes for sheets, pickers, toggles (`expo-ui`).

## 2. Project layout & hygiene

- Keep the repo **outside iCloud-synced folders** (`~/Documents`, Desktop). macOS "archived"
  Documents to iCloud Drive (Archive) and only a node_modules stub survived — every unpushed
  commit was lost. Branch → PR → merge the same day.
- `.easignore` at the repo root when the app is a subfolder: EAS packs the WHOLE repo (a 70MB
  tarball kept failing with EPIPE). `/*` then `!/mobile`, plus the usual ignores — `.easignore`
  replaces `.gitignore` for EAS.
- `mobile/.env` is gitignored and holds only `EXPO_PUBLIC_*` values for local runs; per-profile
  values live in `eas.json` `build.<profile>.env`.
- Delete framework template assets (starter icons/images/fonts) on day one — byte-identical files
  across thousands of apps are a 4.3(a) "spam" signal.

## 3. API client and environment

```ts
// one resolver, used everywhere
function resolveBase() {
  const env = process.env.EXPO_PUBLIC_API_BASE;      // .env locally, eas.json in builds
  if (env) return env.replace(/\/$/, '');
  const host = String(Constants.expoConfig?.hostUri ?? '').split(':')[0];
  return host ? `http://${host}:8000` : 'http://localhost:8000';  // dev: Metro host's LAN IP
}
```

Gotchas:
- **On web, Metro inlines `.env` values into a virtual module** — a shell `EXPO_PUBLIC_*=…`
  override does NOT win over `.env`. Edit `.env` and restart Metro with `--clear`.
- The browser also caches the dev bundle: after changing env, re-fetch the bundle with
  `cache: 'reload'` or hard-reload.
- Simulator/dev builds don't read `eas.json` env — put the API base in `.env` or network calls
  fail with "Network request failed".
- A 401 from `/me` must log the user out (clear token) — otherwise a dead session traps the user
  on a screen with no way out. Always give onboarding/intro screens a "Log out" escape hatch.

## 4. Config gating (paid surfaces, store keys)

Every paid or externally-configured surface renders from build-time keys:

```ts
export const IAP_ENABLED = !!RC_KEY;          // react-native-purchases key for this platform
// paywall: no key / no products → harmless "coming soon"; key + products → real buttons
```

- Public SDK keys (`appl_…`, `goog_…`, Stripe price ids) may live in `eas.json`; secrets
  (webhook tokens, .p8, service-account JSON, shared secrets, demo passwords) never touch git.
- Use store-reported `priceString`, never hardcoded currency.
- Platform-split billing: `purchases.ts` (native SDK) + `purchases.web.ts` (no-op exports) keeps
  native modules out of the web bundle.
- The server is the single source of truth for `premium`: store webhooks (RevenueCat) and web
  billing (Stripe) both flip the same server field; the app polls `/me` after purchase.

## 5. Auth patterns

- Email/password + Sign in with Apple (mandatory on iOS if any third-party login is offered) +
  Google. Native Google Sign-In needs per-platform OAuth clients (iOS URL scheme plugin, Android
  SHA-1 of the upload AND Play app-signing keys).
- Store only the session token + cached user; refresh `/me` on launch and on foreground so
  server-side changes (grants, expiry) appear without re-login.
- Children: collect an age band, not DOB; under-13 → parental consent flow before full access.
- Account deletion must be in-app (Apple 5.1.1(v)); also link a deletion request route on the web.

## 6. Platform splits (native vs web)

Use `Foo.tsx` + `Foo.web.tsx` for anything platform-bound. Real failures seen:
- `expo-router/head` (SEO) rendered on native threw an alert on every navigation → 2.1 rejection.
  Web-only components get a native no-op twin.
- KaTeX/math: WebView on native, direct DOM render on web — and BOTH must use the responsive font
  scale and the system font, or tablet text stays phone-sized / serif.
- `window.confirm` / `Alert.alert` buttons: Alert buttons are no-ops on react-native-web; wrap in a
  cross-platform `confirmAction()`.

## 7. State, storage, and the React Compiler

- With the React Compiler on, JSX that reads module-level mutable values (e.g. a live palette
  object) is memoised per instance and will NOT refresh on re-render. Anything global and mutable
  must either flow through hooks, or the tree must remount when it changes (the theme system does
  the latter deliberately — see `design-system.md`).
- Keep quiz/wizard progress in component state only if you also block remounts during it (theme
  "holds"); otherwise persist it in a store.

## 8. Server-side responsibilities

- Entitlements, quotas, and "has this user seen this content" ledgers live on the server.
- Seeded demo account for review: premium granted server-side, onboarding/placement completed,
  at least one item of content in every gated feature. Verify via API before each submission.
- Health/ops endpoints and client-error logging (with user id + request id) make "works on my
  device" reports debuggable.
