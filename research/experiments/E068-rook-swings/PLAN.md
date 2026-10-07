# E068: a checking rook swing after a recorded lift

2026-10-07. Preregistered before implementation/evaluation. Research only.
Rook swing C0350: a deliberately bounded subset of lateral attacking rook moves.
Reuse E067 and all 3,304 ordered baseline results; D001 test gate, authored
fixtures only. No extension changes, acquired games, usage cutoff or shutdown.

Opt-in rookSwingTags boolean default false; maxRookSwingNodes integer 0..50000,
shared budget. Disabled exact parent; exhaustion drops all new events.
Full legal history must show the immediately previous own move lifting the
same rook straight from relative rank 1/2 to 3/4 by at least two ranks,
without capture or promotion. One legal enemy reply separates it from actual.
Actual rook moves sideways at least two files on the lifted rank and directly
checks the enemy king on its destination file by an unobstructed rook ray.
Actual after must be live. Retain every legal enemy response, full FEN, SAN,
captures, terminal flags and whether that rook remains. No safety, winning
attack, intention, best-play or successful king-hunt claim. Text <=24 words,
qualityClaim false, priority 101.003 below urgent material/mating warnings.

Independent replay imports no detector helpers, reconstructs strict full history,
rook identity/lift, direct check ray and every legal response and exact text.
Author positives both colors/flanks/ranks/capturing swings, defended/capturable
rooks, check evasions, clock-terminal replies; negatives absent/wrong/stale
history, wrong unit/rank/direction/short transfer, blocked/discovered-only
check, terminal actual, options/budget and illegal moves. Corrupt histories,
reply sets/flags/rays/text and require independent rejection.

Cheap focused pilot then targeted/full cumulative/source/diff checks. Freeze
source before main/repeat/initially clean full runs. Reuse existing detached
verification checkout and distinct outputs, preserve prior evidence. Require
exact revision/input/physical output/metrics, unchanged original list and all
ordered inherited fingerprints, independent saved-proof replay. Estimate
~270 seconds per run, overlapping three; prospectively <=12MB complete evidence.
Retain and report every miss without weakening gates or deleting evidence.
Synthetic mechanics do not establish real-game precision or teaching benefit.
Commit coherent changes and fast-forward existing local research branch/main
only under repository clean/ancestry rules; no push.
