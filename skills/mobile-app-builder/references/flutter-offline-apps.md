# Flutter, offline-first apps: patterns that held up

Distilled from shipping a Flutter 3.x vocabulary app for iOS and Android (2026). It has no account,
no server and no analytics; a bundled SQLite content database of about 9,000 entries; spaced
repetition; home-screen widgets; one non-consumable "Full" purchase; and a native rating prompt.
Use it alongside the Expo-centred references when the stack is Flutter or the app is offline-first.

## Contents
1. Project and toolchain hygiene
2. Bundled content database
3. Learner data, backups and privacy
4. UI patterns for practice and quiz flows
5. Testing: unit, widget, integration and screenshots
6. Native rating prompt policy
7. Platform services behind interfaces
8. Parental controls without accounts
9. Speech, microphone and permission honesty
10. Several learners on one device
11. PDFs made on the device
12. Widgets that refresh without the app, and reminders that are heard
13. On-device meaning search without a native AI runtime
14. Personal collections, paste/share capture and honest progress

## 1. Project and toolchain hygiene

- **Pin the toolchain inside the repo** (`.tooling/flutter`, `PUB_CACHE`, `XDG_CONFIG_HOME` under
  the repo) and keep one documented command prefix. Agent shells are non-login and sandboxed, so a
  global Flutter install or `~/.pub-cache` often isn't reachable. Set
  `FLUTTER_SUPPRESS_ANALYTICS=true`.
- `flutter analyze` must be clean and `flutter test` green before any build is called done; record
  the counts in the handoff file.
- Version is `x.y.z+build` in `pubspec.yaml`. **A build number can never be reused** after an
  upload attempt reaches App Store Connect, even a "failed" one. Bump it for every archive.

## 2. Bundled content database

- Author content as reviewable text (TSV/JSON per batch). **Compile** it with a script into a
  read-only SQLite asset plus a manifest holding the entry count and SHA-256.
- A **release checker** script fails the build if any of these hold:
  - drafts are present;
  - entries lack approval;
  - the manifest hash doesn't match the asset;
  - a required field is missing coverage (for example "every entry has a difficulty band" or
    "every entry has 2 extra examples").
- Keep editorial overlays (difficulty, extra examples, corrections) in separate files keyed by
  entry id. The compiler merges them, so a 9,000-row rewrite is never needed.
- On launch, copy the asset to app storage only when the manifest hash changes. Learner progress
  lives in a separate database keyed by stable entry ids, so content updates never wipe progress.
- **Stable ids are forever.** Deleting or renaming an id orphans learner history; retire it with a
  flag instead.

## 3. Learner data, backups and privacy

- With no account, the backup is a **user-exported file** (share sheet) plus a validated import.
  Validate every imported key and value against an allow-list and reject anything unknown. A
  crafted backup is untrusted input.
- **Keep device-only bookkeeping out of backups:** rating-prompt counters, "last asked" dates and
  one-off tips. Restoring them onto a new device would suppress or re-trigger prompts incorrectly.
  Exclude them by key prefix in the export query and test that the export omits them and still
  validates.
- An offline app with no analytics can honestly declare **"Data Not Collected"**. Every new feature
  (speech, translation, AI) must keep processing on device, or the label and privacy page must
  change first.

## 4. UI patterns for practice and quiz flows

- **Feedback after every answer is the learning moment.** Show the correct answer, a short meaning
  and 1–2 extra examples, whether the learner was right or wrong. Build it as one reusable widget
  so every mode shows the same thing.
- When feedback expands a page, **pin the primary action (Next/Continue) in
  `bottomNavigationBar`**. Otherwise it scrolls off screen and integration tests (and users) can't
  find it.
- **Give each question page its own key** (`ValueKey('page-$index')`) so scroll position resets per
  question; a shared `ScrollController` otherwise carries the previous scroll offset forward. After
  the answer, `Scrollable.ensureVisible(context, alignment: .15)` in a post-frame callback brings
  the feedback into view.
- Repeated rows need unique keys (`ValueKey('example-$i')`); duplicate keys throw only when two
  rows collide, which hides the bug until real content arrives.
- Child/student profiles: gate purchases, store links, ratings and settings changes behind an
  adult check (a simple arithmetic gate is the common pattern).

## 5. Testing: unit, widget, integration and screenshots

- **Pure policy classes** (scheduling, access limits, rating policy) take `now` as a parameter and
  are unit-tested over simulated months. This is the cheapest place to prove "never more than three
  times".
- For database tests, use `sqflite_common_ffi` with `inMemoryDatabasePath` and the real
  `createSchema`. Build models with injected fakes.
