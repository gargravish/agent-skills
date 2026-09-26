---
name: small-saas-engineering
description: Hard-won, reusable patterns for building and operating a small/solo commercial SaaS (Flask/Python or similar backend + React frontend, deployed on a serverless platform like Google Cloud Run, with Postgres). Covers serverless gotchas, lightweight per-user observability, safe deduplication, deficit-driven content generation, context-aware LLM generation, CI/deploy discipline, secret-scanning, and cross-stack source-of-truth. Consult this whenever designing observability/admin tooling, an AI content pipeline, database migrations, background jobs on serverless, or when a "server calls itself" / flaky-test / duplicate-data / stale-metric problem appears.
---

# Small SaaS engineering — reusable playbook

Battle-tested lessons from operating a solo-run commercial app (React SPA + Flask/SQLAlchemy on Cloud Run + Postgres). Each is a pattern that generalizes to similar stacks.

## Serverless (Cloud Run / Lambda / Fly) gotchas
- **A server calling its OWN HTTP endpoint (`127.0.0.1`) is unreliable/broken** on scale-to-zero serverless — the nested self-request may never complete (single worker) or silently no-op. Symptom: an endpoint that "runs" but persists 0 rows. FIX: dispatch in-process (Flask `app.test_client()` runs the view through the WSGI app with its own request context/session — no network hop), or refactor the logic into a plain callable both paths share. Never architect a request→self-HTTP→another-view hop.
- **min-instances=0 kills in-flight background threads** on any deploy/restart. Don't run long jobs in a fire-and-forget server thread. Options: (a) drive long work CLIENT-side (a script loops an endpoint, keeping the instance warm), (b) synchronous bounded units the client repeats, (c) a real scheduler (Cloud Scheduler → HTTP) for cron. In-process timers are best-effort only.
- **Idempotent + resumable > big transactional job.** Recompute remaining work from the DB each call so re-running only does what's left; a crash/timeout/redeploy loses nothing.

## Lightweight per-user observability (no Sentry/heavy infra needed)
- **Correlation:** a `before_request` sets a `request_id` (honour inbound `X-Request-Id`/trace headers), stash it + `user_id` in a `contextvars.ContextVar`, return it as the `X-Request-Id` response header, and inject both into structured logs. The client echoes the id into any error report → full request↔log↔user link.
- **Per-user timeline:** an append-only `user_events` table (user_id, request_id, kind, name, status, route, meta JSON, fingerprint, created_at), written by a tiny fire-and-forget `_log_event()` on its OWN db session (never disturbs the request txn). Merge it with existing error/result rows for a "what exactly happened to THIS user" feed.
- **One-off vs systemic (blast radius) = Sentry's model, self-hosted:** group errors by a **fingerprint** = `hash(route | error_type | number-stripped message)`. Then per fingerprint count **events** and **DISTINCT users affected**. 1 user = edge case; many users = systemic → this is the entire signal for "does it hit everyone?". Auto-capture 5xx via the framework's exception signal.
- **PII/retention:** store `user_id` + action metadata, never raw secrets; add a retention prune (e.g. 90 days).

## Client-graded content must be canonicalized server-side
- **If the client decides correctness by comparing strings (`picked === answer`), the server MUST guarantee the "answer" is byte-identical to one of the choices it ships.** A stored answer that differs from its option only by formatting — unicode (½ vs 1/2, U+2212 minus vs hyphen, full-width digits), NBSP/trailing whitespace, or case — makes a *genuinely correct* selection score as wrong, and the "correct answer" then displayed is the very value the user picked. It looks like a baffling logic bug; the cause is a `===` on two visually-identical strings. Symptom to watch for: "I chose the right option but it was marked wrong, and the answer shown is what I chose."
- **Fix at the serve boundary, not just the client.** Snap the answer to the *exact* option text under a formatting-tolerant match key (NFKC-normalize, unify minus/fraction glyphs, collapse whitespace, casefold) before returning; if it matches NO option the item is ungradeable — drop it from serving. This repairs the data for *every* client (old native builds included) without an app release, because the grading now compares against a corrected value. Add the same guard at content-generation/save time so no new ungradeable rows are created, and a tolerant client-side compare as defence-in-depth.
- **Exclude the defective/repaired items DURING pool-building, not at the final return.** Dropping after a "fill to N" step ships N-1; filtering as the pool is built lets the fill logic reach N from valid items. Serving fewer than requested should mean the pool genuinely lacks valid content, never a single bad row slipping through late.

