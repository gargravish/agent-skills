# Authoring app content at scale with AI agents, safely

Distilled from writing and reviewing about 18,000 example sentences, a difficulty band for each of
about 9,000 entries, and distractors for an education app (2026). The workflow is **draft →
deterministic validation → independent agent review → apply corrections → compile → release
check**. In the independent review, about 4.7% of entries needed a correction; plan for that rate.

## 1. Structure the work in chunks

- Split the corpus into fixed chunks (about 250 entries) with stable file names (`ws00…`,
  `r00…`). Each agent writes its output **incrementally, one file per chunk**. Rate limits and
  crashes then lose one chunk, not a day; rerun only the missing chunks.
- The drafting agent and the reviewing agent must be **different runs with different
  instructions**. The reviewer never sees the drafter's reasoning, only the entry and the output.
- Keep the output machine-readable (TSV: `id <TAB> field1 <TAB> field2`), one line per entry, so
  scripts can validate and merge it.

## 2. Deterministic validators before any human or agent review

Write a validator script and run it on every chunk. Typical checks:

- exactly one `[bracketed]` target per sentence, and the bracket contains the headword or an
  inflection of it;
- length bounds, and no duplicate sentences within an entry or across the corpus;
- no reuse of the entry's main example;
- the id exists and every id in the chunk is covered;
- British or American spelling consistency, if the app promises one.

Validator false positives found in practice (fix the validator, not the content):

- **Irregular forms** (chose, rang, slunk, bore, sought…): keep an irregular-form table.
- **Spelling-rule inflections:** y → ies/ied, doubled consonants, dropped e.
- **Split phrasal verbs** ("put the meeting off"): bracket the whole span and accept it.

## 3. What the independent review catches (error taxonomy)

Give the reviewer this checklist and ask for `id <TAB> verdict <TAB> corrected text <TAB> reason`:

1. **Wrong sense:** the sentence uses a different meaning from the entry's definition. This is the
   most common real error.
2. **Factual myths** stated as fact in example sentences (science, history, animals).
3. **Audience suitability:** violence, alcohol, romance or fear content in a children's path; adult
   workplace scenarios in a Year 5 path.
4. **Brands and real people or places** used in ways that date or could offend. Prefer generic
   nouns.
5. **Locale drift:** US spellings or vocabulary in a UK app (or the reverse); currency, school-year
   names.
6. **Grammar and naturalness:** a correct but stilted sentence counts as a defect for learners.
7. **Distractor fairness:** a "wrong" option that is actually also correct, or an option that is
   obviously silly.

Apply corrections with a script (`apply_review.py`) that re-runs the validator on the corrected
rows. Spot-check a random sample by hand and record the sample size and result in the checklist.

## 4. Compile and gate

- Corrections become overlays (§2 of `flutter-offline-apps.md`). The compiler merges them and the
  release checker enforces coverage ("every entry has 2 extra examples").
- Record in the project's decision log: the counts, the review correction rate, and what was not
  reviewed.

## 5. Guardrails

- AI-drafted content is **draft until reviewed**. Never ship generated content in a children's
  path without the review pass.
- Never let AI invent claims about exams, boards or curricula. Say "in the style of"; don't use
  trademarked exam names in copy.
- Store the prompts and validator alongside the content so the next batch uses the same rules.

## 6. Linking content to a library (roots, tags, question ids)

- Give the drafter the whole library (id, word, part of speech, definition) and require links **by meaning, not spelling**. A separate reviewer should check every link against the library's *definition*: most bad links were words whose library sense hides the root (produce, prefer, object) or a spelling coincidence (important, report). About 10% of 1,759 links were removed.
- Prefer removing a doubtful link: a wrong link teaches something false, while a missing link only omits.
- For multiple-choice items, give the reviewer the single most important rule: **exactly one defensible answer**, considering every sense of every option and every grouping in odd-one-out. About 4–5% of items needed fixes, mostly a second defensible answer.
- Keep answer positions evenly spread (and shuffled) and check for article clues ("a ___" or "an ___") before a gap.
- Use one generic merge script for OK/FIX/DROP reviews (fields joined by ` || `), which refuses to write anything if an id is missing, duplicated or malformed.

## Evaluation sets and reading passages (added from VocabAura, Oct 2026)

- **Use the same draft → independent review split for evaluation data as for content.** A second agent fixed 61 of 200 search-query labels (mostly missing acceptable answers) and 8 of 30 reading passages (a wrong science fact, an unsafe-sounding scene, clues that gave the answer away, a correct option that was the only long one).
- Brief the drafter to avoid copying three or more consecutive words from the answer's own definition, or the evaluation measures string overlap instead of meaning.
- For comprehension passages, have the compiler check that each target word appears exactly once as a whole word, every clue phrase is an exact substring without the target, options are distinct, and answer positions are spread evenly (a seeded shuffle does this).

