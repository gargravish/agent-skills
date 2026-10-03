---
name: mobile-app-builder
description: >-
  Field-tested playbook for BUILDING iOS/Android apps (Expo + React Native first; native SwiftUI /
  Jetpack Compose via routed skills) so they look modern, work on every device and pass App Store /
  Google Play review the first time. Covers project kickoff and architecture, a review-proof design
  system (light + dark themes, WCAG/HIG contrast, iPad/tablet layouts, 44pt targets, motion behind
  text), config-gated monetization, a local testing harness (web at device sizes, fixture API,
  simulator), and a pre-submission review audit with ready-to-paste store copy. Use this skill
  whenever the user starts, designs, builds, restyles or audits a mobile app — "build me an app",
  "new Expo project", "make it work on iPad", "add dark mode / light mode", "make it look native",
  "why was my app rejected for design", "is this ready for the App Store", "write the store listing"
  — even if they never say "skill". For the build/submit/IAP-setup/store-console mechanics, pair it
  with mobile-app-release. Also covers Flutter offline-first apps (bundled content database,
  backups, widget/integration tests, native rating prompts) and authoring large content corpora
  with AI agents plus independent review.
---

# Mobile App Builder

Distilled from shipping MathMonarch (Expo SDK 54 app for iOS, Android and web, 2026): four Apple
rejections — 4.3(a) spam, 2.1 bug, 2.3 "coming soon", then 4 design ("hard to read type, crowded",
reviewed on an iPad) + 3.1.2(c) subscriptions — each fixed, plus the patterns that would have
avoided them. The job of this skill is to make the NEXT app avoid all of that by construction.
Extended with VocabAura (Flutter, fully offline, one-time purchase, 2026): a 9,000-entry bundled
content database, an 18,000-sentence AI-drafted corpus reviewed by a second agent, and a native
rating-prompt policy.

**Sister skill:** `mobile-app-release` owns local/cloud builds, store consoles, agreements,
RevenueCat wiring, TestFlight/closed testing and the rejection playbook. This skill owns everything
before that: what to build and how, so review is a formality.

## How to use this skill

1. Identify the phase (table below) and read the matching reference before acting.
2. Route framework-specific work to the specialised installed skills (routing table) — they are
   current and authoritative for their APIs. This skill supplies the cross-cutting judgement.
3. Before calling any build "ready", run the review-readiness audit
   (`references/review-readiness.md`). Most rejections are visible in the simulator on an iPad in
   under ten minutes; the audit makes you look.

| Phase | Read |
|---|---|
| New project, stack & architecture decisions, auth, API client, config gating | `references/architecture.md` |
| Theme, light/dark, typography, contrast, tablet layout, motion, onboarding | `references/design-system.md` |
| Proving it works: web at device sizes, local fixture API, simulator, no-password sign-in | `references/testing-harness.md` |
| Pre-submission audit, store listing copy, review notes, replying to a rejection | `references/review-readiness.md` |
| First-submission kit: Guideline 2.1 answers, recording script, release-readiness tests, licences | `references/review-kit.md` |
| Flutter or any offline-first app: content DB, backups, practice UI, widget-test pitfalls, rating prompt | `references/flutter-offline-apps.md` |
| Writing or reviewing a large content corpus (examples, questions, definitions) with AI agents | `references/content-at-scale.md` |
| Build binaries, store consoles, IAP products, TestFlight, rejections by number | `mobile-app-release` skill |

## The golden rules (each one cost a rejection or a day)

1. **Design for iPad from day one, or turn it off.** `supportsTablet: true` means App Review WILL
   open the app on an iPad. A phone column marooned on an 820pt canvas with 10–11pt labels is an
   instant guideline-4 rejection. Build a responsive layer into the shared primitives (text, card,
   button) so every screen scales for free; or set `supportsTablet: false` deliberately.
2. **Contrast is measured, not eyeballed.** Every text colour ≥ 4.5:1 against every surface it sits
   on, in every appearance. Run `scripts/contrast_check.py` on the palette whenever it changes. The
   classic failure is a "faint" grey on near-black at ~3:1.
3. **Nothing moves behind text.** Video/particle/animated backdrops get a scrim behind content or
   are omitted; faded (low-opacity) rows are illegible rows. Reviewers call both "hard to read".
4. **Ship both appearances, default to System.** Apple's HIG discourages app-only appearance
   settings, so follow the device by default and offer Light/Dark as an override (Profile +
   first-run). Every visual — including hero art — needs a version designed for each appearance,
   not just recoloured tokens.
5. **Every tappable thing ≥ 44pt** (48dp Android). Hunt `height:` overrides on shared buttons.
6. **No empty states on the review path.** Gated or progress-locked features must be demonstrable
   on a seeded demo account; "coming soon" copy for a shipped feature is a 2.3 rejection.
7. **Metadata is part of the build.** Subscription apps need the Terms of Use (EULA) link in the
   App Description and the Privacy URL field — code fixes alone repeat 3.1.2(c) verbatim.
