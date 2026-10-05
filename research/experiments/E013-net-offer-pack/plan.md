# E013: prospective net-offer review-pack enrichment

Registered2026-10-05 after F010, before scanning the new candidate pool or
collecting its searches. Instrument/category development; no human labels yet.
The change addresses two observed selection defects: legal captures need not
cost net material, and near-best moves can preserve a losing position.

## Frozen selection and workflow

Use eligible D001 training histories and retained SF18 rating context only.
Exclude every E005 game before selection; one case per game across this pack.
Retain D001 legacy provenance/exposure, and do not create a fresh test role.
Eligible context: nonforced, best/played mate absent, source loss<=0.02, source
played WDL expected points in[0.5,0.9], and nonterminal after-position. Source
absolute points are an imperfect initial soundness filter, not a new root score.

Sort candidates by SHA256(`E013-case-v1:<gameId>:<ply>`). Choose the first8
distinct-game candidates for which the exact source-bound B000 voluntary net-
material-offer predicate returns true. This includes attributable offers of
unmoved pieces; the moved-piece lower-value-capture heuristic is not required.
The predicate is the same128-node block frozen in E012's registered policy;
canonicalize checkout line endings only. Do not change the board rule or cap.
Stop costly predicate classification once the selected cases are determined;
report cheap candidate count and actual predicate calls, not an invented count
of all net offers in the pool.

For each selected offer, choose one distinct-game nonoffer control (predicate
false), first remaining candidate by the same hash, matched on source played-
point band[0.5,0.7) /[0.7,0.9] and ply phase<=20 /21–80 />80. Never reuse a
game. Insufficient offers/matched controls yields an inconclusive selection
record without threshold relaxation, replacement strata or engine collection.
Shuffle the16 selected cases by `E013-order-v1:<caseId>` hash.

Create a separate offline pack/rubric-v1 identity, HTML and export namespace.
Reuse the tested E005 presentation/rubric; E013 storage/review schema and export
filenames distinguish the new pack. Withhold strata, scores, engine properties,
ratings, IDs, outcomes and later actual moves. Preserve E005 files and reviews.
Reviewer sees before/after board, played move and full preceding SAN history.
Retain individual/partial exports; one review is not inter-reviewer consensus.

## Prospective operational screen

Freeze the16 cases and register/commit the pack/key before new searches. Collect
unrestricted roots and every legal restricted alternative at SF1820k/80k nodes,
exact same E012 build/options/full history/cold reset and root validation rules.
Reuse E012's **unchanged** engine property definitions: maximum restricted WDL
point loss strictly<0.02, played CP>=-50 or positive mate, competitive alternative
gate at500CP, and no delayed known winning mate. These are research diagnostics,
not the published SF18 human-outcome curve or human Brilliant labels.

Primary:>=7/8 selected offers satisfy board plus all engine properties at both
budgets. Require complete16-case/all-legal coverage and engine-property
eligibility unchanged in>=15/16 cases. Report95% Wilson intervals, every failed
property, original root-pair versus complete-alternative decisions, costs and
all8 controls. Fixed cases, one assessment, no candidate fitting/interim looks;
keep unsupported/unstable cases in the pack and evidence. No result-driven
replacement or reordering. A local-offer-positive inclusion rule cannot itself
prove independent category validity.

Compare operational support with F010's0/8 descriptively. Samples have different
selection/composition; no paired causal gain or population precision claim.
A successful screen means better targeted tactical evidence for later review,
not confirmed perceived brilliance, instructional usefulness or classifier
improvement. Human validity, independent reviewers and future confirmation
remain separate; no promotion or production scoring edit follows.

## Budget and verification

Selection cap5min/2MiB retained pack/key; search cap15min/3000requests/3MiB
compressed raw observations. Authored mechanics/UI tests and the already verified
same-engine smoke precede actual selection. Commit selection/collector/scoring
code first; append D001 exposure before use. Shared guarded loader in every
entry, source locators and exact source/code/policy/pack/engine/output hashes.

Preserve raw query cache and exact live handle; no restart on observation timeout.
Register/commit complete raw before one screen; register report before replay.
Require source/history/legality/blinding/export checks, deterministic selection
reconstruction, exact property replay, independent equations/completed exchange
recurrence and external clean archive replay. State incomplete reference checks.
No new sources, network acquisition, model-generated human judgments or silent
overwriting. Record unsuccessful collection/checks and all negative findings.

Implementation clarification before pool scanning: independent verification will
also retain positive net-offer witnesses from completed local capture recurrence,
attribution and a concrete legal alternative avoiding local loss. The reference
cap is16,384 recursive calls per exchange; unresolved witnesses are reported,
never guessed. This strengthens verification without changing selection or the
registered operational gates, and supplies no human judgment.
