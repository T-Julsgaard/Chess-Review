# E182 — implementation checkpoint

2026-10-10. Registered at 0c9c53a, parent completed prototype E1818963bad.
In development; NOT code-ready, accepted, or production behavior.

Implemented evaluateSpace/inspectSpace research APIs and complete material-space
panel collection/admission. The quiet actual pawn advance is compared with a
distinct legal same-pawn nonpromoting alternative, including capture. Panels
retain signed root/variant material, legal enemy unit moves and all immediate
actor replies, flags, history, territory and claim contexts. The E152 causal
derivation remains unchanged; independent new panel admission reconstructs the
legal inventories and material. C0590 requires a material gain foregone and
witnessed loss of enemy unit-safe destinations caused by the advanced pawn.
This does not prove overall superiority or lasting strategic compensation.

Nine focused tests pass (node --test
research/experiments/E182-material-activity-space/code/space.test.mjs), about
1.64 seconds overall on the final run. Both colors, fresh/saved exact and
one-short budgets, altered material/omitted reply rejection, no added territory,
no affected unit, no material gain, one affected unit, prerequisites, strict caps
and genuine en-passant victim/material history are represented. Source
verification and diff checks pass. D001 test preflight passes, 54 artifacts,
registry c00de91f767ec439aecbf27fd0929fd26ed3d8c3ca6a5525e996ee58989d026b.
These are synthetic development checks, not independent real-game evidence.

Development tests deliberately collect small fresh panels to exercise collection
and exact-budget behavior, including the quiet negative control. They are not
the registered main pilot. The main pilot must use the registered explicit
projection of eligible E152 quiet panels; no archived pilot collection has yet
been performed or declared reused. No old evidence or production code changed.

Next: implement inspectOffer and its independently checked material recovery /
all-checking mating-policy gates, including the recoverable promotion control.
Then implement independent space decision replay, exact E152 projection and
guarded checkpointed saved pilot/provenance. Complete the registered fixture and
mutation coverage before creating build.json or marking this batch code-ready.
Full combined regression, exhaustive scope audits, and changed main/repeat/clean
reproductions remain deferred under BUILD-FIRST. The complete catalog remains
in scope; accepted E082 and provisional coverage counts are unchanged.