8. **Own your words and art.** No quoted franchise text, trademarked names or template assets
   (4.3(a) + copyright). Keep marketing claims literally true (2.3.1): "fresh questions every time"
   must not be claimed for a tier where they repeat.
9. **Config-gate every paid surface** behind build-time env keys so a build can never show a dead
   buy button, and the server is the single source of truth for entitlements.
10. **Ratings go through the native sheet only**, after a successful finished session, spaced out
    and capped (Apple 5.6.1 bans custom review prompts; Google bans "do you like it?" pre-questions).
    See `flutter-offline-apps.md` §6.
11. **Generated content is a draft until independently reviewed.** Deterministic validators first,
    then a separate agent review; expect about 5% corrections (`content-at-scale.md`).
12. **Test the unhappy paths, then the whole journey on both platforms.** Build a negative-path
    matrix (bad input, platform errors, corrupt or stale storage, clock changes, force-close,
    restore, a child trying to get round gates) and make missed taps fatal in widget tests
    (`testing-harness.md` §6–7). Most real bugs found in VocabAura came from these rows.
13. **Push early, push often.** A repo under an iCloud-synced folder vanished with unpushed commits.
    Keep projects outside `~/Documents`/iCloud; branch → PR → merge the same day.
14. **Assume a first submission gets Guideline 2.1 "Information Needed".** New developer accounts are asked for a physical-device recording and seven written answers, and the purchase is ejected meanwhile. Ship the answers in the review notes and attach the recording with the first submission; gate releases on the review-kit tests (`references/review-kit.md`).

## Routing table — use the specialised skills

| Need | Skill(s) |
|---|---|
| Any Expo/EAS task — start here, it routes further | `expo-overview` |
| Folder layout for a NEW Expo app | `expo-project-structure` |
| Navigation, tabs, stacks, modals, sheets | `expo-router` |
| Native look: HIG styling, semantic colours, SF Symbols, native controls | `expo-native-ui`, `expo-ui` (SwiftUI/Compose-backed components) |
| Theme tokens & component conventions | `expo-design-system` + this skill's `design-system.md` |
| Motion, gestures, haptics | `expo-animation` |
| Networking, loading/empty/error states, offline | `expo-data-fetching` |
| RN performance (FPS, TTI, lists, re-renders) | `react-native-best-practices`, `vercel-react-native-skills` |
| Dev clients / internal TestFlight builds | `expo-dev-client`; store releases → `eas-app-stores` + `mobile-app-release` |
| CI pipelines, OTA updates, cloud simulators | `eas-workflows`, `eas-update`, `eas-simulator` |
| SDK / RN upgrades | `expo-upgrade`, `upgrading-react-native` |
| Native iOS (SwiftUI) | `swiftui-expert-skill`, `swiftui-pro`, `mobile-ios-design` |
| Native Android (Compose) | `mobile-android-design`, `adaptive` (tablets/foldables), `edge-to-edge`, `styles`, `testing-setup` |
| Subscriptions / paywalls | `integrate-revenuecat`, `revenuecat-purchase-flow`, `revenuecat-entitlements-gate`, `revenuecat-paywall-design`, `revenuecat-testing-setup`, `revenuecat-troubleshoot`; Android billing upgrades `play-billing-library-version-upgrade` |
| Review audits | `app-store-review`, `apple-appstore-reviewer` (iOS); `play-policy-insights` (Android) |
| Store listing optimisation | `aso` |

## Kickoff checklist (new app)

Work through this with the user before writing feature code — each item is cheap now and
expensive after launch:

- **Identity:** bundle id / package (permanent), app name availability, original name + art (no
  franchise references), support email + privacy page URL + (if subscriptions) EULA choice.
- **Audience:** kids (under 13) → parental consent, no third-party trackers, age-band not DOB;
  affects Families policy (Play) and Kids category (Apple).
- **Devices:** iPhone only, or iPhone + iPad (then the responsive layer is mandatory); Android
  phones + tablets; web export?
- **Monetization:** free / paid / subscriptions → start Apple Paid Apps Agreement + Play merchant
  profile NOW (days of lead time; see `mobile-app-release`).
- **Stack:** Expo (latest SDK) + Expo Router + TypeScript + Zustand + a typed API client; React
  Compiler on. Native (SwiftUI/Compose) only when a capability demands it.
- **Theme:** copy `assets/theme-starter/` (live light/dark palettes, contrast-checked tokens,
  responsive layer, appearance store + picker, shared primitives) — see `design-system.md`.
- **Review path:** decide the demo account + seeding plan now; every feature must be reachable by
  a reviewer in two taps.

## Definition of done for a screen

- Renders correctly in **light and dark**, on **iPhone portrait**, **iPad portrait and landscape**,
  and Android phone — checked, not assumed (`testing-harness.md`).
- All text through the shared primitives (scaled, floored at 12pt, contrast-checked tokens).
- Loading, empty and error states designed; empty states explain how to fill them.
- Tappables ≥ 44pt with accessibility labels/roles; Dynamic Type not disabled.
- No hardcoded colours outside the palette (grep for `#` and `rgba(` in the diff).
