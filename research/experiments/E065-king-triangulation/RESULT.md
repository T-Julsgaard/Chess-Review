# E065: history-confirmed king triangulation and a changed turn

2026-10-07. Research only; numerical work paused, usage cutoff/shutdown cancelled.
Original list unchanged. No extension integration, acquired games or pushes.

Opt-in triangulationTags identifies a recorded legal three-move king triangle
against two reversible moves of the same enemy nonpawn unit. The king visits
three distinct noncollinear squares and returns; the enemy unit also returns.
Full piece placement, castling rights and EP field must be restored, with the
opponent now to move. No capture, promotion or castle in the five-ply segment;
actual after must be live. Clocks and repetition history remain different.
This verifies an actual tempo maneuver, not forcing, opposition gain, zugzwang,
a win or successful use of the tempo. Default-disabled behavior equals frozen
E064; shared exhaustion removes all new events and preserves parent selection.

Example: “Triangulation: your king returned via b1 and b2, restoring piece
placement and passing the move; clocks and history changed.”

Full evidence retains the entire strict legal history, actual move, last-five
records/index, king and enemy routes/identities, nonzero triangle area, complete
before/after piece lists, restored placement/rights/EP, changed turn and counters,
and every enemy reply including captures/terminal flags. Independent replay
imports no detector helpers and reconstructs all history, identities, geometry,
rule fields and complete legal replies. Replies are probed with move/undo on
the FULL history-bearing board. A fresh board made only from FEN would miss
the authored third-repetition reply; that difference is explicitly tested.

EXPOSURE.md retains illegal authored bishop/queen/promotion routes and a knight
checking the nonmoving root king, corrected before source freeze. No predicate
or priority relaxation. Legal king/rook/knight/bishop/queen enemy return routes,
central/edge triangles and both colors/horizontal counterparts pass. Standard
castling-right-loss negatives are explicitly authored, since horizontal
reflection clears rights and would change the condition. Missing/short/older
history, incomplete/back-and-forth king routes, changed enemy placement,
nonking moves, captures, promotions and changed rights/EP do not qualify.
Actual terminal clock/repetition suppress labels. A valid completed triangle
can still permit mate: urgent warning wins selection, with that reply retained.
Clock and third-repetition enemy replies also remain in certificates.

All 126 new tests and 3,322 cumulative E020–E065 tests pass. Maintained source
verification and diff checks pass. Full run: 3,060 cases, 2,870 with facts,
140 abstentions and 50 refused illegal moves; selected comments at most 21 words.
Cumulative independent replay: 5,627 certificates, 288 queries, 18,379 reply
or history edges and 42,764 replay leaves. New classification uses 1,100 bounded
nodes; inherited trap checks 28 on new cases. No engine search/numerical fitting.

Study source committed 3672cf5; shared workflow rules 87767ed merged without
changing study inputs at frozen reproduction revision 32b38a1. Existing isolated
development branch retained. Existing E064 verification checkout fast-forwarded
to that revision and confirmed initially clean; no new branch or clone. Main,
repeat and clean runs match exact revision, normalized inputs, physical output
hashes and metrics. Runs took 250–255 seconds versus the estimated ~200 seconds;
all existing sessions completed, with no timeout restart or source mutation.

Saved JSON independently reconstructs 40 new certificates on 40 positive rows,
with 76 legal negative rows and four refused illegal moves. Enemy return units:
20 kings, four rooks, four knights, four bishops, eight queens. Proofs retain
464 actual replies, 192 history plies, 20 terminal replies (four repetitions,
12 clock draws, four mates) and eight captures. Physical full-history mate/
clock/repetition checks pass. All 2,940 inherited full-result fingerprints match
E064 in order; original-list hash unchanged.

Full evidence 3,609,791 bytes, within the prospective 5MB budget; all proofs
retained with frozen E053 compact display. Coverage 290 verified names /
334 original occurrences; 76 partial and 675 unimplemented occurrences. Only
Triangulation's actual recorded tempo sequence is newly checked. Human teaching
benefit, real-game precision and extension readiness remain unknown.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean](evidence/clean-run.json).
Reproduce: `node research/experiments/E065-king-triangulation/code/run.mjs --out research/runs/E065/reproduction`.
Guarded D001 test receipts retained. Completed results integrate through the
one existing shared research branch and fast-forward local main only when clean,
already on main and without an operation in progress; never push.

Next: investigate Pawn race in pure king-and-opposing-pawn positions. Require
complete legal enemy replies and legal queening by the mover's tracked pawn
before the opposing pawn can promote. Retain checking/capturing/terminal
refutations and every continuation; first queening must not imply a win or
queen safety without separate evidence.
