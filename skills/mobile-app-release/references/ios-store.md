# App Store Connect — agreements, subscriptions, review

## The Paid Apps Agreement — do this before anything monetized

**Apple serves ZERO in-app products — production, sandbox, AND TestFlight —
until the Paid Apps Agreement is Active.** The app-side symptom is an empty
product fetch, which a well-gated app renders as "coming soon". It looks
exactly like a RevenueCat/StoreKit bug; it never is. Check
ASC → **Business (Agreements, Tax, and Banking)** FIRST when iOS prices
don't show.

Path to Active (individual/sole-proprietor, ~30 min of forms + Apple
verification):
1. Complete **legal entity** info (a banner blocks signing until done).
2. Open the Paid Apps Agreement → accept.
3. **Banking**: add the payout account. Verification usually clears within
   hours (Apple says up to 24h; observed faster). Status: Processing → Active.
4. **Tax**: for a non-US individual, the W-8BEN + Certificate of Foreign
   Status. Signer "Title" field for a sole proprietor = **"Owner"**.
5. Status flips New → Processing → **Active**; sandbox products start loading
   shortly after (no new build needed).
6. MRDP compliance prompt ("do your apps provide personal services?"):
   **No** for pure software/subscription apps — "personal services" means
   marketplaces of human labor (tutors, drivers), not app features.

## Subscriptions setup

- Monetization → Subscriptions → create a **Subscription Group**, then the
  auto-renewable products (e.g. `premium_monthly` 1-month, `premium_annual`
  1-year). Product IDs are **permanent** — lowercase, no rename, no reuse.
- Each product needs: reference name, localization (display name +
  description), price, and a **review screenshot**. The screenshot must have
  **iPhone screenshot dimensions** — a 1024×1024 square is the *promo image*
  spec and gets rejected here; a full-device screenshot of the paywall works.
- Set products to **Ready to Submit**. The FIRST auto-renewable sub can only
  be submitted **attached to an app version** ("In-App Purchases" section on
  the version page → add both) — never alone.
- **Rejection silently ejects your IAPs.** When a submission is rejected, the
  subscriptions that rode with it fall back to "Prepare for Submission" — and
  resubmitting the app version does NOT re-attach them. After EVERY rejection/
  resubmission, open Monetization → Subscriptions → the group and confirm each
  product says **"Waiting for Review"**; if it says "Prepare for Submission"
  with an "Add for Review" button, click it to re-add the group to the pending
  submission (no new version needed). Unsubmitted products also serve
  unreliably in sandbox, compounding the "paywall empty" confusion.
- Credential for server-side receipt validation (RevenueCat): the
  **In-App Purchase key** (.p8) from Users and Access → Integrations →
  In-App Purchase — required for StoreKit 2. The legacy App-Specific Shared
  Secret is NOT sufficient. Also note Issuer ID + Key ID.

## One-time purchases (non-consumable "Full" / lifetime unlock)

- For an app with no server, a single **non-consumable** product is the simplest trustworthy model:
  - StoreKit restores it on any device with the same Apple ID;
  - no webhook or entitlement server is needed;
  - "Restore Purchases" must still be visible.
- **Family Sharing** (a checkbox on the IAP in ASC) lets up to five family members use the purchase.
  **Once turned on it can't be turned off.** Decide before first sale; it's a strong value lever
  for family and education apps.
- Introductory "launch price": schedule a price change in ASC rather than editing the base price.
  Only say "launch price" or "was £X" in copy while it's literally true.
- Base-price auto-equalisation makes UK or US prices steep in lower-income storefronts. Set
  manual local price points where that matters (owner decision; pricing changes need the owner's
  approval).

## Driving the ASC web UI through a browser agent

- ASC is a React app: programmatic `value` setting (form_input / JS) doesn't register, and Save
  stays disabled. **Click the field and type**, then check the DOM value and that Save enabled.
- Long `type` actions can time out on the tool side yet still complete; read the field back
  before retyping (retyping duplicates text).
- App **name must be unique per localisation**. A name accepted for en-GB can be "already in use"
  in en-US, so have an alternative ready.
- Never enter passwords; if ASC asks for re-authentication, hand back to the owner.

## Submission mechanics

- Version page → select the processed build → attach subscriptions →
  App Review Information: **Sign-in required = Yes** with the demo account
  creds → paste review notes → Save → Add for Review → Submit.
