# E086 history-confirmed routes and exact transpositions

Registered2026-10-09 before implementation/testing. Default-disabled E085 wrapper.
Reuse E024 legal-history validation and E035 original-piece tracking principles;
no historical detector/evidence changes. Sharedmain435df12 clean unchanged.

Callable history routes identify the same tracked knight/king, replay all captures,
EP/promotion/castling identities, and retain every piece movement. A knight route
requires at least2 moves/3distinct visited squares and an actual endpoint check,
with complete legal enemy evasions; no placement-only maneuver-quality assertion.
Knight tour is narrower: >=3knight moves/4distinct visited squares, checking
endpoint. King walk requires >=3same-king moves/4distinct squares and actual
endpoint capture; no safety/benefit inference. Broader rerouting strategy pending.

comparisonHistory is an explicitly supplied legal route from the identical start.
It must have a different move sequence and match the actual full final FEN,
including counters, turn, rights and EP. Both histories must remain live. Retain
full rule-state endpoint and repetition keys on both routes; same FEN does not
claim same future repetition rights or opening provenance. Missing comparison
input is unavailable, legal unequal endpoint is different-position, invalid
history rejected. No hidden opening book or history synthesized.

Claims C0156/C0762 exact legal-route transposition; C0155 same-multiset different
move order reaching exact live endpoint; C0324/C0335/C0704 tracked multi-move
knight route ending in actual check; C0336 longer distinct-square knight tour
ending in check; C0402 tracked king walk ending in actual capture only.
Ranks115-116/152-154/157/170/174 share history dependencies; cheaper unused board
scopes with strategic prerequisites remain pending. No intent/value inference.

Focused both colors, positive/negative, tracking identity/capture/promotion/
castling, missing comparison/history, malformed/illegal/terminal routes, full-FEN
counter and rights mismatch, distinct move sequences, default/disabled atomic
budget compatibility and24word limits. Independent focused history/endpoint/
evasion checks, cheap guarded pilot, affected E085 tests, source/diff verification.
Deferred combined regression, complete semantic replay, interactions and exact
three changed-work reproductions; original occurrence audit, usefulness and
broader strategic prerequisites retained. No accepted tracker advancement.
