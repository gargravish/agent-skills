---
name: mobile-app-release
description: >-
  End-to-end playbook for building, monetizing and shipping Expo/React Native mobile apps to the
  Apple App Store and Google Play — local EAS builds on a Mac, store account setup (agreements,
  merchant profiles), in-app subscriptions via RevenueCat, TestFlight/closed-testing, App Review
  anti-rejection tactics, and a large field-tested troubleshooting library. Use this skill for ANY
  mobile app store work: "build the app", "set up in-app purchases", "submit to the App Store /
  Play Store", "why was my app rejected", "paywall shows coming soon", "set up
  RevenueCat/StoreKit/Play Billing", "closed testing", "TestFlight", store rejections (2.1, 2.3,
  4.3), or starting a brand-new mobile app project that will eventually ship to the stores — even
  if the user doesn't name a specific store or tool. Also covers Flutter/xcodebuild archive,
  export and upload (including expired Xcode accounts) and one-time non-consumable purchases.
---

# Mobile App Release Playbook (Expo/EAS + RevenueCat)

Field-tested on a real commercial launch (MathMonarch, 2026): two Apple
rejections recovered, IAP wired on both stores, every gotcha below was hit for
real. The skill has two jobs: (1) sequence the work in the order the stores
actually allow, and (2) stop you from re-losing hours to known traps.

**Sister skill:** `mobile-app-builder` covers the BUILD phase — architecture, the review-proof
design system (light/dark, contrast, iPad), the testing harness and the pre-submission audit with
store-copy tooling. Use it before this one; use this one to build, submit and operate the stores.
Specialised installed skills for store mechanics: `eas-app-stores`, `eas-workflows`,
`revenuecat-*`, `app-store-review`, `apple-appstore-reviewer`, `play-policy-insights`, `aso`.

## Route to the right reference

| Working on… | Read |
|---|---|
| Building an .ipa/.aab locally, build failures, submitting binaries | `references/local-builds.md` |
| App Store Connect: agreements, subscriptions, TestFlight, App Review | `references/ios-store.md` |
| Play Console: merchant profile, subscriptions, closed testing, service accounts | `references/android-store.md` |
| RevenueCat wiring, webhooks, entitlements, "prices don't show" | `references/revenuecat.md` |

Read the relevant file BEFORE acting — most store operations are one-way doors
(product IDs are permanent, agreements gate everything, retries create
duplicate-build errors).

## The golden sequencing rules

Stores enforce a hidden dependency order. Getting it wrong costs days:

1. **Start store paperwork FIRST, in parallel with coding.** Apple's Paid Apps
   Agreement (legal entity → sign → banking → tax) and Google's payments/
   merchant profile are the longest poles and gate everything monetized.
   Critically: **Apple serves ZERO IAP products — even in sandbox/TestFlight —
   until the Paid Apps Agreement is Active.** A perfectly-wired app shows an
   empty paywall until then. This masquerades as a code bug; it never is.
2. **Google Play needs a build before subscriptions can exist** (the console
   hides "Create subscription" until a billing-capable build is uploaded), and
   your app needs the store products before its paywall works. Break the
   chicken-and-egg with **config-gating** (below) and plan for **two builds**:
   one to unlock the console, a second with the store SDK key baked in.
3. **Apple requires the FIRST auto-renewable subscription to be submitted WITH
   a binary** — you cannot ship the IAP alone. Attach the subscriptions to the
   version before submitting for review.
4. **One entitlement, many rails.** Server database is the single source of
   truth for who is premium. App Store and Play purchases flow through
   RevenueCat → webhook → server; web billing (e.g. Stripe) stays a separate
   rail hitting the same server field. Do NOT wire Stripe into RevenueCat if
   web billing already works — both rails converging on one server flag is
   simpler and battle-tested.

## Config-gating (the architecture that makes all of this shippable)

Gate every paid surface behind build-time env keys (Expo: `EXPO_PUBLIC_*` in
`eas.json` per-profile `env`). No key → paywall renders a harmless
"coming soon"; key present → real store buttons. Why this matters:

- You can ship store builds BEFORE products/agreements exist (unblocks Google's
  build-first rule and Apple review of free features).
- A build can never crash or show dead buy-buttons because config is missing.
- Public SDK keys (`appl_…`, `goog_…`, Stripe price ids) are safe to commit in
  `eas.json`; SECRET values (webhook auth tokens, .p8 keys, service-account
  JSON, App-Specific Shared Secret, demo-account passwords) never go in git —
  they are pasted directly into the service (Cloud Run env, RevenueCat, ASC).
