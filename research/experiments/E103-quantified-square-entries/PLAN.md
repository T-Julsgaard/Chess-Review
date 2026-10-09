# E103 quantified square entries and pawn resistance

Preregistered 2026-10-09 after completed E102, same isolated checkout/branch,
clean shared main dec988e, no live frozen run. Six original pending scopes:
C0270 Entry square, C0271 Penetration square, C0266 Weak square,
C0267 Strong square, C0212 Pawn-context weak square, C0337 Protected knight outpost.
Do not duplicate accepted E070 outposts, alter accepted source or promote counts.

Default-disabled squarePolicyTags wraps E102; maxSquarePolicyNodes integer
0..50000 default50000. Atomic exhaustion preserves parent events/comments.
Actual noncapturing nonpawn/nonking entry, live complete legal history.
New square policy: EVERY legal enemy reply permits a selected legal capture by
that same moved piece, followed by EVERY legal enemy counter, with positive
nominal gain from before the played move and no terminal outcome. Store full
reply/capture/counter inventories; failure includes a complete failed enemy
branch (all candidate captures, with a counter or terminal/absence refutation).
This is finite three-ply tactical usefulness, not a best-square evaluation.

C0266/C0267: positive square-specific policy after actual entry, enemy cannot
immediately remove the moved piece or extinguish that bounded capture goal.
No permanent holding or general strategic strength. C0270/C0271 additionally
relative destination rank>=5 and same-placement artificial restore of only the
moved piece to its origin, preserving post-move clocks/rights and clearing EP,
has complete failure of the identical piece-specific policy. Legal frame only.
This is causal finite invading entry, not enduring penetration/value.

C0212/C0337 additionally actual knight relative rank4..6 and reused E070 full
callable positive outpost certificate: legal own-pawn support counterframe plus
complete occupancy-independent enemy-pawn reach DAG excludes every future
pre-promotion attack of this fixed square. Retain the original source certificate,
charge its complete node cost against the same budget, and reuse E070 independent
semantic replay. Add positive square-specific material policy; do not rename the
accepted graph-only detector. Promoted units, removal of support, further turns
and permanent safety remain unresolved. Pawn holes and color-complex weakness
need causal pawn/history and broader permanence/usefulness inputs; remain queued.

Positive/negative/reflected synthetic examples, no support, reachable enemy pawn,
material counter-mate/draw, before restore, removal/capture refutations, strict
controls/history, default-disabled equality and early/late exact-budget checks.
Focused E103 plus E102/E070/E022/E091 affected checks; use representative bounded
checks, not full E079/cumulative regeneration. Guarded cheap pilot, independent
saved legal/material/pawn/history replay, full normalized dependency closure,
source and staged diff checks. Record build.json and RESULT.md exact scopes,
INDEX prototype; no accepted tracker changes. Defer combined full regression,
interaction/priority/history/budget/absence checks, exact frozen reproductions,
original-occurrence audit and real-game usefulness. Never push.