## Transactional email has a shared daily quota — govern every send
- **Email providers (Resend/SendGrid/Postmark free tiers ~100/day) meter a SHARED daily quota.** Volume tracks *events*, not *users*: a handful of testers deleting and recreating accounts can fire one verification email each and blow the cap (87 registrations for ~5 people = quota exhausted), which then hard-blocks *critical* mail like password resets. Never call the provider SDK directly from N places with no global budget.
- **Route every send through one governor** with (1) a **per-recipient+kind cooldown** (kills delete/recreate churn and retry storms) and (2) a **daily budget** with priority: a soft cap cuts off low-priority mail (verification, alerts, digests) while a higher hard cap still lets high-priority mail (password reset, legal/consent) through — both below the provider ceiling so critical mail is never starved.
- **Back it with the DB, not an in-process counter.** On scale-to-zero serverless the process memory resets on every cold start / new instance, so a module-level counter can't guard a shared quota (the same reason in-process alert throttles leak). A tiny `email_log(recipient, kind, sent, created_at)` table makes the cooldown and daily count correct across instances.
- **Exempt non-billable addresses** (dev-mode, reserved test domains like `@*.test`, your UAT users) from the governor so CI/testing never consumes real quota. Expose a "sent vs suppressed today by kind vs cap" admin view so a spike is visible *before* the provider blocks you.
- **Beware import-time `load_dotenv()` re-arming real keys in tests.** If the app module loads `.env` on import, a suite that pops the provider key BEFORE importing the app gets the real key silently re-injected — every local run then sends REAL email per fake registration (quota burn + bounce-driven reputation damage) while CI (no `.env`) stays green and hides it. Fix twice: pop the key again AFTER the app import, and add the suite's fake domains (`@test.com` etc.) to the wrapper's reserved no-send list. Generalizes to any paid API key: test env hygiene must happen after the last import that can load dotenv.

## Deduplication that keeps valid variants
- **Normalize formatting but PRESERVE the numbers.** A dedup key = hash of (lowercased, whitespace/markup-stripped, digits KEPT). Two records that differ only in formatting collapse; two that differ in NUMBERS (e.g. two word problems with different values) stay distinct — critical when variants are legitimate.
- **Reworded near-dups** (same meaning, different words) can't be caught by a text/skeleton hash (wording differs). Heuristic: same logical cell (category) + identical number-set + different wording ⇒ likely a reworded copy. Default to **flag for human review**, not auto-delete — a wrong auto-merge destroys good content.
- **Retire, don't hard-delete** dedup/quality actions (a `status` column + `dup_of` pointer) so everything is reversible and auditable.

## AI content generation that doesn't repeat itself
- **Show the model what already exists.** A blind "generate N about X" prompt re-emits the same classics forever. Fetch the existing items for that slot and pass a compact list: "these already exist — make genuinely different ones." Plus a per-difficulty/quality rubric. Dedup new output before saving.
- **Deficit-driven balance:** define a per-cell target, compute `deficit = target - have`, fill neediest-first. Distinguishes "thin/unbalanced content" (real cause of most "same thing over and over" complaints) from "duplicate rows" (often zero).

## Database & migrations
- **Additive-only migrations**, applied statement-by-statement with per-statement rollback — on Postgres a failed `ALTER` aborts the whole transaction, so one failed statement silently skips all later ones unless you rollback between each.
- **New nullable columns must be backfilled**; treat `NULL` as the safe default in read filters so new rows aren't starved.

## CI / deploy / secrets discipline
- **UAT must encode INTENDED behavior, not current assumptions.** A stale assertion (e.g. "≤3 distinct") turns red the moment you deliberately change the design — that's the harness doing its job; update it to the new invariant, don't revert the fix.
- **Path-filtered deploys** (api vs web) — but a change to a job that only runs after a deploy (e.g. a UAT script) won't self-validate on a docs-only change; verify such edits manually.
- **Secret scanners (GitGuardian) scan ALL commits in a PR**, not just the head. Removing a literal in a later commit doesn't clear it — **squash the branch** so no commit in the PR history contains it. For test fixtures, construct throwaway credentials at runtime rather than hardcoding.
- **Squash-merge divergence:** after a squash-merge, local branches built on the pre-squash commits conflict; rebuild the branch from the fresh remote main and re-apply the diff.

## Cross-stack single source of truth
- **Domain constants duplicated across a polyglot stack (Python server + TS client) drift and cause subtle bugs** (e.g. a progress counter that reads the DB's distinct values, 17, instead of the client's canonical list, 13). Pick ONE authoritative source; if you must duplicate (no shared runtime), document the sync requirement loudly at both copies and prefer the authoritative curriculum/config over "whatever happens to be in the data".

## Flaky tests
- A test that passes/fails across identical runs is environmental (network, timing, shared session) — confirm by running it on a clean tree several times before blaming a change. Isolate suite triage with `grep -v <flaky_name>`. Fix the root cause (usually shared mutable state / a self-request), or delete the test if the code path is superseded.
