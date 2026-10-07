# E066: all-defense first queening in pawn races

2026-10-07. Research only; numerical work paused, cutoff/shutdown cancelled.
Original list unchanged. No extension integration, acquired games or pushes.

Opt-in pawnRaceTags proves first queening in EXACT king-and-one-pawn per side
after an actual noncapturing, nonpromoting pawn advance. Both pawns must be
passed and advanced at least to their own fifth rank. The mover's tracked pawn
must have a legal straight queen-promotion route against EVERY legal enemy
move within the configured horizon (up to six plies). Enemy king moves, pawn
checks, captures and all four enemy promotion types are included. Own strategy
is restricted to legal straight noncapturing advances. Short profiles abstain;
captures, prior terminal states, unavailable pushes and enemy first promotion
refute. Default-disabled behavior equals frozen E065; shared exhaustion drops
all new events and incomplete trees while preserving parent selection.

Example: “Pawn race: b 7 can queen before f 3 against every legal defense, using
1 pawn move.” No automatic win, best move or long-term queen safety claim.

Complete proof trees retain full legal history/actual move, all four identities,
passed-pawn checks, required pushes/horizon, every defense and route move/FEN,
and every first-promotion leaf. ALL next enemy replies retain complete records,
terminal flags and queen-presence flags, including opposing promotions. First
queening can immediately stalemate; that is retained rather than called a win.
Move/undo uses the full history-bearing board. Independent replay imports no
detector helpers and reconstructs legal sets, rule states, promotion order and
all continuations. Complete negative refutation trees remain in results.json.

EXPOSURE.md records first target 147:146 pass, one selection failure: generic
safe-promotion comment at priority 157 hid new race at 101.005. Before source
freeze, amend new priority to 157.05, below urgent hanging/fork/mate warnings;
no eligibility or proof relaxation. Corrected 147/147 passes. One/two/three-push
routes, both colors/horizontal counterparts, same/adjacent passed files and
history pass. Enemy king capture/blockade/approach, checking pawn moves and
rival first promotions refute simple distance counting. Own king can block an
apparently faster rival. Four rival promotion types after first queening are
retained. Missing/extra material, early/unpassed pawns, captures, actual
promotion/king moves and illegal moves do not qualify. Urgent mating warning
is preserved on a refuted extra-material position. Corrupted defenses, routes,
promotion types, identities, continuation sets and text fail independent replay.

All 147 new tests and 3,469 cumulative E020–E066 tests pass. Maintained source
verification and diff checks pass. After merging verified shared workflow tools,
the new full coach command passes again (92.5s), with eight workflow/source
regressions passing. Study source 6c31e9b and workflow commits 3090427/3dd6ab6
are ancestors of frozen reproduction revision 1c291bd. Existing verification
checkout confirmed clean/inactive, without unique history, then reused in
detached HEAD at that revision; distinct output directories, no new clones.

Main/repeat/initially clean full runs match exact revision, normalized inputs,
physical output hashes and metrics;243–247 seconds versus estimated 260 seconds.
Full run 3,200 cases:3,002 with facts,144 abstentions,54 refused illegal moves;
selected comments at most 21 words. Cumulative independent replay 5,871
certificates,288 queries,19,503 reply/history edges and 44,416 leaves.
New race classification 14,044 bounded nodes; inherited trap checks 8.
No engine search/numerical fitting.

Independent saved JSON replay verifies 44 new certificates on 44 positive rows,
92 legal negative rows and four refused illegal moves. Routes:32 one-push,
eight two-push and four three-push certificates. Retained 872 defense edges,
756 first-promotion leaves,3,440 next enemy replies, four terminal own promotions,
16 rival promotions and eight history plies. No immediate queen capture in
these positives; this does not prove long-term safety. Physical stalemate,
all four rival-promotion types and urgent mate checks pass. All 3,060 inherited
full-result fingerprints match E065 in order; original-list hash unchanged.

Mechanics/reproduction PASS; prospective 5MB storage gate FAILS at 7,001,619
bytes. Full trees and negative refutations retained; no proof deletion or
after-the-fact threshold increase. Future tree studies must budget branching
continuations rather than copying a geometry-study estimate. Frozen E053 compact
display retained. Coverage 291 verified names /337 original occurrences;
76 partial and 672 unimplemented. Only the stated Pawn race scope checked.
Real-game precision, teaching benefit and extension readiness remain unknown.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean](evidence/clean-run.json).
Reproduce: `node research/experiments/E066-pawn-races/code/run.mjs --out research/runs/E066/reproduction`.
Guarded D001 receipts retained. Integrate completed result through existing
shared research branch and fast-forward clean already-checked-out local main;
never push or switch the shared checkout.

Next: investigate Reserve tempo and Waiting move together with separate gates.
Require a legal quiet pawn waiting step and complete all-defense finite
promotion or mating effect compared with an explicit legal hypothetical pass.
Do not label an arbitrary quiet move as useful tempo or infer zugzwang from
geometry. Preregister the causal contract and branching/storage estimates first.
