# E112 spare pawn tempi, passing moves and maintained pawn tension

2026-10-09 prospective build-first batch, parent E111 e0b0106. User authorizes
using the current checkout because the recorded isolated checkout is absent.
Research only; local commits, no push. Long cumulative acceptance remains deferred.

Reuse E106 complete mate-OR-surviving-queen conversionQuery/checkConversion,
E024 actual history, E020 legality and unchanged E111 parent. Do not change
accepted evidence. Restrict to live pawn endings, 4..6 units, no castling rights,
at least two actor pawns. Actual quiet nonpromoting pawn or king move, no check
before or after. Enumerate every eligible objective pawn separately; preserve
tracked identity. One shared atomic budget, deterministic pawn and UCI order.

C0650 spare pawn move and C0764 passing move: actual straight quiet pawn move
distinct from objective pawn; actual full conversion wins at H. A fresh legal
before-placement with enemy to move and EP cleared must also win at H. Remove
only moved pawn from actual and hypothetical-pass frames; both legal fresh
frames must win at H with their own equal pre-move stripped material baseline.
This demonstrates a used pawn turn resource outside the required conversion
material, not opposition, intent, optimal timing or a future reserve inventory.
Require a recorded legal king alternative failing the same goal at H, evaluated
from full actual history and common original material baseline. Artificial
pass/removal frames are explicit comparisons, never asserted legal null moves.

C0183 maintaining tension: a legal ordinary pawn capture was available before;
the actual quiet move leaves at least one identical capturing pawn and enemy
pawn pair in place. Actual conversion wins at H, while EVERY available root
pawn-capture alternative fails that same objective and bound. Preserve complete
capture inventory, including EP in comparisons (EP alone cannot prove preserved
pair). Alternative goal pawn captured/removed records failure only after checking
full mate goal via existing solver: objective identity must remain present at root
in actor alternatives, including promotion. No general exchange desirability.

Interface pawnTempoTags default false; pawnTempoPlies integer0..6 default4;
maxPawnTempoNodes integer0..50000 default50000. Exhaustion discards all new
events/witnesses; disabled equality, strict input/history, <=24-word factual
comments, qualityClaim:false. Try full sorted objective list, retaining failed
trials; emit only individually demonstrated claims, no placeholder coverage.

Before evaluation commit this plan. Focused both-color positives/negatives:
unused vs essential spare pawn, failing pass/removal/king comparison, actual
conversion failure, retained/exchanged pawn pairs, successful capture alternative,
promotion/check/extra-piece/rights, history/clock/terminal/budget and JSON proof
mutations. Small authored synthetic pilot under D001 preflight and guarded loader;
retain failures and source closure. Independent checker reconstructs histories,
legal alternative inventories, identities, fresh frames and exact labels using
neutral checkConversion without detector/search import.

Deferred: cumulative regression, comprehensive semantic/absence/interaction/
priority/history/budget matrix, frozen main/repeat/initially-clean reproductions,
original-occurrence audit, broader strategy and real-game precision/usefulness.
No full historical runner or inherited evidence regeneration during build stage.
Reuse E067 accepted waiting/mating scope, but new claims must establish pawn-ending
conversion rather than relabel that old event. All 1,085 original ideas retained.
