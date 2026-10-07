# E067: causal waiting moves and used reserve pawn tempi

2026-10-07. Research only; numerical work paused, cutoff/shutdown cancelled.
Original list unchanged. No extension integration, acquired games or pushes.

Opt-in waitingTempoTags identifies an actual quiet noncapturing, nonpromoting,
noncastling move preserving an existing mating opportunity while passing the
turn. Neither own king before nor enemy king after may be in check. No immediate
mate originally available, proven by an exhaustive one-ply failure tree. A legal
live hypothetical pass changes only turn and clears EP, preserving other state.
Both that pass frame and actual after must prove mate on the mover's next turn
against EVERY legal enemy reply. This names a concrete waiting opportunity;
no general intention, best-play, zugzwang or evaluation-improvement claim.

Reserve additionally requires a straight pawn step. Remove ONLY that pawn from
before/after frames, clear EP, give the enemy the turn, and independently check
legality/live state. Their placement/rights/EP must match and BOTH must prove
all-reply next-move mate. This verifies a used pawn waiting resource outside the
necessary mating material, not a future tempo inventory or endgame opposition.
Disabled behavior equals frozen E066; shared budget exhaustion drops ALL new
events, including a waiting proof completed before a later reserve budget miss.

Selected examples:

- “Waiting move: Nb4 passes the turn while preserving mate after every legal reply; no immediate mate was available before.”
- “Reserve tempo: a3 uses a pawn waiting move; the other pieces retain mate after every reply even without that pawn.”

Full evidence retains strict history/actual record, before immediate-mate failure,
explicit pass/actual full mate trees and separate removed-pawn reserve trees.
Independent frame replayer imports no detector/query helpers, reconstructs all
history/legality/identities/frames/text and uses frozen independent E029 replayQuery
for every complete legal tree. Actual/before boards preserve history; explicit
counterfactuals are fresh legal frames and do not invent repetition history.

EXPOSURE retains two empty pilots: 326 legal queen roots (226 eligible), and
1,135 knight-assisted roots (682 eligible). Broader enemy-blocker/helper pilot
finds eight candidates from 1,542 legal roots (294 eligible). All searches locally
authored behind public D001 guard; exposed development, not confirmation.
No gates relaxed. With own Kf6/Qe3/Ne7 and enemy Kh8/Ph7, either legal enemy
h7h5 or h7h6 permits Qh6# or Qxh6#, while own immediate mate before is absent.
Pawn a2a3/a4 passes all reserve counterfactuals; Na2b4/Ba2b3 qualifies only as
waiting. Bishop-assisted and h-file queen variants also pass. Both colors and
horizontal counterparts retained. Initial expanded 110:109 pass, one SAN assertion
incorrectly called the h6 capture Qh6#; corrected to Qxh6#, no detector change.

Immediate mate already available, newly created threat only, no mating net,
checks/captures/promotions, missing/wrong helper, enemy defense/promotion,
integral queen relocation, disabled/zero budget and illegal steps do not qualify.
An actual clock terminal suppresses labels; recorded h7h6 history already offers
immediate mate, so it is correctly rejected. Corrupted frames, proof branches,
winner, actual move, history, counters and text fail independent replay.
Positive certificates have zero history plies in these authored fixtures; this
is not broad empirical verification of historical game precision.

All 110 target tests and 3,579 cumulative E020–E067 tests pass. Full coach command
passes in 88.4 seconds; maintained source verification/diff passes. Frozen study
source c07dd41 before all runs. Reuse existing clean inactive verification
checkout at exact revision in detached HEAD, distinct outputs; no new branches
or clones. Main/repeat/initially clean match exact revision, normalized inputs,
physical output hashes and metrics;268–270s versus estimated 260s.

Full run 3,304 cases:3,102 with facts,144 abstentions,58 refused illegal moves;
selected comments at most 21 words. Cumulative independent replay 6,019
certificates,288 queries,22,147 reply/history edges and 46,824 leaves. New
classification 6,648 bounded nodes; inherited trap checks 4. No engine fitting.
Independent saved JSON replay verifies 32 waiting certificates and 24 reserve
certificates on 32 positive rows,68 legal negative rows and four illegal moves.
New proofs retain 2,640 legal tree edges and 2,320 replay leaves. Physical mates
checked after both enemy single/double pawn replies. All 3,200 inherited full
fingerprints match E066 in order; original-list hash unchanged.

Complete evidence 3,781,364 bytes within prospective 12MB budget, including all
pilot summaries, proof JSON, compact frozen E053 display and three manifests.
Coverage 293 verified names /341 original occurrences;76 partial and 668
unimplemented. Only the concrete waiting and used-reserve scopes are checked.
Real-game precision, teaching benefit and extension readiness remain unknown.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean](evidence/clean-run.json),
[pilot outcomes](EXPOSURE.md).
Reproduce: `node research/experiments/E067-waiting-tempi/code/run.mjs --out research/runs/E067/reproduction`.
Guarded D001 receipts retained. Completed result integrates via existing shared
research branch and fast-forward clean already-on-main checkout; never push.

Next: E068 investigate Rook swing through legal tracked rook history: a prior
lift then actual horizontal transfer creating a check on the enemy king's file.
Require identity, geometry, full legal history and all replies, including rook
captures and terminal flags. Do not infer safe attack or successful king hunt
from the maneuver alone. Preregister before pilot/evaluation.
