# Launch marketing on a minimum budget (promo videos, ad copy, spend)

Learned launching VocabAura (October 2026): a solo, iOS-first, one-time-purchase app with a UK audience.

## Promo videos built from code (no editor, £0)

- **Tooling:** Claude Motion (the code-built video artifact type) was a Team/Enterprise beta in October 2026. If it isn't listed in the Artifact types, build the same thing with **Remotion**. It's free for individuals and companies of up to three people.
- **Content:** use the app's own store screenshots inside a CSS phone frame. Don't use Apple's device art, and every shot then shows the real product.
- **Setup:**
  - one `Promo` component with `cut` (`full` 30 s, `short` 15 s, `bumper` 6 s or less) and `layout` (portrait 1080×1920, landscape 1920×1080, square 1080×1080) props;
  - one composition per asset;
  - `render.mjs` loops over them with `--codec=h264 --crf=18`.
- **Bumpers:** render **177 frames, not 180**. AAC padding makes a 180-frame file 6.06 s long, and bumpers must be 6 s or less. Check with `ffprobe`.
- **Licences:**
  - Fonts: Google Fonts under the OFL, via `@remotion/google-fonts`.
  - Music: synthesise an original loop (numpy, a few chords, arpeggio, soft kick) so there are no licences.
  - No macOS `say` voiceover: system voices aren't licensed for commercial use.
  - Design for muted viewing.
- **Structure:**
  1. Hook question (big kinetic type).
  2. 3–5 feature beats, each with a caption ("A few new words a day.") over its screenshot.
  3. End card: icon, slogan, three proof chips, "Free on the App Store", and the pricing line ("Optional one-time upgrade. No subscription.").
- **Text:** use `textWrap: 'balance'` on captions, and stagger the hook words faster in the bumper.
- **Review:** check stills with `npx remotion still … --frame=N`, then contact sheets (`ffmpeg -vf "fps=1/2.5,scale=240:-1,tile=6x2"`) before the final render.

## Ad copy as data, enforced by a test

`docs/marketing/ad-copy.json` holds the slogan, headlines, descriptions, CTAs, YouTube titles and Apple Ads keywords. The test checks:
- Google limits: headlines 30 characters, descriptions 90, CTAs 10;
- no superlatives, guarantees, exam boards or "beta";
- size claims tied to the paid tier ("9,000+ words with Full");
- "free" meaning a free download.

## Where a tiny budget goes

1. **£0 first:** organic Shorts with the portrait cuts, the App Store link on the support site, and ratings from the native prompt.
2. **Apple Ads Basic:** pay per install with a monthly cap. It sits exactly where people search. Benchmark (US, April–June 2026): about $1.79 per tap and $2.76 per acquisition. Start at £150 a month with a capped CPI.
3. **YouTube views:** about £3 a day for awareness. Skippable views cost about $0.02–0.10; iOS installs from it can't really be attributed.
4. **Skip Google App campaigns for iOS at small budgets.** Install-volume bidding wants a daily budget of 50× the target CPI, and iOS learning can take up to 6 weeks. Use them for Android launches.

Do the **payback maths** before spending:
- net per sale = price ÷ 1.2 (UK VAT) × 0.85 (Small Business rate, if enrolled; 0.70 otherwise);
- the paid-install-to-purchase rate needed = CPI ÷ net.

For a £4.99 unlock at £2 CPI that's more than 50%, so ads are for visibility, not ROI. Say so to the owner.

## Policy

- Target **adults** (parents, adult learners): under-18s can't get personalised ads, and made-for-kids YouTube content gets no personalised ads.
- Use Apple's official badge artwork, or plain text.
- Track with App Store Connect **campaign links** (`pt` + `ct` tokens) per channel.
- Ad accounts and spend are owner-only. Deliver the creative, copy and a step list.
