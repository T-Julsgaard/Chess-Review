# E056: new pawn blockade geometry and legal replies

2026-10-07. Frozen E055; research only, numerical research paused, cutoff and
shutdown cancelled, no extension or push. Original list unchanged. Authored
synthetic seeds/new positions only; definition/rule metadata, no external
board/game/FEN/sequence acquisition. Commit protocol before evaluation.

blockadeTags boolean defaultfalse exact E055 parent. maxBlockadeNodes integer
0..50000 default50000; shared budget exhaustion removes ALL new labels and
retains parent facts. Live before/after positions, strict full history/counters,
no continuing terminal boards. Actual moved own nonpawn unit (NBRQK) lands on
the square immediately ahead of an unchanged enemy pawn on that pawn's file.
Own pawn rams excluded. Existing stationary blocker and mere square control
excluded; no passed-pawn assumption and no removal of kings/counterfactual
illegal boards. Capturing a different unit on the blockade square is allowed.

One pawn-blockade event names its actual piece, square, pawn and immediate
forward restraint. No permanence, best-move, quality or strategic-win claim.
<=24 words, qualityClaimfalse; priority74 below check/evasions, promotion,
urgent threats and stronger existing patterns. Named King/Knight blockade,
Blockade square and Blockade checked only for this exact occupied-square scope.

Full canonical before/after and actual move record, blocker/pawn identities,
ALL legal enemy replies with exact moves/FENs, pawn-capture/blocker-capture
subsets. Verify no legal straight pawn advance and preserve legal pawn captures
or blocker removals without claiming other moves are restrained. Replayer
imports no detector helpers: strict legal history, exact actual transition,
geometry, ALL legal reply rows and subsets, text. Budget tick history/board/
reply scans; exhausted profile returns no new facts.

Authored knight/king/rook/bishop/queen cases, edges, starting double-push pawn,
one-step promotion restraint, capture-created blockade, all pawn diagonal
captures/EP if legal, hanging blocker with warning priority, pinned enemy pawn,
new blockade after full capture history, nonpassed pawn and ordinary passer,
stationary blocker/unrelated move, own pawn ram, wrong direction/file/distance,
only attacked forward square, terminal draw/stalemate/mate, unsafe king landing,
default/zero/midway exhaustion, altered identities/omitted reply/FEN/text.
Also exercise inherited E055 direct-recapture guard when the actual recapture
IS itself a positive mating offer, retaining parent behavior as a regression.
Horizontal/color variants where orthodox legality permits; invalid moves are
explicit negative fixtures.

D001 test preflight and guarded loader before fixture imports. Cheap smoke/
target, cumulative E020–E056 and maintained source/diff. Source committed before
main/repeat/initially clean local clone, exact source/normalized inputs/output
hashes/metrics; saved JSON replay, ordered inherited E055 fingerprints and
original-list hash unchanged. Compact E053 demo with full retained certificates
under3MB. Full run estimate ~185 seconds, overlap three. Synthetic development
mechanics only; real-game precision and learning benefit unmeasured.
