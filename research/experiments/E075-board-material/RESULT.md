# E075: verified board and nominal-material foundations

Completed 2026-10-08. Research-only optional explanations for approved queue
ranks 1–8. Five original occurrences gain verified mechanics: C0001 coordinates,
C0002 piece movement, C0016 legal move, C0017 illegal move and C0020 material
inventory. C0030/C0031 nominal comparison and combination counts are expanded
but remain partial; C0547 material in position evaluation also remains partial.
No by-name discharge of other material entries or positional-strength claim.

`foundationTags` defaults false and preserves exact E074, including illegal
move exceptions. The enabled research `explainAttempt` path accepts strict UCI
membership in a live root's complete legal set and refuses nonmembers without
inventing a played position or a reason for failure. Malformed inputs and invalid
roots are errors. Terminal roots are unavailable; actual legal moves may end the
game. Validated full history preserves repetition and clock state. Examples:

> Illegal move here. Legal moves from a2: a2a3/a2a4.

> En passant: your pawn moves e5 to d6 and removes the pawn on d5.

Actual moves retain exact absolute coordinates, type, capture, promotion and
castling/EP transitions. Before/after inventories include every piece's square,
type/color and per-type counts. Declared nominal P1/N3/B3/R5/Q9/K0 arithmetic
uses the actual actor's viewpoint; kings stay in the inventory. Full count-vector
inequality distinguishes equal-point bishop/knight armies. Example:

> Nominal material: you have 6 points versus 1; the difference is 5.

No best-move, positional equality/advantage, strategic evaluation, hidden thought
or teaching-effectiveness inference. New accepted descriptor priorities 4.3–4.8
are below parent annotations and urgent tactics. Comments have qualityClaim false
and at most 24 words. Shared maxFoundationNodes integer 0..50000 counts legal-set
query, inventory snapshots and proof events; exhaustion atomically discards new
facts and preserves the accepted move's parent output. Rejected exhausted attempts
abstain. The demo distinguishes rejected/unavailable input from a played board.

[EXPOSURE.md](EXPOSURE.md) retains failed authored roots, incorrect terminal
fixtures and a parent-event tamper-test selection. A selected-comment audit also
caught foundation priority 100.8 overriding parent check/rook-lift events. Corrected
priorities implement the originally registered precedence gate. Check, mate and
stalemate overlaps now preserve the parent's selected comment. No acceptance gate
or legality requirement was loosened.

Frozen source **0d459987709588262b4c5fc300ff890a22e27ae4**. **165 focused tests**
passed in 3.4s; full cumulative **4,906 tests** passed in 103.9s. Maintained source
verification and diff checks passed. Main/repeat/initially clean detached runs
exited 0 and matched exact revision/input/physical output hashes and metrics;
durations 248455/247030/247820ms. All **4,420 ordered E074 full-result fingerprints**
and original-list hash remain unchanged. Separate tracker audit preserved every
one of the **1,077 nonbatch occurrence rows** exactly.

Across 134 new cases: 62 accepted, 40 rejected, ten terminal-root unavailable,
four exhausted, two exact disabled-parent cases and 16 invalid-input errors.
Independent saved state/event replay verified **400 foundation certificates**:
62 each movement/coordinates/legal-input/inventory/nominal-balance, 50 unequal
army comparisons and 40 illegal-input refusals. Reconstructed 4,298 legal-set
entries and 3,552 inventory entries across certificates. Replay imports no detector
helpers: it expands FEN inventory, uses separate literal arithmetic, reconstructs
history/legal membership/special moves, checks king safety and state/event
completeness. Tests reject forged sets, inventories/values, status, history,
castling/promotion/capture fields, coordinates, text and quality flags.

Full corpus: **4,554 cases**, 4,268 with facts (including refusal explanations),
176 abstentions and 110 invalid-input/move errors. Longest selected comment
**21 words**. Retains 8,049 certificates, 288 query proofs, 26,867 reply edges
and 53,606 continuation leaves. New foundation budget consumed 670 nodes.
Canonical evidence **4,790,881 bytes**, within prospective 20,000,000-byte budget.

[Results](evidence/results.json), [demo](evidence/demo.html),
[tracker](evidence/concept-status.md) and main/repeat/clean manifests retained.
Canonical progress from research:status is **312 verified names, 361 of 1,085
occurrences (33.3%), 77 partial and 724 remaining**. Exposed authored synthetic
mechanics do not establish real-game precision or teaching usefulness. Rejecting
an input is a separate research interaction capability, unavailable from legal
PGN alone. No extension integration, push or numerical scoring change.

Next: audit the approved queue against this canonical tracker before E076.
The nominal parts of ranks 6–8 are now proven; their positional scope still needs
comparison/evaluation evidence. Preserve those pending scopes and prospectively
record their prerequisite-based scheduling disposition before moving to rank 9
pawn inventory and compatible adjacent imbalance claims. Do not repeatedly count
nominal facts or silently discharge the harder evaluation obligations. Phase 6
remains a separate support backlog. Reuse existing branches/checkouts. Goal
continuation is active; numerical research and cancelled usage/shutdown tasks
remain paused, with no replacement goal or automation.
