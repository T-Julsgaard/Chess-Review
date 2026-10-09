# E119 — recorded joint piece arrivals

2026-10-09 preregistration, approved build-first workflow. Parent E118; reuse
its actual/fresh/restored/removed arrival proof unchanged rather than repeat it.
Original C0414 piece storm and C0422 local superiority; broad strategy open.

Default-false pieceStormTags, maxPieceStormNodes safe integer0..50000 default
50000. Enabled requires validated history ending in exactly the relevant two
plies: a quiet own nonpawn/nonking arrival, then quiet enemy nonking move,
followed by actual quiet distinct own piece arrival. History may be longer.
Enemy king remains at the same square throughout those moves. Earlier mover
starts outside and ends within distance2 of that king; it remains stationary
as one E118 partner. No captures/promotions in the three-ply sequence. Previous
origin must be empty after actual move. Full E118 entry proof must be proven:
actual/fresh mate succeeds, legal current-restored/current-removed both fail.
Reuse those exact saved proofs; default H2 or supplied attackEntryPlies0..4.

Additionally construct legal fresh postframe restoring only earlier arrival
to its recorded origin, same clocks/turn and cleared EP, and a legal frame
removing only that earlier piece. Both complete E029 actor mate queries must
fail at SAME H. C0414 then names two recorded distinct arrivals with each
independently necessary, not an inferred plan or a mere count of moved pieces.
C0422 additionally counts own/enemy nonpawn/nonking units in fixed distance2
neighborhood before first arrival and after actual: own count increases by >=2,
was <= enemy count, now > enemy count. This numerical local concentration has
joint causal mate evidence; no general force valuation, control or advantage.

Disabled exactly E118, including irrelevant invalid controls. If attackEntryTags
is explicitly false while storm enabled, reject conflict; otherwise internally
enable E118. E118 and E119 retain separate bounded budgets; exhaustion of E119
preserves parent findings, removes only new witness/events. Missing/short history
means history-unavailable; unsuccessful parent proof means no-joint-entry.

Focused both-color positive/negative/history controls, moved king, pawn/capture
history, distant/unchanged partner, numerical ties/greater enemy forces, exact
disabled/strict controls, atomic exhaustion, independent checker mutations.
Independent checker reuses neutral E118 checker and E029 replay, never candidate
or solver, reconstructs full sequence and frame legality/counts/text. Small
guarded synthetic pilot, source/diff checks. Record all failed hypotheses.

D001 test preflight passed. No acquired games, labels, engine or production.
Preregister before decisive evaluation. Defer cumulative regression, exhaustive
interaction/absence/priority/history/budget/original-occurrence audit, pristine
frozen main/repeat/clean reproductions and real-game precision/usefulness.
