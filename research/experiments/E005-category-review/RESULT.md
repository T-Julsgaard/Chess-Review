# E005: blinded review pack ready; annotations pending

2026-10-05. State: running, awaiting later human review. Instrument development;
**zero human reviews received**. No category-validity or improvement claim.

Open [the standalone reviewer page](review/review.html) in a browser. It contains
24 cases and works offline. It saves partial progress when browser storage is
available and exports JSON; export a durable copy before closing. Your review
can happen later. “Unresolved” and low-confidence judgments are useful evidence.
The [rubric](rubric.md) explains consequence, exceptional ideas and usefulness.
Keep the selection key closed until the independent review is finished.

Cases are one per D001 training game, selected as eight possible material offers,
eight substantial-loss decisions and eight low-loss controls, then shuffled by
the registered hash rule. Engine/selection groups are withheld in the page.
No ratings, identities, outcomes, later actual moves or algorithm labels appear
in the blinded payload. The full preceding history and before/after board/FEN
are available. An offer heuristic is not a verified sound sacrifice.

Candidate pools: 2,609 offer positions / 1,166 games; 13,487 substantial-loss
positions / 1,396 games; 66,921 low-loss controls / 1,400 games. Excluded:
2,908 mate roots, 587 forced decisions, 41 terminal positions and 11,714 positions
outside the selected loss strata. Enrichment prevents prevalence/precision
claims. Neither these strata nor the author-generated synthetic test judgments
are human ground truth.

The first unoptimized build was stopped after exceeding its budget; no output
or human results were used. The documented mechanics optimization completed in
32.94 seconds with zero new engine searches. The 22,205-byte page and case/key
records are retained and hash-bound. Synthetic tests check deterministic legal
selection, group separation, blinding, board states, partial progress, navigation
and bound exports. Real-pack verification reconstructs all 24 original histories,
checks legal focal moves, training-only sources, case identity and embedded data.
Browser DOM mechanics are tested; no cross-browser visual-layout claim is made.

## Reproduce and resume

```sh
npm run research:preflight -- D001 --purpose examples
node --test research/experiments/E005-category-review/code/review.test.mjs
node research/experiments/E005-category-review/code/verify.mjs
```

The committed pack is canonical. Rebuilding uses `code/build.mjs`; do not rebuild
or overwrite reviewed packs silently. It must reproduce the same case identity,
key and HTML hashes, while the run receipt/revision/timing may change. Before
reusing a rebuilt run record, update its derivative registration and commit it.
Evidence: [run and receipt](evidence/run.json), [verification](evidence/verification.json),
[blinded cases](evidence/cases.json); selection key is retained separately.
The dataset manifest records derivative hashes and parents. Each private case
retains a source locator and the D001 legacy-provenance limitations.

Next: retain exported reviews unchanged as individual, versioned annotations.
At least two independent assessments are needed for agreement analysis. A single
user review informs instrument development; it does not establish consensus.
Register any comparison/adjudication separately before reading results to select
an algorithm. Continue rating uncertainty research while reviews are pending.
