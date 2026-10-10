# E177 — queen exchange into a certified winning rook ending

2026-10-10. **Prototype, not accepted evidence.** Preregistered81eab09,
parent E1761217943. E176 adds explicit scope APIs, so runtime explainMove parent
remains E175. Authorized current main, research-only local commit, no push.
Separate bounded C0545 favorable-endgame preparation and complementary C0546
finite capture-counterplay prevention. General strategic meanings remain open.

Default-disabled `endingPreparationTags` preserves E175 exactly. Require genuine
legal history, `endingAlternative` (distinct legal noncapture by any own unit;
checking alternatives allowed), and exactly kings, opposing queens and one own
rook. Actual own queen captures enemy queen. `endingMatePlies` integer0..2,
default2; shorter bounds abstain. `maxEndingPreparationNodes` integer0..50000,
default50000. Optional complete `endingPreparationPanel` independently admitted.
Missing/context prerequisites abstain; malformed controls and inherited terminal
current-root inputs reject. Atomic exhaustion discards own witness/events and
preserves parent with limit+1. Priority191.5, qualityClaim:false, <=24-word text.

Both genuine legal alternatives retain complete enemy reply inventories, every
enemy capture and every immediate own counterreply, material/identity/terminal/
claim states and E144 finite-query traces. E144 collector/independent trace replay
are reused unchanged. No FEN turn swap, null move or removed-piece frame.

C0545 requires every nonempty actual defense to be a king recapture of the moved
queen, reaching live KRK with the original rook retained. The complete actual
actor mate policy within two continuation plies must pass, and the alternative
policy fail. A material edge or a merely simplified board cannot establish this.
C0546 further requires no enemy immediate profitable capture policy under actual
but at least one under alternative, preserving strictly positive enemy gain
through all nonempty live own counters. Both use the same original-root balance:
capturing the exchanged queen does not itself imply profit after losing a queen.
Visited fifty/threefold claims anywhere suppress findings. Longer attacks,
positional counterplay, other ending classes and general favorable value remain
unresolved; this does not solve those broader original definitions.

Authored White Kg6 Qf7 Ra1 versus Black Kh8 Qg8 is genuinely checked. Qxg8+
forces Kxg8 and Ra8#. Alternative Qg7+ permits Qxg7+ retaining nine points through
every immediate counter. Both labels pass. Alternative Kf6 permits Qxf7/Kxf7,
with no certified enemy capture gain; only C0545 passes. Rf1 replaces Ra1 and
allows Kxf8 after Rf8+, defeating H2 mate. Rg7 protects the exchanged queen, so
Qxg8 is immediate mate and no ending transition exists; neither label appears.
A halfmove99 root's noncapture alternative reaches a fifty-move claim and
suppresses both. Both colors pass; no exploratory chess hypothesis failed.

Development evidence:

- 60 focused checks passed23.6seconds, plus two E175 compatibility/strict-control
  representatives. Includes separate labels, both colors, full ending/recapture
  constraints, original-root gain, exact/short/fresh/saved/zero budgets, strict
  inputs/history, real two-ply prefix, terminal/claim behavior, 26 semantic
  panel/query/inventory/counter/ledger/witness mutations and caller metadata.
- Guarded D001-test pilot20cases,10witnesses,4positive cases,10unique panels.
  Five White smoke panels were immediately retained/reused; only five reflected
  panels newly collected in the pilot. Final run reuses all ten, zero fresh
  collection. Existing E144 source-bound query cache was checked first: no exact
  full input/history/move/H match. One additional genuine-prefix witness is saved
  and reused rather than repeatedly collected by tests.
- Independent replay reconstructs every pilot and prefix proof, complete legal
  inventories and all capture/counter states, query traces, derived labels/work,
  receipts/output hashes, E144 cache audit, parent snapshots and797normalized
  recursive source/dependency hashes including full E176 build. Independent
  checkers import no new detector/context/collector/derive. Shared Chess semantics
  remain a limitation. Source verification and diff checks pass.

One development test incorrectly expected terminal current-root abstention;
E020 rejects before wrappers run. Detector behavior was preserved and the test
corrected to require the exact parent error. The dated amendment and all original
E177 code, full failed build/dependency hashes and actual error output are retained
under `evidence/failed-terminal-root-contract/`; independent replay verifies those
source bindings. No chess gate, horizon, fixture or budget was relaxed.

Late coverage audit found E098 already provides C0546 quiet-move single-unit
prophylaxis with a restore-only-mover counterfactual; it explicitly excludes actual
captures. E177's queen capture, forced winning ending and all-unit capture
inventory under genuine alternatives extend that scope. Both records remain and
C0546 is counted once. Only C0545 is newly code-covered. The late discovery and
its timing are disclosed in the amendment; E098 code/evidence is unchanged.

Compressed observations/results total26,065bytes; retained evidence about242KB,
below500KB soft target. Standard gzip decodes JSON; the full source fingerprint
and receipt are in run.json, collector closure and cache audit in observations.
No engine/tablebase acquisition, real games, annotation or locked confirmation.
Production/numerical behavior and accepted tracker unchanged.

Accepted E082 remains378/1085(34.8%),328names. Separate build coverage426pending
entries,97ready/0stale batches;804/1085accepted-or-candidate(74.1%),281without
candidate code. Combined cumulative regression, exhaustive occurrence/absence/
priority/history/budget audits and changed main/repeat/clean reproductions remain
deferred. Real-game precision/usefulness and full strategic scope remain open.

Next: audit C0554/C0582 initiative against existing E143 attack/tempo proofs,
then weak-square/minor-quality scopes. C0549 activity and C0556 coordination
already have E109/E110 candidates and must not be regenerated. Preserve C0519
long-term planning and broader sustained-strategy prerequisites explicitly.