- Platform-split modules keep native billing out of the web bundle:
  `purchases.ts` (native, react-native-purchases) + `purchases.web.ts`
  (no-op exports, `IAP_ENABLED=false`). Same pattern for anything web-only —
  e.g. `expo-router/head` is WEB-ONLY and throws error alerts on every native
  navigation if rendered there (a real Apple 2.1 rejection): split it.

## Paywall requirements (both stores reject without these)

- A visible **Restore Purchases** control (≥44dp target) near the buy buttons.
- Auto-renew disclosure text + tappable **Terms** (Apple's standard EULA URL is
  fine) and **Privacy** links (Apple 3.1.2).
- Use the store-reported localized `priceString`, not hardcoded prices —
  hardcoded currency is wrong for most of the world.
- Layout: on phones stack plans vertically with the paid plan FIRST; never use
  fixed control heights (labels clip at large system font scales — use
  minHeight + wrapping); give each plan's CTA a distinct fill color.

## Review anti-rejection checklist (Apple; Google analog applies)

The rejections actually hit, and their cures:

- **2.1 (crash/bug on tap):** a web-only component rendering on native. Test a
  release-profile build on-device before submitting, not just Metro dev.
- **2.3 (feature "marketed but coming soon"):** the reviewer opened a gated
  feature on a FRESH account and saw an empty state. Cure: a **seeded demo
  account** — pre-grant premium server-side (no purchase/webhook dependency),
  complete whatever content-unlocks the features need (e.g. finish placement,
  win one quiz) so every advertised feature demonstrably works. Verify the
  seeding via API before submitting. Put credentials in App Review sign-in
  fields AND notes.
- **4.3(a) (spam/template):** purge framework starter assets byte-identical to
  thousands of template apps; distinctive listing copy; never name trademarked
  franchises in metadata.
- **Review notes template:** demo credentials → "what changed since last
  submission" (map each prior rejection to its fix) → where each gated feature
  lives → how to test the purchase ("register a fresh account; purchases are
  free in Sandbox") → thanks.
- Reviewers test IAP **free in Apple Sandbox** / as **Google license testers**.
  Neither store charges reviewers; don't build fake bypasses for them.

## Working with the human

You cannot drive the user's ASC / Play Console / RevenueCat accounts. For store
setup, give **one step at a time** with exact field values, wait for
confirmation or a screenshot, and adapt — console UIs shuffle constantly and a
wall of 12 steps always desyncs from reality. Ask for screenshots on any error;
they diagnose faster than descriptions. Anything you CAN verify yourself
(webhook auth via curl, demo-account state via API, build status via CLI/
GraphQL), verify yourself — never ask the human to check what you can check.

## Quick triage index

| Symptom | Likely cause | Reference |
|---|---|---|
| Paywall shows "coming soon" on iOS, Android fine | Paid Apps Agreement not Active | ios-store.md |
| Paywall "coming soon" on one platform | Missing that platform's SDK key in the build, or offering has no products for that store | revenuecat.md |
| Build hangs at "Computing project fingerprint" | Set `EAS_SKIP_AUTO_FINGERPRINT=1` | local-builds.md |
| iOS build: "iOS X.Y is not installed" | `xcodebuild -downloadPlatform iOS` | local-builds.md |
| Metro/prebuild crashes on latest Node | Use Node LTS (v20/v22) via explicit PATH | local-builds.md |
| `eas submit` hangs at "Submitting" | Job queued server-side; NEVER blind-retry (duplicate build) | local-builds.md |
| Play: no "Create subscription" button | No billing-capable build uploaded yet | android-store.md |
| Can't promote to Play production | Personal-account closed-testing rule (12–20 testers × 14 days) | android-store.md |
| RevenueCat "Could not check" badges | Cosmetic (missing optional ASC API key) or Play permission propagation (≤36h) | revenuecat.md |
| Purchase succeeds but premium doesn't unlock | Webhook auth/env missing, or app_user_id ≠ your user id | revenuecat.md |
| Git branch ref vanished mid-build | EAS local build's shallow-clone collided with a commit | local-builds.md |
| Flutter/xcodebuild export: "Failed to Use Accounts" | Xcode Apple Account session expired → local export + Transporter; API key durable fix | local-builds.md |
| "Redundant Binary Upload" | That build number already reached ASC → don't retry; bump the build number | local-builds.md |
| ASC Save stays disabled after filling a field | React form ignores programmatic values → click and type | ios-store.md |
| One-time unlock, family pricing, launch price | Non-consumable + Family Sharing (irreversible) | ios-store.md |
