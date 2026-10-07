# E067: waiting moves and used reserve pawn tempi

2026-10-07. Preregister before implementation/evaluation. Research only; usage
cutoff/shutdown cancelled. Separate claims: Waiting move C0763 and Reserve
tempo C0616/C0649/C0760. Reuse frozen E066 and3,200 ordered baseline results.
D001 gate before every locally authored fixture/probe. No extension, acquired
games, numerical research, branches or pushes.

Opt-in waitingTempoTags; maxWaitingTempoNodes integer0..50000 shared budget.
Disabled exact E066; exhaustion removes all new tags and incomplete proofs.
Actual legal noncapturing, nonpromoting, noncastling move, neither before own
king nor after enemy king in check; actual after live. Actual mover has NO
mate-in-one before the move. Explicit hypothetical pass changes only turn,
clears EP and preserves other state/counters; must independently be legal/live.
Both hypothetical pass and actual after must prove mate after EVERY legal enemy
reply followed by ONE own mating move (complete bounded mate-in-two proof).
This is a present mating opportunity preserved while passing the turn, not
general quiet-move intent, best play, zugzwang or evaluation improvement.

Waiting move label requires all of those conditions. Used reserve tempo label
additionally requires actual straight noncapturing own pawn advance, and legal
live removal of ONLY that pawn from both before and after frames (clear EP).
The two removed-pawn frames must have identical placement/rights/EP and enemy
to move; each must independently prove the same all-reply mate-in-two property.
This demonstrates a pawn waiting resource outside the required mating material;
it does not establish a stock of future tempi, permanent safety or opposition.
No removed-pawn hypothetical may expose a king or turn into a terminal state.

Retain strict history/actual record, all full counterfactual FENs/identities,
before mate-in-one exhaustive failure, pass/actual complete all-defense mate
trees, and for reserve separate removed-pawn full proofs. Replay imports no
detector/query helpers; reuse frozen E029 independent replayQuery for trees,
independently reconstruct all frames/conditions/history/short text. Comments
<=24 words, qualityClaimfalse. Priorities waiting159.01 reserve159.02 above
generic quiet mating net159, below urgent hanging160/fork170/missedmate188/mate200.
Actual mate1 failure mandatory, never praise missing immediate mate.

Author separate positives/negatives per claim: pawn/piece waiting, single/double
steps, both colors/horizontal counterparts, mate1 already available, new-created
threat only, pass illegal/terminal, checks/captures/promotions/castling, pawn
integral to mate, removed-pawn king exposure/dead state, enemy defenses/countermate,
draw clocks/repetition/full history, options/exhaustion and corrupted proofs/
frames/legal sets/text. Retain failed pilot search/fixtures and protocol deviations
in EXPOSURE; if no positive satisfies contract, record inconclusive rather than
relaxing gates to obtain labels. Target, full cumulative coach/source/diff.

Commit frozen source before main/repeat/initially clean full reproductions.
Reuse existing isolated branch and clean inactive verification checkout in
detached HEAD; distinct outputs, fixed source until all three terminal. Exact
revision/input/physical output/metrics, inherited fingerprints, original-list
hash and independent saved-proof replay. Estimate~260s/run overlapping3;
prospective full evidence<=12MB based on E0667MB with all defense/refutation
trees and multiple causal query trees. Keep/report misses without dropping proofs.
Synthetic exposed mechanics do not establish real-game precision or teaching
benefit. Integrate completed results via existing shared branch and fast-forward
clean already-on-main checkout; never push or switch shared checkout.
