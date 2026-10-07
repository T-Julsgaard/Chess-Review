# E063: history-confirmed pawn storms toward a castled king

2026-10-07. Frozen E062, isolated checkout. Numerical work paused, cutoff and
shutdown cancelled. Original list unchanged; research only, no extension/push.
Authored synthetic histories; rule/definition metadata only, no copied examples.

Question: can Pawn storm name a coordinated sequence without guessing intent
or success? Opt-in pawnStormTags defaults false, exact E062. Shared
maxPawnStormNodes integer0..50000 default50000; exhaustion drops ALL new labels
preserving frozen parent facts. Strict canonical history/live actual result.

Enemy king's last historical king move must be a LEGAL standard castle,
e8/e1 to g8/g1 or c8/c1, and current king remains there. Immediately preceding
own move must be a nonpromoting pawn advance AFTER that castle, followed by
one enemy reply and actual nonpromoting pawn advance by a DISTINCT pawn.
Both advances increase relative rank and decrease distance in ranks to that
castled king. Each before/after pawn square stays on its castle flank:
kingside f/g/h or queenside a/b/c. After actual move both identified pawns
must remain own pawns, adjacent files, at most one rank apart, relative rank
at least4 and still in front of the enemy king. Straight/double/capture advances
allowed. No inferred attacking intent, safety, advantage, best move or mate.

Retain full legal history records, actual played move, king castle record and
index, prior pawn advance record/index, exact pawn identities/connection and
rank distances at each step. ALL actual legal enemy replies retain complete
records, terminal flags and both pawn-presence flags. Independent replay uses
no detector helpers and reconstructs all identities, chronology, history,
geometry, distances, every reply and exact text. <=24 words, qualityClaimfalse,
priority101.05 below urgent tactics/recent pawn tags. Selected comments and
urgent-warning preservation tested. Current sequence can lose a pawn next turn.

Authored both castle sides/colors with explicit standard queenside counterparts,
not geometric king-file mirrors. One/double/capture steps, adjacent staggered
pawns, same pawn repeated, too-early/wrong-flank/separated/rank-separated pawns,
first advance before castle, missing history, moved king, captured prior pawn,
nonpawn preceding move, actual promotion/terminal, terminal reply, illegal moves,
history counters/rights/EP, default/zero/midway exhaustion, corrupted records/
sets/text. Data guard before fixtures. Target then E020–E063/source/diff.
Source commit before main/repeat/initially clean clone; exact source/input/
physical output/metrics, ordered E062 fingerprints, original list unchanged,
independent saved JSON replay. ~210s/run overlap3; prospective full evidence
<=5MB based on E062 complete3.58MB/108cases including report/replay/manifests
and HTML. Preserve/report any storage miss. Frozen E053 compact display.
Mechanics do not establish real-game precision, teaching benefit or readiness.
