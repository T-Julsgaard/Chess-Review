# E064 development exposure

2026-10-07. PLAN/SOURCES committed659310e before code/evaluation. D001 public
data preflight passes; fixtures locally authored behind guarded test loader.
First target130/130 passes, including four/six/eight-file walls, straight and
double closure, kings/rooks capturing wall pawns, knight/bishop offered pieces,
legal EP replies and actual captures, actual/reply mates and illegal hypothetical
own-turn counterfactual. These exposed synthetic positions are not confirmation.

Before source freeze add standard castle replies and a vulnerable OTHER own
piece to check urgent-warning selection with an intact pawn wall. Expanded
target initially fails: kingside fixture puts own king on h1 in the h8 rook's
open file, already in check, so e3e4 is illegal (also mirrored/colors). Author
the own king on a1 for kingside, h1 for queenside. This is a fixture correction;
no detector, mobility condition or priority change.

Full target, cumulative, source checks and source freeze/reproductions pending.

Expanded target143:142 pass, one selection assertion fails after fixture fix.
The g2 knight's capture by h2 rook was already legal BEFORE the actual move;
frozen parent deliberately excludes pre-existing captures from newly hanging
piece warnings. Do not change parent policy or boost an unsupported warning.
Retain this legal capture as an explicit scope limitation: pawn immobility
does not imply other-piece safety. Add a parent-certified trapped knight on
h5 with own Qf1/Rh1 to test a higher-priority tactic alongside a valid wall;
check enemy mating warning on the refuted wall separately. A probe with just
Qf1 and Nh5 did not certify a fork; no such label added. No detector/priority
changes made in response to these exposed fixtures.

Final target149/149 and cumulative E020–E0643,196/3,196 pass. Maintained source verification and git diff --check pass. No detector or priority changes. Standard castle reply records and a live checking reply retain full empty pawn sets; stronger certified trap selection and mating warning on refuted walls pass. Freeze this exposure/source before main, repeat and initially clean full reproductions.
