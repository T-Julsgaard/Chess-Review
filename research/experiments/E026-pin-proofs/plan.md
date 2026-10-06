# E026: finite relative/cross-pin and defender-removal proofs

Registered 2026-10-07 before evaluation. Import frozen E025 and its shared
selection policy; research only. No engine, seed, tuning or real-game inputs.

## Candidate

Relative queen pin: own slider, exactly one enemy blocker, enemy queen beyond
it on an aligned ray. Blocker must be worth less than queen by 1/3/3/5/9 values.
At least one legal defender move takes that blocker off the pin line (including
slider/queen endpoints in the line, so capturing the pinner is not an off-line
move). For EVERY such legal off-line move, the original slider must survive and
legally capture that original queen. EVERY immediate counterreply then leaves
positive nominal gain relative to the position AFTER the played pin move.
Reject defender terminal outcomes and counterreply mate/draw. This is conditional
on moving the blocker off the line, not a forced queen win against all defenses.
New alignment required; old alignment suppresses repeated commentary.

Cross-pin subset: the same blocker is also absolutely pinned to its king on a
different slider line, and the conditional relative-queen-pin certificate above
passes with at least one legal off-queen-line move. The absolute pin may predate
the played move; the mixed two-line relationship must be new. Zero legal
off-line moves does not pass vacuously. Two absolute directions to one king are
still impossible; two-relative-pin cross-pins remain outside this candidate.

Certified defender removal: played capture removes a geometric defender of a
remaining enemy non-king target. Every legal opponent reply must permit a legal
capture of that original target by an original attacker on its post-move square;
every immediate counterreply leaves positive nominal gain relative to AFTER
the played defender capture. Require one original target, not all targets won.
Reject defender terminal outcomes and counterreply mate/draw. Finite success
does not imply all future defenders removed, intent or long-term victory.
Keep E025 geometry events for uncertified cases but separate their partial scope.

All E026 certificate operations share maxProofNodes=50,000. Exhaustion removes
all E026 finite events and leaves inherited facts/proofs intact. Parent budgets
remain separate and are named explicitly. Own target capture ending in mate is
allowed; opponent counter-mate and draw are rejected. Full witnesses retain
initial balance/FEN, complete relevant defender replies, captures, every
counterreply, worst gain and horizon. Selected comments <=24 words with explicit
conditional/immediate scope. Strong pin/defender motifs outrank generic alignment.

## Gates and retention

Authored positive/negative fixtures plus rank/color reflections. Independently
replay the relevant reply set (all replies for removal, all legal blocker moves
off the line for pins), geometry, target captures and balances; missing/duplicate
replies, wrong target/gain/baseline must fail. Test counterchecks, capturable
pinners, recapture losses, no off-line moves, old pins, incomplete cross-pins,
king-only/unsupported targets, terminal draws and budget exhaustion. Existing
synthetic mechanics and all earlier finite certificates still pass.

Guard every input-loading runner/test with shared D001 eligibility before
dynamic authored fixtures. No game sample. Retain exact revision, normalized
source hashes, receipt, commands, environment, timing and deterministic outputs.
Full new cases and fingerprinted inherited cases with frozen evidence links;
repeat and initially clean local checkout source/output hashes must match.
Estimate <=30 seconds and <=3 MB retained evidence. Targeted tests and source
integrity before local commits. Log exposed amendments; synthetic success does
not establish real-game precision or educational benefit.

Live usage cutoff stays active: 10% remaining in 300-minute window means
checkpoint/commit, disable heartbeat, normal authorized shutdown without `/f`.
No extension integration, push or numerical goal restart.

Implementation notes, 2026-10-07: supplied verified move history is replayed
inside E026 certificates so known repetition draws also reject new finite
claims. FEN-only inputs cannot establish earlier repetitions; inherited E020–E025
events retain their frozen history limitations. The proof budget may be lowered
for controls, never raised above 50,000. Initial authored removal without a
surviving pawn correctly failed through insufficient-material draw; it is
retained as a negative case, with a distinct pawn-containing positive. A rook
blocker case correctly failed through an off-line countercheck and is retained
as a negative rather than weakening the conditional gate.
