# Testing harness — see it on every device before a reviewer does

## Contents
1. The three-layer strategy
2. Layer 1: Expo web at device sizes (fastest)
3. Layer 2: local fixture API (sign in without a password)
4. Layer 3: native simulator
5. Things that break harnesses (and fixes)
6. Negative-path test matrix (write it before calling a feature done)
7. Flutter test-harness traps

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

## Gotchas (added from MathMonarch, Sep 2026)
- `CI=1 npx expo start` disables Metro's file watcher — edits are NOT picked up; restart Metro (`--clear`) after each change, or check the served bundle (`curl …entry.bundle | grep <new-symbol>`).
- `mobile/.env` values override shell `EXPO_PUBLIC_*` vars for Metro — to point a local build at a test API, edit `.env` (and restore it before committing/building).
- iOS simulator: when the keyboard is up the form scrolls, so a tap at a button's pre-keyboard position lands on whatever moved there (hit "Continue with Apple" instead of Login). Submit with a trailing "\n" from the focused field instead.

## 6. Negative-path test matrix (write it before calling a feature done)

Happy paths prove almost nothing. For each feature, list and test the rows that apply:

| Area | Cases to test |
|---|---|
| Input | empty, too short or long, wrong characters, look-alike Unicode digits (full-width `４`, Arabic-Indic `٤`), leading/trailing spaces, pasted text |
| Platform service | not available, permission denied, throws, hangs (add a timeout), returns nothing, succeeds late after the screen closed |
| Storage | read fails, write fails midway (no half-saved state), unreadable or corrupt data (fail closed for security, fail open only for conveniences), stale data from an earlier install |
| Time | clock moved back or forward, a session expiring mid-flow, day and time-zone boundaries |
| Lifecycle | force-close between steps (counters must persist), reinstall, restore from backup, upgrade from an old schema |
| Backup/restore | exported data never carries secrets or device-only state; a crafted backup is refused; restore keeps device-only state (purchase, locks, prompt history) |
| Abuse by the user | a child holding the device: can they switch their own profile to adult, restore an adult backup, create the parent's PIN first, learn a fixed "7 + 5" gate? |
| UI | large text, small screens, long content pushing controls off screen, repeated taps while busy, cancel at every dialog |
| Security values | no plain secret in storage or logs; constant-time compare; hashing checked against published test vectors |

Pure policy classes (lockout, rating prompts, scheduling) take `now` as a parameter so every time case is a unit test. Record in the checklist which rows were tested and which could not be (for example biometrics with no enrolled face on a simulator).

## 7. Flutter test-harness traps

