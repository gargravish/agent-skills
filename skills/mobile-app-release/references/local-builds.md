# Local EAS builds (Mac) — recipe + troubleshooting

Why local: `eas build --local` skips the cloud queue and credit spend, iterates
faster, and produces the identical signed artifact. Credentials (iOS dist cert +
provisioning profile, Android keystore) stay **EAS-managed** — the local build
downloads them automatically; no credentials.json needed. Verified: Android
`.aab` ≈10 min of Gradle; iOS `.ipa` after a one-time platform download.

## The environment block (paste before EVERY build — agent shells are non-login)

```bash
cd <app-dir>
# 1. Node LTS — the machine's default Node may be too new (v25 broke
#    Metro/prebuild/hermes with cryptic crashes). Pin v20/v22 explicitly:
export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"   # ls ~/.nvm/versions/node for exact version
# 2. iOS only — CocoaPods aborts on non-UTF-8 locales:
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
# 3. Android only — SDK path is unset in fresh shells:
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
# 4. Always — the "Computing project fingerprint" step reliably HANGS on repos
#    with big node_modules/assets. Skipping only disables EAS build caching,
#    never changes the binary:
export EAS_SKIP_AUTO_FINGERPRINT=1
```

## Build commands

```bash
# Android (.aab for Play):
npx eas-cli build --platform android --profile production --local \
  --non-interactive --output ./build/app-android.aab > /tmp/and-build.log 2>&1

# iOS (.ipa for App Store):
npx eas-cli build --platform ios --profile production --local \
  --non-interactive --output ./build/app-ios.ipa > /tmp/ios-build.log 2>&1
```

Execution discipline (each learned the hard way):

- **Run in background, redirect to a log FILE.** Piping to `| tail` buffers
  until EOF — you see nothing for 20 minutes and can't tell hang from progress.
- **Exit code lies if you append `; echo EXIT=$?`** — the echo's success masks
  the build's failure. Trust the log's final `Build successful` line, or run
  the bare command and use the process exit.
- **Never `git commit` while a local build runs.** The EAS builder shallow-
  clones the repo mid-build; a concurrent ref write can collide, leaving stale
  `.git/*.lock` files and a *vanished branch ref* (`fatal: unknown revision
  HEAD`). Recovery: the interrupted SHA is inside
  `.git/refs/heads/<branch>.lock` — verify the object exists
  (`git cat-file -t <sha>`), then `mv` the `.lock` onto the ref path and delete
  `HEAD.lock`/`index.lock`. Nothing is lost; don't panic-reclone.
- **Version numbers**: with `appVersionSource: "remote"` + `autoIncrement`,
  EAS bumps the build number at the START of every build — failed builds
  consume numbers (gaps are normal, never reuse). iOS buildNumber and Android
  versionCode are independent counters.
- A **production iOS .ipa cannot run on the Simulator** (device-signed). For a
  simulator smoke test use the `preview`/`development` profile or
  `npx expo run:ios`.
- **Local iOS builds can pass TestFlight yet be "Invalid Binary" at App Store
  submission — confirmed cause: ITMS-90111 "Unsupported SDK or Xcode
  version".** A .ipa built with a beta/non-RC Xcode processes fine, installs
  via TestFlight, then flips the version to Invalid Binary the moment it's
  submitted (submissions must use release/RC Xcode+SDK; TestFlight doesn't
  care). Apple emails the ITMS code within minutes — read it before
  theorizing. Fixes: update the Mac's Xcode to the current release/RC before
  building submission binaries, or keep the proven split — **local builds for
  TestFlight/testers, cloud EAS build (vetted toolchain) for the App Store
  submission binary.** Recovery is painless: swap the version back to a
  known-good build and resubmit — metadata, notes and attached IAPs survive
  the swap. (Hit for real: local Xcode 26.6 beta seed 17F113, 25 Jul 2026.)

## Known build failures → fixes