- `ITSAppUsesNonExemptEncryption: false` in the Expo `ios.infoPlist` skips the
  export-compliance question at submit time.
- After upload, builds "Process" invisibly for 10–60 min before appearing in
  TestFlight/the build picker. The "5-10 minutes" message is optimistic.
- Sandbox purchases are free for reviewers and TestFlight testers; a real
  App Store account WILL be charged real money — for tester purchase-testing
  guidance see the Android license-tester analog; on iOS, TestFlight builds
  use the sandbox automatically.

## Demo account seeding (the 2.3 killer)

If any advertised feature is gated by BOTH payment and progress/content, a
fresh premium account still shows an empty state — and the reviewer reads
empty states as "feature not implemented" (guideline 2.3). Before every
submission:
1. Register the demo account (a `yourgmail+appreview@gmail.com` alias keeps it
   in a real inbox for email verification; pick an adult age band to skip
   parental-consent flows).
2. Pre-grant premium **server-side** (admin flag) — removes any purchase/
   webhook dependency from the review path.
3. Complete every content prerequisite so each gated feature shows REAL
   content (e.g. finish the placement test so exams unlock; win one quiz so
   the revision deck has an entry).
4. **Verify via API** (login as the account; assert entitlement, progress
   fields, and feature endpoints) — never assume the seeding worked.
5. Keep the password OUT of git; it goes in ASC's sign-in fields only.

## Rejection playbook (all personally survived)

- **2.1 "app exhibited a bug / error on every tap"** → usually a web-only
  API rendering on native (`expo-router/head` throws origin-config alerts on
  native navigation). Platform-split web-only components (`Foo.web.tsx` real,
  `Foo.tsx` no-op). Always test the release build on a device before submit.
- **2.3 "feature marketed but coming soon"** → seeded demo account (above) +
  review notes pointing at each feature's tab and the demo content by name.
- **4 "Design" — reviewed on an iPad** → the single most common cause for a
  phone-first app that ships `supportsTablet: true`: phone-sized type and a
  narrow phone column stranded on a large canvas, plus a portrait lock on a
  device people hold in landscape. Reproduce it before theorising — build to an
  iPad simulator and look. The durable fix is a responsive layer consumed by the
  SHARED UI PRIMITIVES (text/card/button), so type, padding and touch targets
  scale app-wide and each screen only picks its column structure; plus a font
  floor (Apple treats 11pt as the smallest comfortable size — 10–11pt labels
  read as "hard to read type" on any device), a wider content column on tablet,
  a taller tab bar with larger labels, and per-idiom orientation keys
  (`UISupportedInterfaceOrientations~ipad` = all four; iPhone stays portrait).
  The cheap alternative is `supportsTablet: false` (iPhone-only is an
  Apple-supported configuration and removes the review surface entirely).
  Second-round checklist (HIG, fetched as JSON from
  `developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`
  — the HTML pages are JS-rendered and scrape empty):
  - **Contrast**: text ≤17pt needs ≥4.5:1 (aim 7:1 small text) against every
    surface it sits on, in BOTH appearances. Compute it with a script — "dim"
    greys on near-black are the usual 3:1 offenders. Neon accents that pass on
    dark (gold ≈12:1) fail on white (≈1.6:1): a light palette needs deeper
    accents plus an `onAccent` ink token for text on filled buttons.
  - **Motion behind text**: animated/video backdrops must be scrimmed (or
    omitted) behind content; faded "locked/disabled" rows via opacity drop text
    contrast too — use a dashed/recessed card instead.
  - **Regular-width tab bar**: icon and label side by side
    (`tabBarLabelPosition: 'beside-icon'`), ~15pt label; avoid >5 tabs on phones.
  - **Targets**: every tappable ≥44pt — hunt down `style={{ height: 36–42 }}`
    overrides on shared buttons and chips.
  - Scale content that isn't SysText too (WebView/KaTeX question text, SVG
    diagrams) — they stay phone-sized otherwise.
  - Dark mode HIG says avoid an app-only appearance setting; if the product
    wants a toggle, default to **System** and offer Light/Dark as an override.
