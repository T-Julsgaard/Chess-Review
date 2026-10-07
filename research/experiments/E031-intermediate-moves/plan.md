# E031: verified intermediate moves

Registered 2026-10-07 before decisive evaluation. Import frozen E030;
research only, authored synthetic positions and no extension integration.

Use verified history to establish the opponent's immediately preceding capture
and a currently legal immediate recapture. The played move instead gives check,
captures a different unit, or delivers actual mate. Exclude promotions in the
last capture and immediate recaptures from this candidate. No inferred intention,
expected human reply, best-move or whole-game evaluation claim.

For intermediate check/capture, every legal defender reply must permit a legal
capture of the original capturing unit (track its destination if it moves).
An existential recapture must survive every immediate enemy counterreply with
positive fixed material gain versus the board after the intermediate move,
rejecting counter-mate and draw. Actual recapture mate is an acceptable terminal
benefit; no subsequent counterreply exists. Reject defender terminal outcomes.
Full all-defense/one-recapture/all-counterreply certificates and independent
replay. maxIntermediateNodes integer 0..50,000 shared per request; exhaustion
drops all new finite claims, while inherited facts remain. Actual intermediate
mate requires verified prior capture and legal recapture option, no finite search.

Short comments name intermediate check/capture or mate instead of recapturing,
with target and <=24 words. Specific actual mating patterns and warnings retain
priority. The scoped Zwischenzug label is a verified recapture-delay subset,
not every tactical in-between move. No automatic-recapture criticism.

Authored checking/capturing/mating positives, moved capturer, en-passant history
where feasible; ordinary recapture, missing/mismatched history, no direct
recapture, refutable delay, counter-mate/draw and budget negatives. Rank/color
reflect. Independently recompute prior capture, direct recaptures, target tracking,
all legal reply sets, existential legal recapture and every counterreply outcome.
Tampering sets, moves, target, balance or leaves must reject.

Guard D001 before dynamic fixtures, record receipt and normalized hashes/exact
source revision/command/config/environment. Pilot costs; cumulative run estimate
<=180 seconds and <=3 MB retained evidence. Targeted cumulative tests and source
verification; exact repeat and initially clean task-owned checkout reproduction.
Definition metadata only; no source games, diagrams or positions imported.

Coach expansion/live five-hour cutoff active. Near 10% remaining checkpoint and
commit, disable heartbeat then authorized normal shutdown without /f. Numerical
research remains paused; no push. Next unused E032 can study history draw facts.

## Exposed development notes

The initial refutable-check proposal did not give check at all. The retained
negative instead permits Bf7xe8, removing the checking rook so the subsequent
recapture has no positive net gain. Separate controls refuse recapture followed
by enemy mate and a recapture leaving insufficient mating material. A moved
capturer Ra4xe4 is tracked to e4 and recaptured by Pd3xe4. A nonchecking
intermediate capture has a pinned original capturer and preserves recapture
against all replies; no subjective surprise or opponent intention is inferred.
