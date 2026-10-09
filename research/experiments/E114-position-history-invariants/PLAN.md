# E114 position and history invariants

2026-10-09 prospective build-first batch, parent E113 c74f07d. User-authorized
current main; research-only/local commits/no push. Register compatible pending
descriptor/history scopes C0971 asymmetrical position, C0382 uncastled king,
C0806 pawn move irreversibility, C0927 irreversibility, C0213 pawn hole. Shared
legal inventory/history machinery, no engine/search or strategic evaluation.

C0971: actual move changes an exact full-army color/rank reflection into a
nonmatching placement. Reflect square file/rank r->9-r and swap colors, preserving
type; retain before/after full inventories and unmatched units. This defines a
specific structural asymmetry, not strategic inequality. Reuse FRIEND-02 mirror
convention, not its >=3-pawn heuristic as a general whole-board criterion.

C0382: only complete legal history starting from the canonical standard initial
FEN establishes that the mover's king has not castled, including the played move.
Audit all move flags for that color and retain final king square. Missing history
or nonstandard start means unavailable, not inference from king square/rights.
Previously castled king returning centrally cannot be relabeled uncastled.

C0806: actual pawn move advances its identified pawn's relative rank strictly;
captures retain forward movement, promotion ends pawn identity. Under legal
movement rules that same pawn cannot return to its earlier square as a pawn.
C0927: same explicit pawn invariant, captured unit count permanently decreases,
or a legal move loses a nonempty subset of castling rights. Promotion preserves
unit count and cannot restore captured units; castling rights never regenerate.
Retain actual ordinary/EP capture square, counts, lost rights and complete legal
next-reply inventories/counts/rights; all replies must preserve these monotonic
invariants. Do not claim every aspect of position is irreversible or infer intent.

C0213: actual nonpromoting pawn advance abandons a previously attacked central
square (files c..f, relative ranks3..6). Square empty before/after; the moved pawn
no longer attacks it, and EVERY remaining friendly pawn is at/above the target
relative rank. No existing pawn can ever reach the required one-rank-behind attack
rank because pawns never retreat; captures can change files but not this invariant,
and promotion creates no pawns. Report permanent lack of pawn control only;
piece defense, occupation value and whole-position weakness remain unresolved.
Retain all friendly pawn ranks, deterministic full target list and attack ranks.
No adjacent-file-only heuristic or geometric claim of strategic weakness.

Interface positionInvariantTags defaultfalse wraps E113, maxPositionInvariantNodes
integer0..50000 default50000; shared atomic budget/history and reply iteration.
Terminal after position suppresses descriptive facts, preserving parent results.
Strict inputs/history, disabled equality, <=24-word comments and qualityClaim:false.
Commit before evaluation; use cheap authored both-color positives/negatives,
standard/nonstandard/missing/castled history, mirrored/asymmetric boards,
ordinary/EP capture/promotion and lost-rights restoration, behind-rank pawn
counterexamples, occupied holes, illegal/terminal input, strict/exact atomic
budgets, serialization and independent inventory/rank/history/reply/label mutations.
Neutral checker reconstructs all states and reply inventories without candidate
import. Guarded D001 pilot, source closure and retained failures.

Deferred cumulative regression, exhaustive integration/absence/history/budget/
priority audit, changed frozen main/repeat/initially-clean reproductions,
occurrence audit and real-game precision/usefulness. All broad concepts retained,
accepted tracker/extension/numerical research unchanged.
