# Review readiness — audit, store copy, and replying to App Review

## Contents
1. Pre-submission audit (run it, don't skim it)
2. Store copy: fields, limits, templates
3. App Review notes template
4. Replying to a rejection
5. Android / Play specifics

## 1. Pre-submission audit

Walk the app on an **iPad Air 11" (portrait AND landscape)** and an iPhone, in **light AND dark**,
signed in as the demo account and as a fresh account. For each item, record evidence (screenshot
or command output), not a feeling.

**Design (guideline 4)**
- [ ] No text under 12pt after scaling; body ≥16pt; `contrast_check.py` passes for both palettes.
- [ ] Tablet uses a wider column, not a stranded phone column; tab bar icon+label side by side.
- [ ] Nothing animated behind text without a scrim; no opacity-faded text.
- [ ] All controls ≥44pt; no clipped labels at larger Dynamic Type sizes.
- [ ] Works in every orientation the Info.plist declares — **and every `<Modal>` passes
      `supportedOrientations`** (RN modals default to portrait and force-rotate an iPad).
- [ ] Measure the *visible box*, not `hitSlop` — audits (and reviewers' eyes) ignore hitSlop. Use a
      44×44 wrapper with negative margin for icon buttons.
- [ ] Disabled controls use colour, never faint colour × low opacity (reads as "hard to read").
- [ ] WebView/KaTeX content ignores Dynamic Type: scale its font by `PixelRatio.getFontScale()`
      (capped) so maths doesn't shrink beside large body text. Answer options ≥ question size.
- [ ] `maxFontSizeMultiplier` on headings/buttons/inputs; inputs use `minHeight`, never `height`.

**Completeness (2.1 / 2.3)**
- [ ] Release build tested on device/simulator — no web-only component on native, no error alerts.
- [ ] No "coming soon / next update" copy for features that exist; no empty state on the review
      path (seeded demo account covers every gated feature; verified via API today).
- [ ] Every advertised feature reachable in ≤2 taps; review notes say where.
- [ ] No raw server/infra text reaches the UI ("HTTP 502", "missing API key", "Network request
      failed"): map 5xx/technical messages to one friendly line in the API client.

**Payments (3.1.x)**
- [ ] Digital goods only via IAP on iOS (web checkout links hidden in the iOS app).
- [ ] Paywall states title, length, price, auto-renew, Terms (EULA) + Privacy links, Restore.
- [ ] **App Description contains the Terms of Use (EULA) link**; Privacy Policy URL field set.
- [ ] Subscriptions attached to the version and "Waiting for Review" (a rejection silently ejects
      them — see `mobile-app-release`).

**Originality & accuracy (4.3 / 2.3.1 / 5.2)**
- [ ] No franchise names in metadata; no quoted franchise text or art in the app
      (`grep -rn` for character names, catchphrases); no template assets.
- [ ] Every marketing claim true for every tier it's claimed for.
- [ ] No religious/political/violent copy that doesn't fit the age rating (kids apps especially).

**Privacy (5.1)**
- [ ] Sign in with Apple uses the native `AppleAuthenticationButton` (HIG), placed first.
- [ ] No unused permission strings (e.g. expo-secure-store adds Face ID unless
      `faceIDPermission: false`).
- [ ] iPad listing screenshots are real iPad captures (a phone frame on iPad slots = 2.3.3).
- [ ] In-app account deletion; privacy labels match actual collection; no third-party trackers in
      a kids app; permission prompts have purpose strings; `ITSAppUsesNonExemptEncryption` set.

Deeper automated passes: `app-store-review` and `apple-appstore-reviewer` (iOS),
`play-policy-insights` (Android).

## 2. Store copy: fields, limits, templates

| Field (App Store Connect) | Limit |
|---|---|
| App name | 30 |
| Subtitle | 30 |
| Promotional text (editable without review) | 170 |
| Keywords (comma-separated, no spaces needed) | 100 |
| Description | 4000 |
| What's New | 4000 |
| App Review notes | 4000 |

Put the copy in a JSON file and run `python3 scripts/asc_copy_lengths.py copy.json` — it checks
limits and flags missing EULA/privacy links in the description and risky words ("coming soon",
"next update", "beta").

Description skeleton for a subscription app:
```
<One-sentence promise.>

<SECTION: why people use it — 5–8 bullets of real, reachable features>

<SECTION: built for every screen — iPhone + iPad, Light and Dark>

<SECTION: safe by design — no ads, no trackers, parental controls (if true)>

FREE AND PREMIUM
<What free includes.> <What premium adds — only true claims.>

<Premium> is an auto-renewing subscription: <price>/month or <price>/year (prices may vary by
region). Payment is charged to your Apple ID account at confirmation of purchase. The subscription
renews automatically unless it is cancelled at least 24 hours before the end of the current
period, and your account is charged for renewal within 24 hours before the end of the current
period. You can manage or cancel your subscription in your App Store account settings at any time
after purchase.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: <your privacy URL>
```

Support URL must lead to a real way to contact you (a landing page with a mailto link works) —
check that `/support` isn't just a SPA fallback to the homepage without contact details.

## 3. App Review notes template

```
DEMO ACCOUNT (<what's pre-enabled>): please use the credentials in the Sign-In Information fields.

WHAT CHANGED SINCE SUBMISSION <id> (<date>, <device>)
<Guideline N – title>
• <cause in one line> — <fix in one line, with concrete numbers>
...

HOW TO TEST THE SUBSCRIPTION
<Product names + prices>. The demo account already has <tier>. To test a purchase, register a
fresh account and open <path>; purchases are free in the Sandbox. Restore Purchases is on the
same screen.

WHERE THE FEATURES ARE
<Tab>: <feature>. <Tab>: <feature> (<tier>). ...

<One line on audience + privacy.> Thank you for reviewing it.
```
Credentials go in the Sign-In fields only — never in git or docs.

## 4. Replying to a rejection

Reply in the submission's message thread (not a new submission note) and attach evidence Apple
asked for (e.g. a screen recording of the paywall for 3.1.2(c)). Structure: thanks → per guideline
"what we changed" in two or three concrete sentences → pointer to demo account → sign-off. Mention
the new build number. Then resubmit.

Pattern for design rejections: reproduce first (the exact device from the rejection, both
orientations, both appearances), fix at the primitive/token level so it's app-wide, re-audit,
then reply with numbers (font floor, contrast ratio, target size) — they read as a deliberate fix,
not a tweak.

## 5. Android / Play specifics

- Personal accounts: closed testing with 12+ testers for 14 continuous days before production.
- Families policy for kids apps: no ads SDKs that aren't Families-certified, data safety form must
  match reality (`play-policy-insights` cross-checks code vs declarations).
- Target the latest required API level; edge-to-edge is enforced on recent targets (`edge-to-edge`
  skill); tablets/foldables → `adaptive`.
- Play Billing Library upgrades have deadlines (`play-billing-library-version-upgrade`).
