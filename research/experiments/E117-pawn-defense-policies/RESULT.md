# E117 — provisional pawn defense policies

2026-10-09. Preregistration a04a358, parent E116 ee7c87e. Implemented under
BUILD-FIRST in the explicitly authorized current main checkout. Local commits
only; no push. Numerical research and production untouched.

Callable default-false pawnDefenseTags; strict pawnCoverPlies 0..4 default1 and
maxPawnDefenseNodes 0..50000 default50000. One atomic budget, disabled exact
E116 compatibility. Live legal actual/history reconstruction, at most ten units.

C0211: complete legal opponent defense inventory; selected fixed enemy pawn
has some profitable legal capture after EVERY defense, with independent nominal
gain through EVERY next response. Capturers can vary; failed pawn/capture/defense
prefixes retained. This is conditional gain relative to the capture, not net gain
from the initiating move, hidden intent or lasting structural weakness.

C0227: after actual quiet cover-pawn advance, full actual and fresh enemy mate
queries fail at the same horizon where legal removal of ALL home-king cover
pawns succeeds. Reuses E029 solver/neutral semantic replay. Complete cover's
total bounded defensive effect includes escape-square changes, not ray blocking
alone. Wider king security, structural permanence and strategic value stay open.

Initial 51-check run failed two expected-cover positives and their mutation
check: E080-style queen-file cover removal leaves the nonmoving king already in
check, hence illegal. Preserved as a negative; no gate weakened. Authored legal
queen/bishop/rook setup permits ...Qh2# only after entire cover removal. Added
surviving knight defense and already-existing mate controls. Reflected colors.
Preliminary varying-capturer hypotheses fail when a subsequent response can take
the other knight: losing unrelated material invalidates the certificate. Retained
negative has both c4e5/c6e5 partial capture choices before a failing king defense.
Added failed first pawn before successful second pawn to test selection prefixes.

Final 64 focused checks pass in 7.8 seconds, including exact budget boundaries,
strict inputs, history/illegal moves, disabled behavior and checker mutations.
Three representative E116 disabled/strict/history checks pass in 0.6 seconds.
Source verification and diff checks pass. No cumulative suite, engine or costly
historical recollection. Small guarded D001-test pilot and independent saved
replay pass 46 cases, 40 witnesses, 12 positives, 6 expected exhaustions. Checker
never imports candidate/solver; reconstructs complete defense and capture lists,
selection/failure prefixes, all material replies, frame legality and mate trees.
All 124 normalized source/fixture/dependency hashes verify. Synthetic only;
no acquired games, reserved labels, real-game assessment or pristine frozen runs.

Retained evidence: evidence/results.json.gz and evidence/run.json, copied from
research/runs/E117/final. Source revision, argv, Node/platform/architecture,
engine:null, seed:null, dependency hashes and guarded eligibility receipt bound.
261,477 plain bytes, 27,018 gzip bytes. Packed SHA256
d8137cfbccccbd8fcc156987a56ff14646360efcc676389ed49f3f37cbca79e6;
plain SHA256 cda4c88ad50eca6306aceb50f3a9112fd337135cbeb88edecbccad69eaf75c63.
Replay: node research/experiments/E117-pawn-defense-policies/code/replay-saved.mjs

Accepted E082 unchanged: 378/1085 occurrences (34.8%), 328 names. Build metadata:
281 provisional entries, 38 ready/0 stale batches; 659 accepted-or-candidate
(60.7%), 426 without ready code. Original definitions and accepted records intact.
Deferred combined regression, exhaustive semantic/absence/integration/priority/
history/budget/occurrence audit, exact main/repeat/clean reproductions and
real-game precision/usefulness. Focused success remains provisional.

Next unused E118: inspect remaining tactical attack/queen infiltration families,
reuse causal placement/coordination policies where genuinely applicable. Pawn
structural permanence and general opening advice require explicit prerequisites.
Continue compatible focused batches in authorized main; no long cumulative runs.