- **Widget-test hang: "database has been locked" or a test that never finishes.** The cause is real
  I/O (sqflite, files) triggered from a post-frame callback or animation *outside*
  `tester.runAsync`. Do the I/O in the awaited chain the test already drives, and defer only
  I/O-free work (for example, the platform rating request) to after the animation.
- Pending timers fail widget tests: cancel them in `dispose`, or pump past them.
- Integration tests (`integration_test/`) run the real journeys on a simulator and an emulator.
  After any layout change, rerun them, because a longer panel can push a button off screen.
- **Store screenshots:** use `flutter drive` with a driver that writes PNGs to a directory given by
  an environment variable. **System sheets** (rating, purchase, share) aren't in the Flutter tree,
  so capture them with `xcrun simctl io <UDID> screenshot` while the sheet is up.

## 6. Native rating prompt policy

The rules come from Apple guideline 5.6.1 and Google Play's in-app review policy.

- Use **only the platform sheet** (`in_app_review`: SKStoreReviewController / Play In-App Review).
  Custom star dialogs are banned on iOS. Google forbids a pre-question such as "Do you like the
  app?" that filters who sees the prompt.
- The system never tells you whether the person rated, and it may silently show nothing (Apple caps
  the sheet at 3 displays per 365 days; Play applies a quota). So the policy must be conservative
  on its own terms:
  - ask only after a **finished, successful** session, for example at least 5 answers with at least
    70% right;
  - wait for a **returning** user: at least 3 sessions over at least 2 days;
  - never ask mid-task; delay about 1 second after the success animation;
  - if ignored, ask again only after a long gap **and** more use: 30 days plus 5 sessions, then 90
    days; **at most 3 asks, ever**;
  - a **"Rate the app" row in Settings** opens the store listing and marks the prompt done for
    good. That is the only reliable "they rated" signal.
  - never auto-ask child profiles; the Settings row sits behind the adult gate.
- Persist the counters locally, keep them out of backups (§3), and unit-test the whole policy with
  simulated dates.

## 7. Platform services behind interfaces

Wrap every plugin that talks to the OS (store review, purchases, TTS, notifications, widgets,
speech, translation) in a small interface with a `Platform…` implementation and a test fake.
Wrap each call in try/catch: a failed rating request or TTS call must never interrupt learning.
This also lets widget tests run without platform channels.

## 8. Parental controls without accounts

A simple arithmetic "parental gate" is fine for store rules, but children beat it, especially a fixed question. For families, add a **Parent PIN**:

- Store only a salted slow hash (PBKDF2-HMAC-SHA256, about 100k+ iterations, run in an isolate; about 250 ms on a simulator) in **secure storage** (`flutter_secure_storage`: Keychain with `first_unlock_this_device`, Android Keystore). Never keep it in the app database or backups.
- **The iOS Keychain survives deleting the app** (verified). Pair the secret with a marker row in the app database:
  - record without marker = left over from an old install, so delete it;
  - marker without record, or an unreadable record = **fail closed**; only device authentication can replace it.
  
  Android's secure storage may wipe itself on decryption errors (`resetOnError`), which the marker rule also catches.
- Lockout: a few free tries, then growing waits persisted with the record, so force-closing doesn't reset them. Treat a clock set before the last failure as still locked.
- Unlock for a short session (about 5 minutes); lock at once when leaving the parent area.
- Forgotten PIN: an optional reset through `local_auth` (Face ID, fingerprint or device passcode). Let the parent turn it off if the child knows the passcode. `local_auth` needs `FlutterFragmentActivity`, AppCompat themes (including night and v31 variants) and `USE_BIOMETRIC` on Android, and `NSFaceIDUsageDescription` on iOS.
- Audit every path where a child can escape the gates:
  - switching their own profile type;
  - restoring a backup that carries `profileType=adult`;
  - creating the PIN first (require the adult check from a child profile);
  - turning a permission-using feature back on.
- Restore must **keep device-only state**: the purchase, the lock marker and the rating-prompt history. It's easy to wipe them with a blanket `DELETE FROM settings`.
- Be honest about limits: an in-app PIN can't stop changes in the OS Settings app. Point parents to Screen Time and Google Family Link.

## 9. Speech, microphone and permission honesty

- `speech_to_text` `onDevice: true`: on iOS it sets `requiresOnDeviceRecognition` (fails rather than using a server). **On Android it silently falls back to the default, possibly online, recogniser.** Check `SpeechRecognizer.isOnDeviceRecognitionAvailable` through a small platform channel and hide the feature otherwise.
- iOS always shows Apple's generic speech-permission text ("speech data … sent to Apple"). A purpose string saying "nothing is sent anywhere" then reads as a contradiction, so describe only what your app does.
- Ask the adult (PIN or gate) **before** triggering an OS permission prompt from a child profile.
- Share-sheet image sharing on iOS can offer "Save Image"; add `NSPhotoLibraryAddUsageDescription` or that action crashes the app.