- **3.1.2(c) "subscription information missing"** → read WHICH half they mean.
  The usual failure is METADATA, not code: the **App Description must contain a
  functional Terms of Use (EULA) link** (Apple's standard EULA URL is fine) and
  the ASC Privacy Policy field must be filled. Separately the in-app purchase
  flow must state the subscription's title, length and price with working
  Terms + Privacy links. Fixing only the app and not the description repeats
  the rejection verbatim.
- **4.3(a) "spam/design"** → delete framework starter/template assets that are
  byte-identical across thousands of apps; rewrite listing copy to be
  distinctive; bump the version; reference the appeal in notes if you filed
  one. Never name trademarked franchises in metadata — evoke, don't cite.
- Resubmission notes template:
  ```
  DEMO ACCOUNT (premium pre-enabled): <email> / <password>
  WHAT CHANGED SINCE THE PREVIOUS SUBMISSION
  • <guideline #>: <one-line cause> — <one-line fix>.
  • <guideline #>: <feature> is live: <tab> → <exact taps to see it>.
  SUBSCRIPTIONS: <names + prices>. To test: register a fresh account in-app,
  tap Upgrade — purchases are free in Sandbox. Restore Purchases is on the
  same screen.
  ```

## Submitting through the App Store Connect API (learned on VocabAura, Oct 2026)

- An Admin API key (stored outside the repo) can do almost everything with PyJWT (ES256, 15-minute tokens):
  - version string, copyright, listing text per locale, support, marketing and privacy URLs, review notes;
  - age-rating answers (PATCH only; read them through `/v1/appInfos/{id}/ageRatingDeclaration`);
  - screenshots (reserve → PUT the upload operations → PATCH `uploaded` + MD5 → poll `assetDeliveryState`);
  - attaching the build, and `reviewSubmissions` → `reviewSubmissionItems` → `submitted: true`.
- **Not possible through the API:** App Privacy answers, the agreements, tax and banking status, and **attaching the first non-consumable purchase**. `inAppPurchaseSubmissions` returns 409 `FIRST_NON_CONSUMABLE_MUST_BE_SUBMITTED_ON_VERSION` whatever the order. Create the draft with the version through the API, then in the web console go to the purchase's page → **Add for Review** → the existing draft → **Submit for Review**, and confirm "2 Items Submitted". If a version already went without the purchase, cancel the review submission (`canceled: true`; the state becomes DEVELOPER_REJECTED, which is harmless) and redo it.
- 6.9" iPhone screenshots use the display type `APP_IPHONE_67` (1320×2868); 13" iPad uses `APP_IPAD_PRO_3GEN_129` (2064×2752). Take real simulator captures with `simctl io screenshot` while an integration test logs `SHOT <name>` and holds still. Set `simctl status_bar … override --time 9:41` first. In Flutter, pop routes with `NavigatorState.pop()`; `tester.pageBack()` looks for a Cupertino back button.
- Audit catches from that release:
  - no `PrivacyInfo.xcprivacy` in the app or the widget extension (UserDefaults in an App Group needs 1C8F.1);
  - a hard-coded fallback price shown when the store product hasn't loaded (wrong currency for the reviewer);
  - "Introductory offer" wording on a non-consumable (say "launch price", and only while a price change is actually scheduled);
  - age rating "parental controls" left at No in an app with a parent PIN;
  - permission text saying "this iPhone" in an app that also runs on iPad;
  - review notes pointing to an old "enter 12" adult check.

## Guideline 2.1 "Information Needed" on a first submission (VocabAura, October 2026)

- **What happens:** for an account with "limited App Review history", Apple marks the version **Rejected** and asks for:
  - a physical-device screen recording (latest OS, starting at launch, showing account flows, user-generated content controls and paid content where they exist);
  - six written answers: purpose and audience, setup, external services, regions, regulated or third-party material, and in-app purchases;
  - those answers added to the review notes as well.
- **Side effect:** the submission's in-app purchase drops back to "Ready to Submit".
- **Prevent it:** send all of it with the first submission (mobile-app-builder `review-kit.md`).
- **If it happens anyway:**
  1. Fix anything that looks unfinished in a new build. This also gives the recording a matching build.
  2. Save the answers to the notes through the API.
  3. Have the owner record on their iPhone with a precise script.
  4. Reply in the App Review thread with the text and the video attached.
  5. Swap in the new build and re-add the purchase from its page ("Add for Review" → draft).
  6. Resubmit.
- The reply box and the notes each hold 4,000 characters, so keep a tested copy in the repo.