| Log says | Fix |
|---|---|
| `iOS X.Y is not installed … download the platform` | Fresh/updated Xcode ships WITHOUT the iOS platform component (~8.5 GB). No sudo needed: `xcodebuild -downloadPlatform iOS` (background it; prints `Installing…` at the end). Then rebuild. Cloud builds never hit this — it's local-only. |
| CocoaPods UTF-8 warning then pod failure | The `LANG`/`LC_ALL` exports were missing. |
| `sdkmanager`/`ANDROID_HOME` not found | The Android exports were missing. |
| Metro/prebuild/hermes crash, weird stack | Wrong Node — re-export the LTS PATH. |
| Hangs at `Computing project fingerprint` | `EAS_SKIP_AUTO_FINGERPRINT=1` was missing. Kill (`pkill -f "eas-cli build"`), re-run with it. |
| `expo doctor` version-mismatch warnings mid-build | Non-fatal; the build continues. Align versions later with `npx expo install --check`. |
| fastlane Ruby errors (ancient system Ruby) | Rare; `brew install ruby` and retry. |
| `simctl`/`xcrun` commands hang forever after an Xcode update | The `simctl` wrapper runs `xcodebuild -runFirstLaunch`, which waits for the user's admin password (new CoreSimulator). The human must open Xcode once and install components. Workaround meanwhile: `export DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer` (or any Xcode whose CoreSimulator is current). |
| Xcode 27+: `IPHONEOS_DEPLOYMENT_TARGET is set to 9.0/12.0 … supported range is 15.0…` in Pods | Old pods declare ancient targets. Local test builds: pass `IPHONEOS_DEPLOYMENT_TARGET=15.1` on the xcodebuild line; durable fix: a Podfile post_install hook (expo-build-properties / config plugin) raising pod targets. |
| `expo run:ios`: "Can't determine id of Simulator app" | Expo resolves Simulator.app via `xcode-select`, ignoring DEVELOPER_DIR. Build with `xcodebuild -workspace ios/X.xcworkspace -scheme X -configuration Release -sdk iphonesimulator -destination id=<UDID>` and `xcrun simctl install/launch` instead. |
| Cloud build: `Failed to upload the project tarball … write EPIPE` at ~50–60 MB | EAS packs the whole git repo. Add a repo-root `.easignore` (`/*` then `!/mobile`, plus the usual ignores — `.easignore` REPLACES `.gitignore` for EAS). Tarball drops to a few MB. |

## Submitting binaries

```bash
npx eas-cli submit --platform ios --path ./build/app-ios.ipa --non-interactive
npx eas-cli submit --platform android --path ./build/app-android.aab --non-interactive
```

- iOS `--non-interactive` needs `ascAppId` in `eas.json` (`submit.production.ios`).
- **The CLI spinner "Submitting" is NOT ground truth.** The submission is a
  server-side EAS job that can sit `IN_QUEUE` for many minutes while the CLI
  appears hung. Before ANY retry, check the real state: the submission URL the
  CLI printed, App Store Connect → TestFlight, or EAS GraphQL
  (`POST https://api.expo.dev/graphql`, header `expo-session:` from
  `~/.expo/state.json` → `query{submissions{byId(submissionId:"…"){status error{message}}}}`).
  **A blind retry of an already-succeeded upload fails opaquely with a
  duplicate-build-number error** and EAS shows ERRORED with null details —
  this wasted a full debugging cycle once.
- After upload succeeds, Apple "Processing" takes 10–60 min during which the
  build is INVISIBLE in TestFlight. Do not rebuild; wait, or check for an
  ITMS-xxxx rejection email.
- Uploading a new TestFlight build does NOT disturb a version already Waiting
  for Review — the version stays pinned to its selected build. Safe to keep
  shipping tester builds during review.
- Transient upload SSL failures ("bad record mac") happen; retry is safe ONLY
  after confirming the first attempt didn't complete (see above).

## eas.json shape that works

```jsonc
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" },
      "env": {
        "EXPO_PUBLIC_API_BASE": "https://…",        // public config only
        "EXPO_PUBLIC_RC_IOS_KEY": "appl_…",          // public SDK keys OK here
        "EXPO_PUBLIC_RC_ANDROID_KEY": "goog_…"
      }
    }
  },
  "submit": { "production": {
    "android": { "track": "internal" },
    "ios": { "ascAppId": "<numeric ASC app id>" }
  } }
}
```

Mirror the same `env` into `development`/`preview` profiles so dev builds
exercise the same code paths.