- **A missed tap only prints a warning and the test goes on.** Add `test/flutter_test_config.dart` with `WidgetController.hitTestWarningShouldBeFatal = true` inside `testExecutable`, so off-screen or covered taps fail. In one project it caught a test that "passed" without ever tapping its switch.
- `scrollUntilVisible` stops once a widget is partly on screen; follow it with `ensureVisible`. It scrolls one way only, so search the other way if the target may be above.
- Lists build lazily: an `expect(find.text(...))` for something below the fold fails even though it exists. Scroll to it first. Any new card near the top of a screen (for example a prompt) shifts later checks, so rerun the journeys after layout changes.
- Replace fixed waits (`Future.delayed(300ms)`) with polling plus a ceiling. Image rendering and isolates slow down when many test files run in parallel.
- Reset any global test hook to its **captured** original in `addTearDown`; `hook = hook` restores nothing.
- **iOS simulator keeps app data between `flutter test` runs; Android uninstalls the app after each run.** Journeys that expect a fresh install must `xcrun simctl uninstall <UDID> <bundle id>` first on iOS.
- **System permission alerts** (speech recognition, microphone) are outside the Flutter tree and block integration tests. `simctl privacy grant` has no speech-recognition service. A stuck alert survives uninstalling the app, so reboot the simulator (`simctl shutdown` + `boot`) to clear it.
- **Test reinstall behaviour for real** with phased runs selected by `--dart-define=PHASE=…`, and uninstall between phases. This is how the iOS Keychain surviving an uninstall was confirmed.
- After adding native plugins, also build and **launch a release build** (`flutter build apk --release`, `adb install`, `am start -W`, then check logcat for FATAL). Debug integration runs don't exercise code shrinking.
- **When a previously passing test breaks and the cause isn't obvious, bisect instead of guessing:** `git worktree add <scratch>/wt HEAD`, run the test there, copy the changed files in one at a time, and remove the worktree afterwards. In one case the culprit was a single extra `await` on a null value, which shifted microtask timing in a widget test that waited a fixed 100 ms for database work. Fix both sides: drop the needless `await` and make the test wait for the database (`drainDatabase`-style polling).
- **`pumpWidget` with a new `MaterialApp` reuses the old Navigator** when the root type is unchanged, so a route pushed earlier stays on top and the "new" screen never shows. Give each test app a `key: UniqueKey()`.
- Separate in-memory SQLite databases in tests need `singleInstance: false` (or real temporary files); otherwise both opens share one database.
- **Look at generated documents, not just their bytes.** Render PDFs to images (`sips -s format png file.pdf --out file.png` on macOS) and review them. In one app, curly apostrophes printed as empty boxes and "1 words" slipped through, with all tests green. Raw-PDF text checks must use single words, because PDF writers place words separately.
- **macOS has no `timeout` command.** `timeout 300 flutter test …` fails with "command not found" and, behind a `grep`, looks exactly like a hung test. Use the tool's own time limit or a background job instead.
- **Get real timings from a profile build:** `flutter drive --profile --driver=test_driver/integration_test.dart --target=integration_test/x_test.dart -d emulator-5554`. Debug JIT numbers can be off by 20× either way. In profile mode `tester.enterText` silently types nothing unless the test calls `tester.testTextInput.register()` first.
- **Drive native intents from outside the test:** the test logs a marker (`SHARE_READY`), and a background script waits for it in the log and fires `adb shell "am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT '<text>' -n <pkg>/.MainActivity"`. Quote the whole remote command: `adb shell` re-splits arguments, so an unquoted text with spaces becomes a bogus package name.
- **Device journeys find layout bugs widget tests miss:** after "Next" on a long page the next question sat above the viewport on a phone, so the test couldn't reach it. The fix belongs in the app (`Scrollable.ensureVisible` on the new question), not in the test.
- **Pump the whole app at the largest in-app text size** once; a 1.3× reading size exposed a Row that overflowed on the home card.

## 8. Release-readiness tests (every app, before the first submission)

Copy the three test files from [review-kit.md](review-kit.md) §3:
- `app_version_test`: the shown version matches pubspec, no preview/pilot/beta wording, and bundled licences are registered;
- `release_readiness_test`: privacy manifests are bundled, export compliance is set, permission strings are specific and device-neutral, and no prices are hard-coded;
- `store_copy_test`: field limits, the six Guideline 2.1 headings in the notes, privacy and EULA links, no beta wording or trademarks, and replies fit 4,000 characters.

They take milliseconds and would have prevented every finding of VocabAura's first review round.

## 9. Session hygiene that saves hours

- **A journey that prints no result usually means the emulator died, not the app.** Run `adb devices`; if it's empty, restart with `emulator -avd <name> -no-boot-anim &`, then `adb wait-for-device`, then poll `getprop sys.boot_completed` until it reads 1. Discard the partial log and **re-run every affected journey**. Never count a crashed run as a result.
- **Background waiters go stale.** A loop watching a log never finishes once you replace that run. Kill it as soon as you start the replacement, and prefer one-shot loops that exit on success *and* on failure markers.
- **Keep working while device tests run:** `git worktree add -b feature ../wt HEAD`, then `flutter pub get --offline` there, build and test, and fast-forward back. Editing the checkout that tests are running against changes what the next journey compiles.
- **zsh:** a glob that matches nothing fails the whole command ("no matches found"). List the directory first, or use `find`. macOS has no `timeout`.
- **Deleting files:** agent safety checks block `rm -rf` with globs after `cd`, rightly so. Remove tracked files with `git rm $(git ls-files <dir>)`, which is recoverable, or with explicit absolute paths; `git rm` also removes now-empty folders, so `mkdir -p` before copying replacements in.

