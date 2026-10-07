# E076 development exposure

2026-10-08. Source inspection before implementation required the prospective
AMENDMENT: use four-file halves and retain legal EP vulnerability exclusion.
No results had been observed when that correction was committed.

First focused pilot had seven failures: already-rook-armies, promotion-pair and
promotion-rook in both colors, plus the tamper test using promotion-pair. Their
enemy Be5 attacked own Ka1 along e5/d4/c3/b2/a1. The intended pawn moves and
promotions did not answer check, so parent legal membership correctly rejected
them. Move that enemy bishop to f5 in these three authored roots. It retains
the required nonpawn army combination and removes the unintended incoming check.
No legality, live-position, newly-completed-shape, EP or priority gate changed.

All fixtures are exposed synthetic development cases, not independent real-game
precision or teaching-effectiveness evidence. Keep every miss and full proof;
run remaining registered gates before decisive source freeze.

Expanded terminal-root probe failed in both colors because the default parent
already throws `Cannot explain a move from a terminal position` at halfmove 100.
Preserve that exception as a specifically asserted refused-input case; do not
force the new child analysis to replace parent behavior. Add a separate explicit
foundationTags=true clock-root case, whose parent returns unavailable and whose
child correctly returns not-applicable with no new proof. Repetition context
continues to be rebuilt and checked for the new live-root gate.
