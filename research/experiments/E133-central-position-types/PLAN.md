# E133 — explicit central pawn taxonomy and fluid choices

2026-10-10. Parent E1327a73519. Pending compatible phase3 C0959/C0960/C0961/
C0975 ranks186..189. Full original position concepts remain broader than this
central-pawn taxonomy. Current checkout authorized, local commits/no push.
BUILD-FIRST focused checks/small pilots; no long cumulative tests.

Definition sources read2026-10-10, teaching definitions only, no source positions
used: Chess.com official open/closed terms emphasize central pawn removal and
mutually blocked pawns; EducaChess Intermediate2 Unit2 distinguishes open,
closed, little/fixed/mobile and unresolved-tension centers. Our operational
taxonomy below is an inference, not a claim that these sources prescribe a
universal classifier or exact thresholds. No engine/quality/whole-board label.
https://www.chess.com/terms/open-game-chess
https://www.chess.com/terms/closed-game-chess
https://educachess.org/media/en/et_4_u_en.pdf

Use CURRENT pawn files, not inferred original pawn identity. Save every pawn,
all eight file/color inventories, complete d/e file square lists, every direct
white-below-black adjacent d/e pawn pair and each central pawn's front occupant.
Primary categories, deliberately nonexhaustive:
- Open pawn center: no pawns of either color anywhere on d/e files.
- Closed pawn center: both d/e files contain opposing adjacent pawn pairs and
  EVERY pawn on those files faces an enemy pawn immediately in front. This
  means blocked forward advances, not absence of possible captures/pawn breaks.
- Split semi-open center: both d/e files contain pawns, each file has only one
  color and the two files have opposite colors; each side's other central file
  is free of its own pawns. Do not label every residual mixed shape semi-open.
- Other: all remaining structures, including one fixed pair plus an open file,
  scattered/mobile or ambiguous centers. No unsupported catch-all label.

Fluid central choice overlays primary type only when the ACTUAL side to move
after the played move has (1) a legal quiet nonpromotion d/e pawn advance that
leaves a live CLOSED pawn center and (2) a legal nonpromotion pawn capture
involving d/e by source/destination/victim that leaves a live OPEN or SPLIT
SEMI-OPEN center. Save EVERY legal move and complete rows for EVERY relevant
central pawn move, including failures, resulting taxonomy and terminal flags;
select lexicographic first eligible quiet/capture pair. No hypothetical pass,
prediction of eventual type, claim that the choices are equally good, or assertion
that a specific move created fluidity. Non-exhaustive sufficient fluidity scope.

Retain actual full legal history when supplied, root/after and rule fields.
Require live root/actual. Default-false centralPositionTags, strict
maxCentralPositionNodes integer0..50000 default50000. Disabled exactly E132,
no implicit parent flags; atomic extra exhaustion preserves inherited evidence.
Save complete actual-side legal piece inventory too: every slider move's path
and intersection with d4/e4/d5/e5, without deriving activity/advantage from pawn
absence. This lets independent replay distinguish physical structure from
actual legal routes. No material count cap, no engine, comments<=24words and
qualityClaim:false. Emit primary descriptor (if supported) plus fluid choice
(if proven), with separate original-ID scopes and deterministic labels.

Authored hypotheses: pawn-free d/e with other flank pawns remains open; direct
locked d/e pairs closed despite open wings; opposite-color pawn files split
semi-open; Black d5/e5 versus White d3/e4 permits ...d4 closing both files or
...dxe4 leaving split semi-open files. Use unrelated legal king/piece actual
move to describe post-position, not imply causal transformation. Same pawn
count/different structure, extra/doubled central pawn, blocked-by-own-piece,
one-fixed-file, pinned/checked fluid choice, missing routes/history, captures,
EP/promotion and terminal controls; both colors, strict/exact budgets/parent.

Independent checker imports no detector/taxonomy helper: reconstruct legal
history, all pawn inventories/fronts/pairs, complete legal move/path rows and
all central successor taxonomies/terminal states, selection and exact labels.
Reject missing branches, altered pawn colors/fronts/files/paths, successor type,
history/clock/terminal or choice indexes. Guarded authored D001-test pilot<=32,
source/diff and representative parent checks; retain failures and source closure.

Deferred combined regression, exhaustive absence/priority/history/budget/
integration/original-occurrence audit, exact main/repeat/initially clean
reproductions, real-game precision and independent usefulness/taxonomy agreement.
Accepted E082 tracker, numerical work and production unchanged. Wider central
and flank structures and whole-position classification remain unresolved.
