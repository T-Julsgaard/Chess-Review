# E037: bounded multi-move promotion routes

Date: 2026-10-07. Planned, not implemented or verified. Research only.

Question: extend E036's short, sound promotion explanations beyond an immediate
seventh-rank threat. Identify clear passed-pawn routes whose legal forward
pushes force a promotion despite every defender response. Keep original-list
coverage separate from an implementation label: promotion-race and rule-of-
the-square names require their own verified definitions and explicit evidence.
Do not mark them covered merely because a pawn can promote in one variation.

Prototype design: history-preserving legal search with attacker choices
restricted to pushes of one tracked pawn and defender universal legal replies.
At promotion require either actual mate or a surviving promoted queen and
positive nominal gain through all immediate counterresponses, as in E036.
Reject capture of the pawn, blocked routes, stalemate, draw, counter-mate and
search exhaustion. Track capture/promotion identity, never cache solely by FEN.
Start with advanced pawns; allow a legal first double push only from its real
starting rank. Shared 50,000-node ceiling and explicit search depth must be
retained. Short text names the proven route and its horizon, never a won game.

Before implementation, verify movement/tempo definitions through primary
sources, then author synthetic positive/refutation cases. In king-and-pawn
versus king positions, test king-entry timing, promotion-square capture,
rook-pawn corner cases, own-king interference/protection and both turns/colors.
Any rule-of-the-square formula is only an additional geometric gate; independently
replayed all-response route certificates decide emitted claims. A promotion race
must compare both sides' legal routes and checking promotions; nominal move
counts alone cannot establish who wins. Exclude race labels until this works.

Guard D001 eligibility before fixture loading. No registered games analyzed.
Reuse E020–E036 code via imports, never modify frozen evidence. Independent
certificate verifier must enumerate exact all-response sets and every terminal
leaf and reject tampering. Test refutations, zero/partial budgets and supplied
history. Run cumulative tests and source verification, commit source before
retained main/repeat/initially clean local clone, match input/output hashes.
Record exact revision, receipt, config/environment and evidence under 3 MB.

This protocol is a resume point, not proof of coverage. Continue actual
five-hour usage monitoring. At around 10% remaining preserve completed work,
disable heartbeat and perform the user's authorized normal PC shutdown.
