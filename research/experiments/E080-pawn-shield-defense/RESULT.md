# E080 registered pawn-shield defense research

2026-10-08. PLAN preregistered before code or fixture evaluation. Reuse exact
E079 parent and frozen E027 hypothetical-turn/E029 mate-query semantics. Require
a cover pawn's causal obstruction of a complete prior hypothetical mating
capture plus exhaustive absence of mate in one after the actual move. Global
king safety, other cover interpretations and quality claims remain unresolved.
Initial research-only wrapper implemented. First three focused tests passed in
1.6s: queen-file cover hypothesis and its Black reflection produce complete
frozen-source before-mate/after-no-mate proofs independently replayed by E029;
disabled exact E079, strict new inputs and zero-budget atomic refusal pass.
Full independent wrapper replay, broader positive/negative coverage, final
cumulative gates and exact saved reproductions remain outstanding. This is
developmental exposure, not acceptance or tracker advancement. E079 canonical
coverage remains 321 names/370 verified occurrences, 78 partial, 637 unimplemented,
715 remaining, 34.1%, 60 completed coach studies (research:status).

Practical evidence minimization policy adopted from current main; estimated
900–1,100s/run and roughly 8MB are soft planning targets, not scientific gates.
Preserve complete proof content, all failures and exact independent reproductions.
Shared main/research branch contain completed E079 at 5ab2396; new E080 work
stays on existing isolated codex/coach-concepts-e058-evidence. No extension/push.
Numerical work paused; usage cutoff, shutdown and automation remain cancelled.

New tests add exact/one-less atomic budget and cover-without-threat/obstruction
negative gates; all five focused tests pass in 1.9s, maintained source/diff
checks pass. EXPOSURE retains the observed roots/results; no failure occurred.
Current
initial positive coverage was queen on home-g king only, both colors. Expanded
queen translations exposed alternative remaining mates, retained as negatives.
The original rook hypothesis also remains a before/after-mate negative; corrected
rook candidates prove the effect on all c/e/g home files and another bishop
support ray. Ten positive/eight retained negative fixture cases now have frozen
source proofs, and all 21 focused tests pass in 3.8s. Source/diff checks pass.
Every failed root and observed continuation stays in EXPOSURE/fixtures; no
detector change or acceptance weakening. Neither occurrence advances without
full independent wrapper replay and the remaining registered final gates.

Independent wrapper replay now implemented without importing new detector,
cover/ray predicates or the source solver. It separately derives square
inventories, three-file/two-rank cover, scalar interior rays and the complete
finite one-ply truth table in frozen source ordering; frozen E029 replayQuery
also semantically checks every supplied tree. Reconstructed parent/events/text,
history, status and exact atomic work units must match. All 22 focused tests
pass in 6.9s, including 21 forged inventory/cover/king/pawn/legal-move/ray/
blocker/snapshot/history/proof/node/status/quality/priority/text/selection
mutations. Disabled, exact/one-less and zero budgets replay independently.
No new detector change, failure, acceptance or tracker advancement.

Expanded history/terminal/refusal collection initially failed ten assertions
in 10.8s due to two authored geometry assumptions and three missing borrowed
error expectations, both colors. Guarded complete original results retained
under research/runs/E080/development/guards-original.json; exact failed roots
remain alongside corrected castling/pin roots. Corrected collection passes
all 114 focused tests in 11.1s. Full valid history, strict/refusal/capture/
castling/promotion/nonpawn/king/two-square outside-cover, home-file/rank,
pinned-slider/pawn, noncausal bishop and inherited terminal/foundation guards
are now checked with independent wrapper replay. No detector/gate changes.
Prepared guarded 110-case saved development pilot, before costly cumulative
collection; estimated 15s/under 1MB, with source/input hashes and full results.
Pilot at bca51b0 passed in 6.314s: 110 cases, 12 proven, 32 no-new-fact,
two disabled, four exhausted, 12 not-applicable, ten not-live and 38 input
errors. All 12 certificates and 324 replies/leaves independently replay from
saved JSON; all 267 normalized-text/raw-binary input hashes pass. Physical
artifact 665,381 bytes, SHA-256
68125d105ee47a188eb1a057fb83e9b803471787ce20194cc2a00865d2af677a,
under research/runs/E080/pilot/results.json. No size-only optimization needed;
actual cheap cost/size are below soft estimates. Role remains exposed development,
not canonical acceptance. Remaining named gates include explicit checking-move,
extra distant pawn/higher-warning selection and rehashed storage forgery checks,
plus cumulative runner/tracker/demo and all registered exact final checks.

Next: build cumulative runner/tracker/demo and finish remaining
registered coverage before cumulative/exact final gates. Shared reconciliation policy
c43b471 incorporated at clean boundary via 22b9abe; source/diff and unchanged
261-input/three-output E079 manifest audit pass. Ordinary local divergence
will now be reconciled safely under that explicit approval before integration.
