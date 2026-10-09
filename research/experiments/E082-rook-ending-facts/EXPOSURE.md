# E082 development exposure

2026-10-09. Authored synthetic development only. Initial16 focused checks pass
in3.3s with independent replay: both-color side checks, 4v3/3v2 last-minor
capture transitions, capturable checker, pre-existing-count negative, strict/
atomic budget and forged evasion/count/text/quality checks. Source/diff pass.

First borrowed-source collection fails5 checks in11.8s: four inherited error
fixtures/reflections were treated as positives because their older default
expectedStatus is proven; saved-proof reuse also selected an error row and
attempted replay of its absent result. All original roots/errors retained.
Use explicit inputError assertions for those fixtures and actual non-error
saved state for proof reuse. No detector/predicate/budget/gate change. These
are adapter errors, not new chess evidence. Retain corrected adapter separately
from unchanged frozen FRIEND-01 data/proofs. Next rerun focused reuse checks.

Second focused adapter run fails8 assertions in12.0s: strict flag/budget error
cases still expected old option names after those options were removed by the
adapter. Preserve original borrowedInput and map bad values/error names to
the corresponding new strict flag/budget. Actual legality/history errors stay
unchanged; no case removed. Saved22-positive independent legacy proof audit
now passes. Detector/predicate/budget/acceptance unchanged.

Third adapter run repeats8 failures in11.5s: old fixture harness stores values
in generic flag/limit fields, not public fourThreeTags/maxFourThreeNodes keys.
Read those exact retained generic fields when translating the strict error
cases. No source changes; original borrowed input retained in each adapter row.

Corrected89focused tests pass10.8s; source/diff pass. Guarded86case pilot6.681s,
1385592bytes, exact300inputhashes; all68saved certificates and12expectederrors
independently replay. FrozenFRIEND-01 bytes/inputs and22original positive proofs
also independently replay. No acceptance or tracker advancement. Complete new
pilot saved under research/runs/E082/pilot; original borrowed errorfixtures kept.

Expanded matrix initially fails two reflected expectations in 15.2 seconds:
b1b8 is a legal rook history move, so the rejection is final-FEN mismatch,
not illegal move. Original root/id retained with retainedMislabel; separate
b1c4 diagonal rook move added for genuine illegal-history coverage. No detector
or acceptance changes. Expanded pawn-capture/EP/promotion/count/rank matrix then
passes 225 focused checks in 18.2 seconds, and broad tamper/storage checks pass
228 focused checks in 22.4 seconds.

Priority observation prospectively registered in AMENDMENT commit 4f5a295 before
changing only new priorities. Follow-up focused run fails two assertions in
22.5 seconds: original last-minor material root also hangs its rook on the a-file,
so its higher hanging-piece warning must remain selected. Use retained split-wing
root with blocked enemy rook file for the explicit benign count-label selection;
retain original unsafe root unchanged. Terminal-root preview used the inherited
strict illegal-move guard instead of the already retained foundation-unavailable
guard; use the latter for terminal display, keep both original guards. These
correct expected behavior without weakening selection or legality.

Corrected selection/tracker/preview run passes 229 focused checks in 22.1 seconds.
Benign split-wing material selects the exact count label, actual side+material
selects the side check, and the capturable variant retains hanging-piece. Authored
rank 1/2/8 and static exact/one-less core budgets are then added prospectively to
the final matrix; independently observed complete work is side20, material9,
side+material20 and reused E057 side18. No cumulative collection has run yet.

Final rank/budget matrix passes 251 focused checks in 23.3 seconds. Expanded
244-position pilot14.307s/2974586bytes, then final pilot14.570s/2974995bytes,
128proven/134certificates/48expectederrors; candidate runner pilots20.583s and
19.718s retain all core proofs, 256evasions and unchanged1082outside rows.
All saved pilot/runner results independently replay and input/output bytes
authenticate. Earlier runner/pilot/audit versions have exact hash-bound snapshots
under research/runs/E082/expanded-pilot and runner-pilot, plus pre-promotion
fixture/test snapshots for both final pilots. Added core-only runner mode and
audit sources are development changes, never inherited decisive collections.

The promotion-interposition edge case fails two reflected assertions in24.6s:
the pawn has EIGHT legal promotion defenses, four blocking promotions on b1 and
four capture-promotions taking the checking rook on a1. The complete witness and
independent enumeration already retained all eight; the test expected only four.
Keep both original positions/IDs and assert both full four-choice groups,
capture flags and all resulting live states. No detector/predicate/budget change.
Next final focused check and fresh complete saved pilots precede full regression.
