# E062: pawn space and causal denial of enemy king destinations

2026-10-07. Frozen E061, isolated checkout. Research only, original list
unchanged. Numerical work paused; cutoff/shutdown cancelled. No extension/push.
Authored synthetic fixtures, rule metadata only, no acquired example boards.

Question: can Space name actual new pawn control in the enemy half that removes
an enemy king destination? No general space-advantage or best-move claim.
Opt-in pawnSpaceTags defaults false and returns exact E061. Shared
maxPawnSpaceNodes integer0..50000 default50000; exhaustion drops ALL new labels
preserving parent facts. Strict canonical history and live actual move/result.

Actual nonpromoting pawn move, advance or capture. Enumerate its before/after
attack squares geometrically, retaining only new after squares in the opponent
half (White5..8 /Black1..4). Enemy king identity unchanged. A named denied square
must be a complete legal enemy king destination BEFORE the move in an explicitly
hypothetical enemy-to-move position, absent from complete ACTUAL after king
moves, and a legal king destination in an explicitly causal after-position
with only the actual moved pawn removed. Both counterfactuals must be independently
legal and live. Clear EP when changing turn/removing pawn; do not pretend these
are actual history. Invalid/terminal counterfactuals abstain, never relax guards.

Retain exact actual/history/played records, pawn/king identities, before/after
attack sets, both counterfactual FENs, full ordered legal king move sets from
before/actual/removed-pawn positions, complete denied subset and ALL actual
enemy legal reply records including captures of the pawn and terminal flags.
Independent replay imports no detector helpers and reconstructs every set,
counterfactual, reply and text. Comment names only current denied squares,
<=24 words, qualityClaimfalse, priority101.1 below urgent tactics/recent tags.
Do not infer permanent restriction, safe occupation by another piece or value
of occupying controlled squares. Pinned pawn attacks and legal king safety
are distinguished from legal pawn captures.

Authored central/edge, double/one-step/capture, one/two denied destinations,
old pawn control, other piece already controls square, capture destination,
enemy king remote, territory threshold, pawn loss in a legal reply, king check,
pins and illegal/terminal counterfactual removal, full history/EP, promotion,
actual terminal move, illegal move, default/zero/midway exhaustion and tampered
move/FEN/set/reply/identity/text. Horizontal/color variants. Selected examples
and urgent-warning preservation checked. D001 guarded loader before fixtures.
Target smoke then E020–E062/source/diff; source commit before main/repeat/
initially clean clone, ~200s/run overlap3. Exact source/input/physical output/
metrics, ordered E061 fingerprints, original list unchanged, saved JSON replay.
Prospective retained storage <=5MB, based on E061's complete4.11MB/152cases,
including report/replay/manifests AND board/card HTML. Preserve/report any miss.
Use frozen E053 compact display; a new UI is not needed to validate the claim.
Synthetic mechanics cannot establish real-game precision or teaching benefit.
