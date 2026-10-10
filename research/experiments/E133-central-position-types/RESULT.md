# E133 — provisional central pawn types and legal fluid choices

2026-10-10. Preregistration9c55185, parent E1327a73519. Authorized current main,
local research commits/no push. Four candidate original scopes C0959/C0960/
C0961/C0975. Whole-position openness, activity/advantage, general fluidity and
taxonomy agreement remain open. Accepted tracker, numerical/production unchanged.

Definitions reviewed2026-10-10: [Chess.com open](https://www.chess.com/terms/open-game-chess)
and [closed](https://www.chess.com/terms/closed-game-chess) teaching pages,
[EducaChess Intermediate2 Unit2](https://educachess.org/media/en/et_4_u_en.pdf).
Central pawn removal/blockage and distinct unresolved-tension centers motivate
our operational taxonomy; sources do not prescribe this exact classifier.
Definition responses contained incidental example move text, disclosed in
EXPOSURE.md; no source games, diagrams or example routes were used for fixtures
or evaluation. These are authored synthetic mechanics, not taxonomy validation.

Default-false centralPositionTags; strict maxCentralPositionNodes integer
0..50000 default50000. Disabled exactly E132, no implicit parent flags. Atomic
extra exhaustion preserves inherited events/comment, including enabled outpost
policy. Live root/actual, full legal history retained when supplied. No engine,
material-count cap, opening-family inference or original-pawn identity assumption.

Save all current pawns, all8file/color inventories, every central pawn front
occupant and direct adjacent white-below-black d/e lock. Explicit categories:
open = no current d/e-file pawns; closed = locks on BOTH files and EVERY central
pawn blocked forward by an enemy pawn; split semi-open = each d/e file has pawns
of only one color, opposite colors across the two files. Everything else is
other, without a catch-all label. A single fixed file, mobile/doubled pawns or
nonpawn blockers do not automatically count closed/semi-open. Closed describes
blocked forward advances, with possible captures/pawn breaks expressly retained.

Fluid central choice requires actual NEXT side's legal quiet nonpromoting central
pawn advance yielding live closed structure AND legal nonpromoting central pawn
capture yielding live open/split-semi-open structure. Complete actual legal moves
and ALL relevant central pawn successor rows retained, including failures,
terminal flags and full taxonomy. Deterministic first eligible choices named.
No hypothetical pass, assertion that alternatives are equally good, prediction
or move-created-fluidity claim. Independent full legal slider paths/intersections
with d4/e4/d5/e5 retained as facts, without inferring activity from pawn absence.

Authored Black d5/e5 versus White d3/e4: after unrelated Ka1-b1, Black can choose
...d4 yielding closed d3/d4+e4/e5 locks, or ...dxe4 yielding split semi-open files.
Both are actual legal moves. Pinned d5 pawn against Ke6 by Bc4 and actual Bg7+
checking Kh8 remove the choice. Closed and fluid fixtures have equal pawn counts
but different structures. Open center with no slider versus legal Ra5 central
routes proves no activity is fabricated. Opposite-color d/e-file pawns label
split semi-open. Own-piece blockage, one fixed file, extra mobile doubled pawn
and unresolved/mobile structures abstain. Both colors, actual en passant and
promotion, terminal50-move, full four-ply history and actual capture tested.
Fluid39nodes: exact39 passes,38 exhausts atomically. Zero/tiny budgets retained.

Initial57focused checks had one mutation-test failure: assigning White's semi-
open file to d left its already-correct d value unchanged. Corrected mutation
to assign the opposite file, not the detector or checker. Final57 pass in1.2s;
three representative E132 disabled/strict/history checks pass in0.6s. Source
verification/diff checks pass. No cumulative suite, engine searches, acquired
game evaluation, holdout or long inherited historical recollection.

Guarded D001-test authored pilot32cases:14positives,4expected exhaustions.
Independent saved semantic replay passes14witnesses and142 normalized source/
fixture/parent hashes. Checker imports neither detector nor taxonomy/path helper:
parses FEN independently, reconstructs pawn files/fronts/locks, complete actual
legal moves, slider paths, successor structures, terminal flags and choices.
Deleted branches, altered pawn/color/file/front/lock/semi file/path/center,
successor type/terminal, choices/fluidity/clock/label mutations rejected; explicit
independent full-history mutation also rejected. Wider absence matrices deferred.

Evidence copied from research/runs/E133/final to evidence/results.json.gz and
evidence/run.json. Actual revision, normalized source hashes, environment/argv,
null engine/seed and guarded receipt retained. Plain105331bytes,gzip17836.
Packed SHA256 9b0e1a0dbe4bf5001a1c87b72550328e6e03cd27b1e19a4bd7b6b4d205bc1755;
plain e168c02754db3575ae02fc2139e58572f18b5c833b213c69259457af5f9f1c7e.
Replay: node research/experiments/E133-central-position-types/code/replay-saved.mjs

Accepted E082 unchanged378/1085(34.8%). Build317 provisional original entries,
54ready/0stale batches;695accepted-or-candidate(64.1%),390without ready code.
Deferred combined full regression, exhaustive absence/priority/history/budget/
interaction/original-occurrence audit, exact main/repeat/initially clean
reproductions, real-game precision, independent usefulness/taxonomy agreement.
Wider flank structures, doubled/advanced combinations and whole-position types
remain unresolved; central pawn structure does not establish piece quality.

Next unused E134: finite rook/king-race families or broader coherent strategic
scopes. Preserve sustainable perpetual-attack and outcome/tablebase prerequisites;
continue compatible focused batches and small pilots without cumulative tests.
