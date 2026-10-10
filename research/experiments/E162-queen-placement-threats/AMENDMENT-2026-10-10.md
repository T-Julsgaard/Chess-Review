# Prospective fixture repair

Initial smoke: Qd4 checked Kh8 along d4-e5-f6-g7-h8, correctly failing quiet
admission. Qd1-e5 was not a queen move and parent rejected it. Three original
inputs/results/error and original fixture source retained in
evidence/initial-illegal-fixtures.json.gz; no successful hypothesis inferred.
Before further evaluation move exposure black king h8 to g8; control queen d1
to e1 and black king h8 to h7. Control Qe5/Qd2 and Qe6 alternative then have
legal queen geometry and avoid initial checking diagonal. Same planned attack/
entry objectives and unchanged proof gates. This repairs authored inputs only.

First repaired smoke: both positives and three control negatives pass independent
checking. Negative Qd1-b4 was still illegal. All six results/error plus original
fixture source retained in first-repaired-smoke.json.gz. Repair only that negative
root queen to b2, actual Qd4, alternative Qb4; both placements can then meet Nc6.
The positive and control roots remain unchanged. No gate changes.

Focused clock-boundary failure retained in clock-admission-failure.json.gz with
original wrapper/context/test sources. Parent allows a live halfmove99 root's
quiet move to reach halfmove100, then context originally threw instead of refusing
the new finding. Wrapper now explicitly withholds at the post-move fifty threshold
before panel collection, charging wrapper work. Halfmove100 root itself is rejected
by inherited parent behavior; focused expectation corrected to preserve that
rejection. Test failure was an expectation issue for that already terminal root.
Raw collector/context unchanged, so exact prior nonclaim panels remain reusable.

Added representative exposure refutation prospectively within declared negative
scope: own Rf1 supplies Rf8+/Rg1+ while the knight still contacts Qd4. Those checks
remove the knight's legal queen capture and must refute the alleged all-response
pressure policy. Pilot extended from16 to18 cases, still within registered <=20.

Independent saved replay passed all chess witnesses and source/receipt/hash checks
then failed its command-path assertion: process.argv records an absolute Windows
path, rather than the assumed relative POSIX path. Original run, replayer source,
receipt and error retained in replay-path-failure.json.gz. Repair only normalizes
backslashes and checks the exact pilot suffix. Refresh source-bound metadata/pilot
using the existing14 raw comparisons; no chess recollection or gate relaxation.

The first supported-square negative also failed immediate capture policy, so it
did not isolate future pawn support. Exploratory pair (development exposure):
White Kh1 Qd1 Pa2 versus Black Kh7 Nd7 Ph6; Qd4/Qd2, Nc5/Ne5. Both actual captures
work and weakness passes. Adding Black Pa7 preserves both actual capture policies
but its possible a7-b6 route supports c5, so weakness alone fails. Register both
as supplemental white pilot cases before final pilot, total20 within original
cap. Both-color core graph checking already present. Generalize no gates. Retain
their full trees in final observations; independent replay checks both cases.
