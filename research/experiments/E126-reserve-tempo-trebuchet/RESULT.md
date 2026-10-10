# E126 — provisional reserve tempo and reciprocal pawn loss

2026-10-10. Preregistration4b325a4, parent E125 4c7598a. Authorized current main,
local research commits/no push. Accepted tracker, production and numerical work
unchanged. C0617/C0654 candidate scopes remain below general tempo strategy and
the full game-outcome definition of trebuchet.

Default-false reserveTempoTags, strict maxReserveTempoNodes integer0..50000
default50000. Disabled exactly E125; no implicit parent flags. Independent
extra exhaustion discards E126 only, retaining all enabled inherited findings.
Live validated history, king-pawn only <=6 units/no rights. A unique same-file
adjacent blocked pawn pair must be geometrically contacted by BOTH kings.

Shared loss query enumerates complete legal move inventories and declared ALL
or KING choices. After each move, every legal opposing KING capture of the
original paired pawn is recorded. A row needs a positive E022 one-response
certificate AND positive nominal gain relative to BEFORE the chosen move,
including its material offset. Every move must pass, otherwise retain the first
failed prefix. Terminal branches and empty options never prove loss.

C0617: quiet reserve pawn step distinct from the pair leaves kings/pair unchanged.
EVERY opponent legal reply loses its paired pawn to certified king capture;
EVERY prior actor king alternative loses the actor's paired pawn instead. Extra
enemy pawn replies are included, not omitted as irrelevant. This establishes a
finite material benefit of spending the reserve move, not an optimal or game-
winning tempo generally. Checking pawn moves are not silently excluded.

C0654: after a quiet king entry, exactly four units, king plus blocked pawn each.
ALL legal moves lose the paired pawn in actual full-history turn AND the legal
fresh opposite-turn frame (same clocks, EP cleared). This proves reciprocal
finite material loss in the trebuchet king-guard pattern. Harvard's glossary
defines full trebuchet by reciprocal game outcomes; those outcomes and resulting
king-pawn conversion are NOT established here. See registered conceptual source.

Authored Ke6 Pd5 Pa2 versus Kc5 Pd6: a3 preserves the guards and proves reserve
tempo. From Kf6 instead, Ke6 creates the four-unit reciprocal pattern. Both colors
and known four-ply history pass. Crucial negatives: a4 permits ...Kb4, Kxd6 Kxa4,
cancelling the gain; with Pb2, b4+ permits ...Kxb4, Kxd6, whose local +1 capture
has root offset -1 and net0. An extra enemy Ph7 permits a waiting pawn reply,
breaking the all-move policy. Missing guards/unblocked pair, extra pieces/pawns,
king moves with extra army, history mismatch, illegal moves and fifty-move
terminal safeguards retained. Extra budget exhaustion preserves enabled E125
conversion proof/events.

Initial45 focused checks had six failures: both double-push expectations wrongly
predicted a positive; unblocked-pawn fixtures accidentally checked the actor king;
known-history move was attacked by the advanced pawn and its reflected history
also mismatched fullmove clocks. Retained the double-push refutation, repaired
the authored unblocked setup, and used an even four-ply legal history cycle.
Added explicit recapture/root-offset and enabled-parent exhaustion checks. No
registered rule was weakened. Final51 focused checks pass in3.1seconds; three
representative E125 disabled/strict/history checks pass in2.8seconds. Source and
diff verification pass. No long cumulative or historical collection run.

Guarded D001-test authored synthetic pilot:32cases,6positives,6expected extra
exhaustions. Independent saved replay passes14witnesses, all135 normalized
source/input hashes. Checker imports neither candidate nor loss solver nor E022
certifier. It reconstructs complete inventories, target captures, all immediate
responses/draws, offsets, negative prefixes, exact opposite frame and labels.
No acquired games, external study fixture, engine, labels, fresh holdout or
frozen pristine reproduction used. Source definition exposure is disclosed.

Evidence copied from research/runs/E126/final to evidence/results.json.gz and
evidence/run.json. Source revision, actual normalized source hashes, environment,
argv, null engine/seed and guarded receipt retained. Plain153309bytes, gzip20530.
Packed SHA256 bce2948d04da2b0d52a72df25727a97f9b2bf29b40657f4d93a639d54f9831ef;
plain85d60dfb9d72fefab6ab5efeaee6019c7e105637b9cf1f9608da94fc24891257.
Replay: node research/experiments/E126-reserve-tempo-trebuchet/code/replay-saved.mjs

Accepted E082 unchanged378/1085(34.8%). Build299provisional original entries,
47ready/0stale batches;677accepted-or-candidate(62.4%),408without ready code.
Deferred combined full regression, complete semantic/absence/priority/history/
budget/interaction/occurrence audit, exact main/repeat/clean and real-game
precision/usefulness. Exhaustive repetition/terminal and reserve-pawn geometry
matrices remain combined gaps. No overall game-result or advice promotion.

Next unused E127: inspect corresponding-square response systems, finite rook
bridge/interposition proof families and knight tempo invariants. Record absent
outcome/tablebase prerequisites rather than give named endgames shape-only
labels. Continue compatible focused batches/small guarded pilots; no long tests.
