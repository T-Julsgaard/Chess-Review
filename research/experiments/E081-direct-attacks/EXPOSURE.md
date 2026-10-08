# E081 retained development exposure

2026-10-08. All positions locally authored, exposed synthetic mechanics only.
Initial 12 focused checks passed in1.9s: both-color knight attacks on pawn/piece,
defended pawn, disabled/strict/atomic boundary and four forged teaching witnesses.

Expanded collection initially failed two assertions in3.4s. Authored queen
candidate placed White Qb1 and Black Kh7: queen already checks the non-moving
king along b1-c2-d3-e4-f5-g6-h7, so the root is invalid. Black reflection fails
identically. Exact original roots/UCI remain as queen-orthogonal-original-checked-enemy
with explicit legality refusal. Add a separate corrected queen root with Kh6;
never relax legality or check refusal. Other42 checks passed. New detector and
registered gates unchanged. All failed roots retained rather than removed.

Next: rerun expanded focused collection, then remaining registered fixtures,
full independent tamper gates, saved core pilot and cumulative final gates.

Expanded capture/promotion/EP/castling/multiple-target/history/terminal/refusal/
higher-warning gates pass132 checks in7.3s. Full forged witness/rehashed-storage
and candidate tracker/preview gates pass135 in8.4s;130-case saved pilot4.846s.
Long ray/vertical, bishop/queen blockers, pawn noncapture and king defended-target
gates bring149 focused checks in9.2s,144-case saved pilot6.040s. All50 witnesses,
36 expected errors and280 exact input hashes independently replay from saved
JSON. No new scientific failure; original invalid queen roots retained.
Runner construction initially stopped on a title-string assertion before any
runner file or evidence was written. Corrected exact existing title mapping;
source syntax/maintained-source/diff pass. No detector, search or gate change.