## 10. Several learners on one device

- Prefer **one SQLite database per learner** plus a small device database (learner list, active learner, device-wide settings such as the purchase, the parent-lock marker and rating history). Compared with a `profile_id` column everywhere, it needs no migration of learning data, isolates siblings completely, keeps the backup format per learner, and deleting a learner is deleting a file.
- On upgrade, register the existing database as learner 1 (keep its file name). Copy device-wide keys to the device store before deleting them from the learner database, so the step is safe to repeat and never overwrites newer device values.
- Keep the learner list's display name and type in sync **whenever a learner's database opens**, not only when the full UI model refreshes. Otherwise upgraded learners show as defaults (found in a device test: a child switching to an "adult" first learner hit the parent gate).
- Switch learners by closing the old model and database and reloading as at start-up, with the app widget keyed on the model (`ObjectKey(model)`) so navigation and state reset. Reminders and widgets then follow the active learner.
- Enforce limits and parent checks in the model, not only the UI: the free/paid learner cap, "add needs an active PIN and an unlocked session", "never delete the active or last learner", "can't remove the PIN while several learners exist".
- In widget tests, a fake "switch" callback that doesn't reload the app leaves state the real app can never reach. Reset it in the test and say why.
- Tests that need separate SQLite databases must use real temporary files: two `inMemoryDatabasePath` opens can return the same shared database.

## 11. PDFs made on the device (reports, printables)

- The `pdf` package's built-in fonts cover Latin-1 only: unsupported characters **throw**, and some typographic ones (’ “ – …) render as empty boxes. Map typography to plain equivalents, replace everything else, and fall back to a generic label when a name is mostly in another script (or bundle a font that covers it).
- Keep the report's numbers in a pure summary class, tested for week boundaries, future-dated rows, malformed rows and caps. The PDF layer then only needs to build and to look right (render it and look).
- Share through an injectable function, so widget tests can capture the bytes and file name and simulate failures.

## 12. Widgets that refresh without the app, and reminders that are heard

- **A widget fed only by the app goes stale.** If the app writes "today's" snapshot only when opened, the widget shows yesterday or "open the app" at midnight. Have the app write **the next N days** of dated snapshots; the widget **promotes** the day's snapshot itself, keeps the day it leaves in a short history so answers given there still import, and the app imports widget events against every snapshot by date.
  - iOS: give the timeline an entry per prepared midnight. Android: an inexact `AlarmManager.set` just after midnight (no exact-alarm permission) plus `updatePeriodMillis` as a fallback.
