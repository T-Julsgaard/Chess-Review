# Brilliant moves and calibration

Brilliant is an explanation of a strong voluntary piece sacrifice. It is a move
annotation, separate from the evaluation-based accuracy and rating models. Fixing
this annotation does not require retraining the numerical models.

## Published meaning

[Chess.com's classification documentation](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc)
describes a best or nearly best piece sacrifice, a satisfactory resulting position,
and a position that would not remain completely winning without finding the move.
It also describes greater generosity for newer players, without publishing exact
thresholds. Its [instructional examples](https://www.chess.com/article/view/how-to-play-a-brilliant-move)
include declined sacrifices and distinguish endgame necessity from middlegame
positions with several good choices. These sources guide the meaning; they do not
provide an algorithm to reproduce exactly.

[Zaidi and Guerzhoy's human-annotation research](https://arxiv.org/abs/2406.11895)
also distinguishes perceived brilliance from simply choosing the engine's best
move. Their approach uses human labels, engine strength and game-tree structure.
A material heuristic cannot establish human difficulty or aesthetic merit.

## Implemented policy

`analysis.js` separates board evidence from engine evidence:

1. **Voluntary material offer.** An opponent has a legal capture of a knight,
   bishop, rook or queen. Bounded legal exchange analysis follows captures on
   that square, with branch-specific recaptures, pins, king safety, x-rays and
   promotion gains. Either side can stop the exchange when a legal move outside
   that capture sequence exists. The played move's captured material and promotion
   gain are credited before requiring a strictly positive material cost. Thus an
   equal trade does not qualify, but a rook for a minor and pawn can qualify with
   one pawn net loss. This is an explicit design choice, not a fitted size threshold.
2. **An offer attributable to the move.** Moving the offered piece, creating a
   legal offer or increasing its net exchange cost supplies this evidence. For an
   unmoved piece, compare legal exchanges before and after: releasing a pin or
   withdrawing a defender can create an offer without moving that piece. A quiet
   move must not inherit Brilliant merely because unrelated material was already
   hanging. Game history also allows a tempo sacrifice that ignores a newly
   introduced opponent threat. A checking offer can qualify when accepting it is
   a legal check evasion. Repeated checking rook offers remain eligible, including
   defensive sacrifices that draw by stalemate if accepted.
3. **A real choice.** A safe piece can be left in place by another legal move,
   or has a legal move that avoids its local material loss.
   For an attacked piece, a legal alternative must avoid its local material loss,
   by moving it, defending it, removing the attacker or exchanging it fairly.
   A forced sole legal move remains Best. Pure pawn offers do not qualify.
4. **Quality and soundness.** The move must be in the current Excellent
   expected-points-loss bucket, with existing evaluations available. Its resulting
   mover-relative score must be at least -0.5 pawn, or a winning mate. A delayed
   known mate does not qualify. A preceding opponent error is not required.
5. **Competitive relevance.** Below +5 pawns, without a pre-existing mate score,
   the position passes this gate. Escaping a negative mate score is also eligible.
   At +5 or more, or with a pre-existing winning mate,
   the highest-ranked scored root alternative must fall below +5 and must not
   retain a winning mate. With MultiPV=1, alternative evidence is missing and the
   detector keeps the ordinary category. A high root score alone is not proof that
   the sacrifice was unnecessary: it may be the only winning move.

Root alternatives must have exact scores at the same reported depth as the top
line, with the expected MultiPV rank and a top PV matching the final best move.
Missing metadata, incomplete iterations and upper/lower bounds do not certify the
already-winning exception. Explicitly bounded before/after lines also withhold
Brilliant. The UCI client retains this metadata without changing scalar scores.

The -0.5/+5 policy thresholds are conservative, independently chosen annotation
rules. They are not estimates of a published service's hidden thresholds. Root
MultiPV scores use the mover's perspective; stored position evaluations use White's
perspective. Tests cover Black's sign convention explicitly.

The opponent does not need to accept the offer in the played continuation. Engine
evaluation of the resulting position, rather than a later opponent mistake or the
game outcome, supplies the soundness evidence. Board/history evidence is cached per ply;
evaluation-dependent eligibility is recomputed as analysis results arrive.

## Limits and cost

The exchange calculation is restricted to captures on one square, with a shared
128-position cap per candidate move. Completed local exchange results are reused
within that budget; incomplete or exhausted results are never cached. Position
keys retain board, turn, castling and en-passant state; move counters do not affect
this local material calculation. Exhaustion withholds the label. It does not
solve intermediate checks elsewhere, delayed sacrifices or compensation by a
later combination. Newly promoted pieces and ambiguous rook relocation are not
automatically treated as offers of existing material. Promotions may still offer
a different existing piece after crediting the promotion gain.

Quiet sacrifices that renew a persistent offer without increasing its local cost
or creating check can be missed. Without preceding history, ignoring a fresh
opponent threat cannot be distinguished from inheriting a persistent offer and
is withheld. The hypothetical opponent turn used for the before-move comparison
clears en-passant rights; it is local board evidence, not a searched counterfactual
continuation.

Existing shallow or unstable evaluations can misjudge soundness. Multiple scored
root alternatives help with already-winning positions, but do not measure human
difficulty or prove that a move is unique. With one line, some genuine only-winning
sacrifices will receive Best/Excellent instead. No additional engine searches are
scheduled automatically by this rule.

## Integration boundary

The current numerical models use public outcomes, observed choices and engine
evidence, as described in [PUBLIC_METHOD.md](PUBLIC_METHOD.md). Brilliant labels
and category counts are excluded from accuracy and rating fitting. Recorded
ratings supply context only in the explicitly named recorded-rating model and
serve as training targets for the separate moves-only rating models.

Annotation changes do not change displayed numerical accuracy or estimated
rating. The current scorer has no category-average accuracy fallback. Regression
tests verify that annotation inputs remain separate from numerical scoring.

Adding a Brilliant bonus to numerical accuracy, adding sacrifice-count predictors,
or fitting rating-dependent annotation weights would change this boundary and
require a new prespecified experiment. Those changes are outside this fix.

## Verification and future assessment

Dedicated legal-board fixtures cover sound offers without a prior error, losing
offers, exchanges, equal trades, x-rays, pins, unavoidable losses, forced moves,
declined and repeated offers, actual stalemate after acceptance, persistent hanging
material, new threats, defender/pin release, promotions, mate maintenance/delays, missing alternatives,
Black's perspective, progressive evaluation updates and numerical-score isolation.
Classifier scores in these fixtures are synthetic inputs; they are not independent
engine confirmation that each offer is sound.

