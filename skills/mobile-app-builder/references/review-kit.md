# Review kit — have these ready BEFORE the first submission

New or low-history developer accounts now routinely get **Guideline 2.1 – Information Needed** on their first submission (seen September–October 2026). The version is marked Rejected, **the first in-app purchase is ejected from the submission**, and nothing moves until you reply with a physical-device screen recording plus answers to seven questions. That costs days. Do it all up front instead:

1. put the seven answers in **App Review Information → Notes** (4,000 characters at most);
2. attach a **physical-device screen recording** in App Review Information → Attachment;
3. ship tests that block the usual "looks unfinished" findings.

## 1. The seven answers (Notes template)

Keep it under 4,000 characters and use these headings word for word; the store-copy test below looks for them.

```
<One line: what the app is; account needed or not; recording attached.>

PURPOSE AND AUDIENCE
<Who it's for (ages, roles), the problem, the value. 3-4 sentences.>

SETUP AND MAIN FEATURES
<First-launch steps. Then per tab/screen: what's there. Any gates (parental check, PIN) and how to pass them. Demo credentials in the Sign-In fields, never here.>

EXTERNAL SERVICES
<Every server, SDK, payment processor and AI service — or "none" plus the Apple frameworks used (StoreKit, Speech, AVSpeechSynthesizer, UserNotifications, WidgetKit, LocalAuthentication...). Bundled models: name, licence, on-device, generates text or not.>

REGIONS
<"Works the same everywhere" or the exact differences. Prices vary by storefront.>

REGULATED INDUSTRY / THIRD-PARTY MATERIAL
<Not regulated / licences held. Content originality; no affiliation with exam boards or brands. Where the open-source licences are shown.>

IN-APP PURCHASE
<Each product: id, type (non-consumable/subscription), what it unlocks vs free, Family Sharing. Every place to buy it, and where Restore is.>
```

## 2. The screen recording (script template)

Apple requires: a **physical device on the latest OS**, **starting from the Home Screen launch**, showing the typical flow, plus account creation, login and deletion, user-generated content reporting and blocking, and **how paid content is reached**, wherever those exist.

- **Prepare:** update the OS; delete the app and install the review build from TestFlight; add Screen Recording to Control Centre; turn on Do Not Disturb; copy any sample text you'll need; ringer on.
- **Record in one take (4–6 minutes):**
  1. Home Screen → tap the icon.
  2. Onboarding.
  3. The core loop, twice.
  4. Each main tab.
  5. Every permission prompt in context.
  6. The purchase with Restore visible (a TestFlight purchase uses the sandbox, so no charge), then one or two paid features.
  7. Settings, parent controls and licences.