- To test native widget code without a widget on the home screen, expose a **debug-only** method channel (check `ApplicationInfo.FLAG_DEBUGGABLE`; AGP 8 doesn't generate `BuildConfig` by default) that calls the real promotion function, then assert on the shared storage from an integration test.
- **Silent reminders:**
  - Android channel importance is fixed at creation, so to make reminders pop up with sound, create a new channel id with `Importance.high` (sound, vibration, category reminder) and delete the old one.
  - iOS: set `presentSound`/`presentBanner`/`presentList` explicitly rather than relying on remembered defaults.
  - Read the sound permission (`isSoundEnabled`) and tell the user how to turn it on, and offer a "send a test reminder" button. Silent mode and Focus still mute every app.
- Verify Android notifications from the system's view: `adb shell pm grant <pkg> android.permission.POST_NOTIFICATIONS`, post a test, then `adb shell dumpsys notification --noredact` and check the channel's importance and sound.

## 13. On-device meaning search without a native AI runtime

Learned building VocabAura's Phrase Finder (Oct 2026): "describe a meaning, get library words", fully offline.

- **A small sentence encoder runs fine in plain Dart.** all-MiniLM-L6-v2 (Apache-2.0, 22.7M parameters, 384 dims) packed as int8 rows plus one float scale per row is about 23 MB. No ONNX/TFLite plugin, identical behaviour on iOS, Android and in `flutter test`, and nothing native to keep updated. Pin the model revision and check the weights' SHA-256 in the packing script.
- **Use `Float32x4` for the dense layers.** Unpack the int8 rows once to float lanes (about 42 MB for six layers) and multiply four at a time. Measured on one dense layer: scalar int8 loop 180 ms in JIT and 7–9 ms in AOT, against SIMD 1.7 ms and 2–3 ms. On an Android emulator profile build a whole query fell from ~490 ms to ~23 ms. Do the unpacking in `warmUp()` so the first search is not the slow one.
- **Build the stored vectors with a reference that does exactly the app's arithmetic** (numpy with the same int8 dequantisation, the same `erf` approximation, the same truncation), then prove parity in a Dart test: token ids for 1,000+ real corpus strings against the Hugging Face tokenizer, and cosine > 0.9999 for a handful of vectors. Check the float model against a published reference pair first (all-MiniLM-L6-v2 gives 0.755 for "A man is eating food." vs "A man is eating a piece of bread.").
- **WordPiece in Dart needs care:** BERT punctuation (ASCII ranges plus Unicode P*), control-character removal, CJK splitting, accent stripping without a Unicode NFD library (generate the fold table from Python's `unicodedata`), 100-character words → `[UNK]`, and truncation to the model's token limit.
- **Run it in a long-lived isolate**, sending the model and index once as `TransferableTypedData`. Tie the index file to both the content SHA and the model SHA; on any mismatch, missing asset or corrupt header the finder is simply absent and ordinary search carries on. A release check script should fail if the index is stale.
- **Measure honestly before promising.** Write 200 realistic queries with one agent and have another check the labels (it fixed 61); split dev/test and tune only on dev. Results for paraphrase-style descriptions: correct word in the top 3 about 64%, top 5 about 76%, versus 5% for word search. Three 33M MIT-licence encoders (bge-small, gte-small, e5-small) were no better within noise, so keep the smallest. Queries with no right answer scored as high as real ones, so there is **no usable "no match" threshold**: label results "possible matches" and let the learner check.
- **The model over-rates words the learner typed** ("a backup plan" → "backup"). For multi-word queries, drop results whose headword is entirely made of the query's own words; ordinary search still lists them.
- **Ranking order that never buries exact answers:** exact word → word form → prefix → phrase containing the word → spelling slip → meaning-model suggestions → words merely mentioned in definitions. Apply the free/paid boundary *before* ranking so a free learner never sees a paid word, and count (without showing) what the full library would add.
- Searches can return out of order: only show results for the query still in the box.

## 14. Personal collections, paste/share capture and honest progress

- **Lexical search worth having before any AI:** lemma candidates for -s/-es/-ies/-ed/-ing/-er/-est/-ly plus irregular verbs; idiom headwords with slots ("your", "someone") that match any pronoun, so "made up my mind" finds "make up your mind"; optimal-string-alignment distance for typos (only for 4+ letters, 1 edit up to 6 letters, 2 above); accent and curly-quote folding that keeps **one code unit per code unit**, so match offsets still point into the original text (watch `toLowerCase()` changing length, e.g. "İ").
- **Capture from reading:** paste on both platforms; Android `ACTION_SEND` and `ACTION_PROCESS_TEXT` intent filters on the main activity, text read in `onCreate` (only when `savedInstanceState == null`) and `onNewIntent`, sent over a method channel with a `MethodChannel.Result` that keeps the text for later if Flutter isn't listening yet. Cap the size (20,000 characters natively, 5,000 in the UI). Ignore non-text types even on explicit intents.
- Real text matches many easy library words ("try", "risk"): put words below the learner's level, or already known, in a collapsed "Easier or known words" group. Offer every sense of a word; never pick the first silently. Keep only the one sentence each word came from, and only if the learner leaves that switch on.
- **Saving must never flood reviews:** a collection is practised on request, at most 10 at a time, due words first.
- **Progress by evidence:** count recognised (choices, spelling), recalled (typed, unaided), worked out in a passage and tried in writing as separate rungs. A sentence the learner wrote is an attempt, not proof; "can use" claims should become "can recall" unless use is actually observed. None of these activities should touch the spaced-repetition schedule.
- Record practice outside scheduling in its own idempotent `activity_events` table (`id`, `kind`, `entry_id`, `created_at`, `payload_json`), skip unknown kinds on read (written by a newer version), and include it in versioned backups with strict validation.
- **Self-rated difficulty, made useful (four levels):** map Too easy / Easy / Hard / Too hard to where the learner sits relative to the word's difficulty (for example +0.18, +0.08, −0.03, −0.13). Weight the rating by the answer: "too easy" after a wrong answer barely counts, and "too hard" after a right answer only means the word is at their edge. Scale every step by a trust score (how often past feelings matched results, with a prior of two agreeing ratings) and by 1/(1 + n/15), so early ratings count most. Let a rating move the level only in its own direction and cap each step. Re-pick only upcoming *new* words in an adaptive session, never fixed daily words, started words or a list the learner chose, and tell the learner it happened. Store the ratings as activity events, never as scheduling input.

