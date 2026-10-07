# E065: history-confirmed king triangulation and a changed turn

2026-10-07. Preregister before code/evaluation. Research only; cutoff cancelled.
Original Triangulation C0613/C0651/C0765. Reuse frozen E064 and all 2,940 ordered
baseline results; D001 gate before locally authored fixtures. No extension,
numerical research, acquired games or pushes. Preserve all prior evidence.

Opt-in triangulationTags; maxTriangulationNodes integer 0..50000 shared budget.
Default exact E064; exhaustion removes all new events. Require full strict legal
history and actual noncapturing noncastling king move. Last four history plies
plus actual must alternate three moves of the SAME own king with two reversible
moves of the SAME enemy nonpawn unit. Own king visits three distinct squares
forming a noncollinear triangle and returns to its initial square. Enemy unit
returns to its initial square. No capture, promotion or castle in these five
moves. Full piece placement, castling rights and EP field restored, with the
opponent now to move instead of the original mover. Both segment start and
actual after live. Clock/fullmove/repetition history are explicitly retained:
restored placement does NOT mean identical rule state or guaranteed advantage.

Retain entire legal history/actual record, last-five move records/index, king
route, enemy identity/route, segment-start and after FEN, complete piece lists,
equal placement/rights/EP and changed turn, before/after counters, and ALL actual
enemy replies including captures and terminal flags. Independent replay imports
no detector helpers and reconstructs every legal record, chronology, identity,
placement/rule comparison and reply. Comment <=24 words, qualityClaim false,
priority101.015 below urgent/recent pawn labels, above generic ending/transition.
Example scope: king returned via two squares, restoring placement and passing
the move. No forced enemy route, best move, opposition gain, zugzwang, winning
tempo or improved evaluation inferred. Useful label describes actual maneuver.

Authored king/rook/knight/bishop/queen enemy return routes, both colors and
horizontal counterparts except castling-right loss (explicit standard rights
counterparts). Central/edge triangles and check evasions; incomplete/repeated
king route, moved enemy unit, nonking own move, captures, missing/short/old
history, rights/EP changed, promotion, actual terminal clock/repetition, terminal
enemy reply and pawn captures. Strict history counters, default/zero/midway
exhaustion and corruption of history/routes/identity/frame/replies/text.
Selected label and urgent mate selection with a valid completed maneuver.
Target then cumulative E020–E065, maintained source verification/diff. Log all
development inspection/corrections in EXPOSURE before immutable source freeze.

Source commit before main/repeat/initially clean clone; fixed HEAD until all
three terminal. Exact source/input/physical output/metrics; ordered E064 full
fingerprints and original-list hash; independent replay of saved JSON. Estimate
~200s/run overlapping3, complete evidence <=5MB including all proofs/manifests
and frozen E053 compact display based on E0644.24MB. Retain/report any cost miss.
Synthetic exposed development mechanics do not establish real-game precision,
human teaching benefit or extension readiness; only this finite scope checked.
