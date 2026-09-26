# RevenueCat — wiring, webhook, and the "prices don't show" tree

## Canonical wiring (order matters: store products must exist first)

1. **Apps**: + New → App Store (bundle id + the In-App Purchase **.p8 key** +
   Key ID + Issuer ID — StoreKit 2 requires the key; the App-Specific Shared
   Secret alone is NOT enough) and + New → Play Store (package name + the
   service-account JSON). Each app yields a **public SDK key**
   (`appl_…` / `goog_…`) — public by design, safe to commit into `eas.json`
   build env.
2. **Products**: add by ID — Apple: `premium_monthly`, `premium_annual`;
   Google: `premium:monthly`, `premium:annual` (productId:basePlanId). The
   dashboard "Import" button may be absent — manual "+ New" is fine.
3. **Entitlement**: one identifier (e.g. `premium`) ← attach ALL four
   products. The app checks `customerInfo.entitlements.active["premium"]`,
   never per-product.
4. **Offering**: keep/create `default` with preset **Monthly** and **Annual**
   packages (`$rc_monthly`/`$rc_annual`) → the SDK reads `offering.monthly` /
   `offering.annual` with zero client changes when products change.
5. **Webhook** (Integrations → Webhooks): URL = your server endpoint;
   Authorization header = a secret YOU generate. The SAME value goes in the
   server's env (e.g. Cloud Run `REVENUECAT_WEBHOOK_AUTH`). Set environment to
   **Both Production and Sandbox** (test purchases are sandbox — production-only
   silently drops them) and it's project-level, one webhook covers all apps.
   **A server-side curl only proves YOUR half.** Curling your endpoint (401
   without header / 2xx with) verifies the receiver — it does NOT prove the
   RevenueCat-side webhook exists. Failure mode lived through: purchases
   validated, entitlements granted in RC, zero events delivered — because the
   RC webhook was never created; every downstream symptom ("purchase works,
   premium never flips, restore does nothing") followed. Definition of done =
   the webhook entry exists in RC **and** a real purchase's INITIAL_PURCHASE
   shows up in your server's event log. Also note: RC only dispatches events
   created AFTER the webhook exists — historical events are not replayed, so
   verify with a fresh purchase.

## Client pattern (react-native-purchases)

- `Purchases.configure({apiKey})` once, then **`Purchases.logIn(<your user
  id>)`** — this makes the webhook's `app_user_id` equal your database user
  id, which is what lets the server map events to accounts. Skipping logIn is
  the classic "purchase worked, entitlement never flipped" cause.
- Purchase flow: `purchasePackage(pkg)` → on success poll your own
  `/api/me`-equivalent until the server webhook lands (a 10×2s loop with a
  "will activate shortly" fallback message covers webhook latency).
- Config-gate: `IAP_ENABLED = !!API_KEY`; every export no-ops when disabled.
  Web gets a `purchases.web.ts` stub so the native module never enters the
  web bundle.
- Server keeps ONE entitlement field fed by multiple rails (RevenueCat webhook
  for stores, Stripe webhook for web). Do NOT route existing web billing
  through RevenueCat — needless migration.
- Stripe API-version gotcha (web rail): newer versions moved subscription
  `current_period_end` to item level (`items.data[].current_period_end`) —
  read top-level with an item-level fallback.

## "Paywall shows coming-soon / no prices" decision tree

1. **Is the platform SDK key in THIS build?** (Key added after the build was
   made = old build has no key. Check the build log's env list.)
2. **iOS: is the Paid Apps Agreement Active?** Not Active → Apple returns zero
   products everywhere including sandbox. See ios-store.md. (This was the real
   cause the one time everything else looked correct.)
3. **Android: is the console still reviewing the release?** Testers run the
   previous build until "Changes in review" clears.
4. **Offering packages contain THIS store's products?** A package holding only
   the other platform's product yields an empty offering on this one.
5. **Products active?** (Play base plans activated; ASC products at least
   Ready to Submit / attached to a version.)
6. **Propagation**: brand-new products can take up to ~24h (Apple sandbox) /
   hours (Play) to serve. If steps 1–5 pass, wait before touching anything.

## Dashboard badges decoded

- **"Could not check" on App Store products** — RevenueCat lacks the OPTIONAL
  App Store Connect API key used only for status display. Cosmetic; purchases
  unaffected. (Different credential from the required In-App Purchase .p8.)
- **Play credential check "can't validate purchases" ❌ with catalog reads ✅**
  — Google permission propagation (≤36h after granting). Wait, don't rewire.
- Server-side verification beats dashboard-staring: after a test purchase,
  check your own webhook logs / user row to confirm the entitlement flip.
