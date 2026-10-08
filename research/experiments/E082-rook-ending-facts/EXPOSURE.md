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