- **Deliver:** AirDrop it to the Mac. Attach it to the reply in the App Review thread *and* to App Review Information → Attachment, so future reviews have it.
- Write the script as a table (step, what to tap, what it proves), with button labels **copied from the code**. A guide that says "Done" when the button reads "Use this level" wastes the owner's take.
- **Review the recording before sending.** Make contact sheets (`ffmpeg -i in.mp4 -vf "fps=1/4,scale=330:-1,tile=6x2" sheet_%02d.jpg`) and check:
  - the first second shows the Home Screen launch;
  - every required item appears, especially the **purchase actually being tapped** (VocabAura's first take showed the price but never bought);
  - no errors and no private information.
  If something is missing, ask for a short extra clip that *also starts at launch*, rather than a full redo.
- **If an Apple ID already owns a non-consumable**, StoreKit may unlock it without showing Apple's sheet. Ask the owner what happened and say so in the reply ("this Apple ID already owned it; a new account sees Apple's sheet").
- **Size:** browser-automation uploads cap files at about 10 MB. Join clips with the concat demuxer after encoding them with identical settings, then use a two-pass H.264 encode: 540 px wide, 20 fps, about 165 kbps video and 40 kbps mono audio gives about 7.5 MB for 6 minutes, and the text stays readable. Keep the original files.

## 3. Release-readiness tests (copy into every Flutter app)

Adapt paths and keys. They run in milliseconds.

```dart
// test/app_version_test.dart — the version shown in the app matches pubspec,
// and no user-facing string calls the release a preview/pilot/beta (2.2).
test('shown version matches pubspec.yaml', () {
  final line = File('pubspec.yaml').readAsLinesSync()
      .firstWhere((l) => l.startsWith('version:'));
  expect(line.split(':')[1].trim().split('+').first, appVersion);
});
test('no preview/pilot/beta wording in user-facing strings', () {
  final banned = RegExp(r'\b(preview|pilot|beta|coming soon)\b', caseSensitive: false);
  for (final f in Directory('lib').listSync(recursive: true).whereType<File>()
      .where((f) => f.path.endsWith('.dart'))) {
    for (final (i, line) in f.readAsLinesSync().indexed) {
      if (line.trimLeft().startsWith('//')) continue;
      for (final m in RegExp(r"'([^']*)'").allMatches(line)) {
        expect(banned.hasMatch(m[1]!), isFalse, reason: '${f.path}:${i + 1}');
      }
    }
  }
});
test('bundled non-package material has its licence registered', () async {
  registerBundledLicences(); // LicenseRegistry.addLicense in main()
  final entries = await LicenseRegistry.licenses.toList();
  expect(entries.any((e) => e.packages.contains('<model or asset name>')), isTrue);
});
```

```dart
// test/release_readiness_test.dart — iOS project facts reviewers check.
test('privacy manifests exist and are in Copy Bundle Resources', () {
  for (final p in ['ios/Runner/PrivacyInfo.xcprivacy' /*, each extension */]) {
    final t = File(p).readAsStringSync();
    expect(t, contains('NSPrivacyTracking'));
    // App Group / shared UserDefaults needs 1C8F.1; app-only CA92.1.
  }
  expect(RegExp('PrivacyInfo.xcprivacy in Resources')
      .allMatches(File('ios/Runner.xcodeproj/project.pbxproj').readAsStringSync())
      .length, greaterThanOrEqualTo(1 /* + extensions */));
});
test('ITSAppUsesNonExemptEncryption is set', () { /* <false/> in Info.plist */ });
test('permission strings are specific and device-neutral', () {
  // every NS*UsageDescription the app requests: >40 chars, names the app,
  // no "iPhone" if the app runs on iPad.
});
test('no hard-coded price in UI strings', () {
  // regex r"'[^']*[£€$]\s?\d" over lib/: prices must come from the store,
  // or the reviewer sees the wrong amount/currency when products don't load.
});
```

```dart
// test/store_copy_test.dart — docs/app-store-copy/<locale>.json is the source
// of truth pushed to App Store Connect by API.
// Checks: field limits (name/subtitle 30, promo 170, keywords 100,
// description/notes 4000); notes contain all six 2.1 headings + "RESTORE" +
// product id; description has privacy URL + EULA link; no beta/preview/
// coming soon/TestFlight in public fields; no exam boards or trademarks in
// name/subtitle/keywords; saved review replies fit 4000 chars.
```

```dart
// Keep the notes true as the app grows: every bundled third-party asset
// (model, dictionary, fonts, data) must be named in reviewNotes and the
// privacy policy. VocabAura's notes said "no third-party dictionary" one
// day before a WordNet dictionary was added. Map pubspec asset -> name and
// fail when the asset is bundled and the name is missing; also guard
// headings losing their newline ("AUDIENCEAn offline...").
```

## 4. Licences: what you must ship

Apple doesn't require a licences screen. The licences do, so keep one:

- **MIT** requires the notice in "all copies or substantial portions".
- **BSD-3**, which covers Flutter itself, requires the notice in the documentation or other materials for binary redistribution.
- **Apache-2.0** requires giving recipients a copy of the licence.

Flutter's `showLicensePage` covers Dart packages. **Model weights, fonts, data and media files are not packages**: register them yourself with `LicenseRegistry.addLicense` and bundle the licence text as an asset. Show the real version on that page (`applicationVersion`), never a hard-coded "0.1.0 preview".

## 5. Submission mechanics that bite

- The **first non-consumable** cannot be attached through the App Store Connect API (409 `FIRST_NON_CONSUMABLE_MUST_BE_SUBMITTED_ON_VERSION`). Create the draft with the version, then attach it from the purchase's page: **Add for Review → existing draft → Submit for Review**, and confirm "2 Items Submitted".
- Any rejection, including 2.1 Information Needed, **ejects the purchase**. Re-add it before resubmitting.
- Answering 2.1 in the web console:
  1. App Review → the submission → **Reply to App Review**. The box holds 4,000 characters; check that the counter matches your text length. Attach the video through the dialog's file input.
  2. If you changed the build, open the version page and press **Update Review**. That puts the version back in the submission.
  3. When **both** items show "Ready for Review", **Resubmit to App Review** becomes active.
  4. Confirm through the API that both are WAITING_FOR_REVIEW.
- **Delete superseded screenshot sets** (6.5", 6.1" and so on) when you upload the 6.9" set. Otherwise screenshots from an early build stay on the 6.5" slot.
- Age rating: answer "parental controls" **Yes** if the app has a parent PIN or gate.
- Purchase UI: say "launch price" only while a price change is actually scheduled, and never "introductory offer" on a non-consumable.
