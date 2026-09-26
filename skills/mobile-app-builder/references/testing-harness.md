# Testing harness — see it on every device before a reviewer does

## Contents
1. The three-layer strategy
2. Layer 1: Expo web at device sizes (fastest)
3. Layer 2: local fixture API (sign in without a password)
4. Layer 3: native simulator
5. Things that break harnesses (and fixes)

## 1. The three-layer strategy

| Layer | Catches | Cost |
|---|---|---|
| Expo web in a browser pane at iPad/iPhone sizes, both colour schemes | layout, contrast, theming, copy, most flows | seconds |
| Local API with fixture DB | signed-in screens without real credentials; deterministic content | minutes |
| iOS simulator (release build) / Android emulator | native-only behaviour: Appearance override, status bar, orientation, WebView, IAP sheet | ~10 min |
| TestFlight / Play internal track on real devices | final confidence; sandbox purchases | human |

Web first, native last — but never ship on web evidence alone for native-only code.

## 2. Layer 1: Expo web at device sizes

```bash
npx expo start --web --port 8081 --clear   # --clear after any .env change
```
In the browser pane: emulate 820×1180 (iPad Air 11" portrait), 1180×820 (landscape),
393×852 (iPhone). Emulate `prefers-color-scheme` light/dark to test "System" mode. Take a
screenshot per screen × size × scheme for the definition-of-done check.

Stubs that are fine for local testing (never ship them):
- `window.confirm = () => true` — some panes auto-dismiss confirm dialogs.
- Intercept `fetch` for a single endpoint (e.g. billing plans) to render a "live" paywall state
  when local config lacks store keys. Patch, then navigate client-side (a reload drops the patch).

## 3. Layer 2: local fixture API

Don't type real credentials into forms to test. Instead:
1. Run the backend locally against a throwaway SQLite DB in a scratch dir (Python ≥3.10 venv; set a
   dummy AI key if the server checks for one before serving bank content).
2. Seed via a script (quoted heredoc so `$…` LaTeX isn't shell-expanded): a student user (desired
   entitlement/progress), a session row with a random token, a handful of questions including a
   diagram and math notation.
3. Put the token + `/me` payload into the app's storage keys (web: `localStorage`) and reload.
4. Scratch/tmp dirs get cleaned overnight — keep the seed script and re-run it.

Premium-only code paths may call external AI/services; flip the fixture to the free tier (or stub)
to exercise the bank-backed path locally.

## 4. Layer 3: native simulator

- `npx expo run:ios --device <UDID>` for dev builds; for a Release-config build (bundled JS, no
  Metro): `xcodebuild -workspace ios/<App>.xcworkspace -scheme <App> -configuration Release -sdk
  iphonesimulator -destination id=<UDID> -derivedDataPath <scratch>/dd build`, then
  `xcrun simctl install/launch`.
- Flip appearance live: `xcrun simctl ui <UDID> appearance light|dark`; screenshot:
  `xcrun simctl io <UDID> screenshot out.png`.
- Test on an **iPad Air 11"** simulator in both orientations — that's the review device.
- Typing into the simulator drops characters: `xcrun simctl pbcopy <UDID>` + paste.

## 5. Things that break harnesses (and fixes)

| Symptom | Fix |
|---|---|
| Web app still calls the old API after changing env | `.env` is inlined into a virtual module — edit `.env`, restart with `--clear`, reload bundle with `cache:'reload'` |
| Signed-in state vanishes on reload | a request 401'd (wrong API base / expired fixture session) → app logged out; check network tab |
| `simctl` hangs forever after an Xcode update | Xcode first-launch install waits for the admin password — user opens Xcode once; meanwhile `DEVELOPER_DIR=` an Xcode whose CoreSimulator is current |
| Xcode 27: Pods deployment target 9.0/12.0 unsupported | local test builds: `IPHONEOS_DEPLOYMENT_TARGET=15.1` on the xcodebuild line; durable: Podfile post_install hook |
| `expo run:ios`: "Can't determine id of Simulator app" | Expo uses `xcode-select`, ignoring `DEVELOPER_DIR` — build with xcodebuild + simctl |
| `expo lint` edits package.json | it auto-installs ESLint; revert if lint isn't part of the project |
| Prebuild rewrote package.json scripts | `expo run:*` changes `ios`/`android` scripts — revert before committing |
