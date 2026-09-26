# Google Play Console — merchant setup, subscriptions, testing tracks

## Order of operations (the console enforces this silently)

1. **Payments/merchant profile** (Settings → Payments profile). Until it
   exists, Monetize → Subscriptions only shows "Upload a new APK". Fields for
   an individual: business name = your app/brand (public on receipts),
   category ≈ "Computer Software", support email (public!), credit-card
   statement name = short recognizable brand (≤22 chars).
2. **Upload a billing-capable build** to ANY track (internal is fine). "Create
   subscription" stays hidden until a build containing the billing permission
   exists. A build made with the RevenueCat/react-native-purchases dependency
   qualifies even WITHOUT the store SDK key configured — this is what breaks
   the chicken-and-egg: build #1 (no key, paywall "coming soon") unlocks the
   console; build #2 (key baked in) is the real one.
3. **Create the subscription**: ONE product (e.g. `premium`, permanent ID) with
   **base plans** `monthly` (1 month, auto-renewing) and `annual` (1 year).
   Defaults are fine (7-day grace, auto account-hold, charge-at-next-billing,
   resubscribe allow). Then per base plan: set price (accept auto-converted
   regional prices) and **Activate** — a saved-but-inactive base plan sells
   nothing.
   RevenueCat product identifiers for Google are `productId:basePlanId`
   (`premium:monthly`, `premium:annual`).
4. **Service account** (lets RevenueCat validate purchases; also enables
   `eas submit` for Android):
   - GCP console → same project → enable **Google Play Android Developer
     API** → IAM → Service Accounts → create (no project roles needed) →
     Keys → new JSON key. The JSON is a SECRET — upload directly to
     RevenueCat/EAS, never commit.
   - Play Console (account level) → Users and permissions → Invite → the
     service-account email → grant: view app info, view financial data,
     manage orders and subscriptions. Service accounts get no email invite —
     they just appear in the list.
   - **Purchase-validation permission propagates slowly (up to ~36h).**
     Catalog reads work instantly; RevenueCat's credential check may show
     "can't validate purchases" ❌ meanwhile. Not a misconfiguration — wait.

## Testing tracks + the personal-account production gate

- Personal developer accounts registered after ~Nov 2023 must run a **closed
  test with 12–20 testers (console states the exact number) opted-in for 14
  continuous days** before applying for production. Organisation accounts and
  older personal accounts are exempt.
- **How to know if you're gated**: the "Promote release" menu — if Open
  testing/Production are GREYED OUT on a closed-testing release, the rule
  applies. The *absence of a warning banner elsewhere proves nothing* (learned
  the embarrassing way).
- Strategy: start the closed test and its tester recruitment EARLY — the
  14-day clock is the long pole and runs while you keep shipping. Uploading
  new builds to the track does NOT reset the clock; letting testers drop
  below the threshold does.
- Testers: any Gmail works; a Google Group makes list management painless;
  developer tester-exchange communities exist to fill quotas.
- Each closed-testing release goes through a short Google review (hours);
  the app shows "Changes in review" and testers keep the OLD build until it
  clears — a tester reporting stale behavior usually just hasn't got the new
  build yet.
- **License testing** (account level → Setup → License testing): add tester
  Gmails; their purchases use a test card — full purchase flow, zero charge.
  This is how you verify the IAP end-to-end without spending money. A
  non-license account WILL be charged real money.
- Play review can also raise one-time app-content tasks on first upload
  (Data safety, Content rating, Target audience, Privacy policy) — budget an
  hour for the questionnaire pass.
