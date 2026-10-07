# E046: coordinated named terminal mating patterns

Date: 2026-10-07. Research only; usage cutoff/shutdown cancelled.
Question: can Greco, Blackburne and Kill box names identify actual coordinated
terminal mates while rejecting irrelevant helper presence? Baseline frozen E045.

Opt-in netPatternTags boolean default false, exact parent otherwise.
maxNetPatternNodes integer 0–50,000 default 50,000; one shared classification
budget, drop ALL new tags on exhaustion, retain inherited facts. No mate search.
Require actual legal checkmate, sole checker is played-to unit. Comments <=24
words; priority preserves stronger warnings. No castling or sacrifice claim.

Greco: corner king, rook/queen checks along king's edge file; vacant neighbor
on same home/edge rank is controlled by own bishop outside checker coverage;
inward diagonal neighbor is an enemy pawn blocker. Require bishop-specific
flight duty, not mere bishop presence. Color and file reflection supported.

Blackburne: edge king, actual bishop checker, opposite-color own bishop controls
at least one vacant adjacent flight outside checker AND knight coverage, own
knight controls at least one vacant flight outside BOTH bishops' coverage. For
adjacent checking bishop, knight must protect it. Retain complete per-helper
unique flights, support boolean and all adjacent enemy blockers. Include edge
with rook blocker and corner without rook blocker; no actual castle required.

Kill box: checking rook orthogonally adjacent to edge king, own queen exactly
two files AND ranks away, intermediate diagonal square empty and queen attacks
rook. King is inside that inclusive 3-by-3 rectangle. Every vacant adjacent
flight outside rook coverage is queen-controlled; at least one such flight.
Retain queen/rook support, rectangle, intermediate and exact queen-only flights.
This names the terminal shape, without claiming a preceding forcing sequence.

Authored synthetic positives, both colors, horizontal mirrors, missing helpers
or blockers, lookalike mates sustained by different helper types, wrong support
distance and missing rook/queen protection. Independent replay must reconstruct
actual checkmate and all claimed roles without importing detector functions.
Flight attack geometry explicitly removes only the king; actual legal mate
checked separately. Full history/FEN/terminal guards, budget/settings and witness
tamper refutations. Do not import source boards, FENs, games or evaluations.

Commit plan before exposed smoke; record refuted authored hypotheses. Cumulative
E020–E046 tests, source verifier, exact main/repeat/initially clean checkout hashes
and metrics, saved JSON proof/negative replay, unchanged inherited hashes. Guard
D001 test receipt in every entry point; no registered game analyzed. Estimate
~100 seconds per ~1,200-case run, three overlapping runs, compact retention
<3 MB. Original 1,085 occurrences retained. This verifies synthetic mechanics,
not real-game precision or human benefit. No extension/rating edits or push.
