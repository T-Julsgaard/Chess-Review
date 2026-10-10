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

Second checkpoint, 2026-10-10: inspectOffer now independently admits the complete
E165 source witness, walks its certified policy to require checks on every
selected attacking continuation, and reconstructs every legal acceptance of the
offered moved unit plus every immediate actor reply. Signed material includes
captures, promotions and en-passant victims. C0593 requires an actual nominal
concession and the checking mate policy; C0588 additionally requires unrecovered
loss through all immediate replies on an acceptance and the failed same-bound
quiet comparison. The E165 result is unchanged.

Five focused offer tests pass in26.98seconds, dominated by frozen full-source
admission: both colors of the original queen offer, checking mate without
acceptance, missing helper/short bound, changed source and strict controls.
Original and reflected authored recovery controls each collected one new full
E143 H2 panel,5411nodes, after exact E143/E165 cache lookup found no match.
Raw panels checkpointed before source derivation; saved result files retain the
guarded receipt and recursive source bindings. Both produce C0593true/C0588false:
queen concession9, immediate promotion/capture recovery13, minimum net loss-4.
Independent check-offer imports no E182 runtime/collector/derive and reconstructs
the policy/checks, acceptance inventory, complete replies, material and claims.
replay-recovery passes both saved controls, exact source bindings, raw/source
panel equality, receipts and artifact hashes. Frozen E165 source checker and
Chess remain shared dependencies. No engine, acquired games or full suite.

Evidence files recovery-raw-w/b.json.gz and recovery-result-w/b.json.gz decode
as standard JSON; recovery-replay.json binds those four artifacts and checker
closure. This is a development checkpoint, not the registered30case main pilot.
No ready build or accepted-coverage change is claimed. The earlier space
checkpoint and its nine focused tests remain unchanged. Source/diff checks pass.

Next: implement independent space decision replay, exact E152 projection and
guarded checkpointed saved pilot/provenance. Complete the registered fixture and
mutation coverage before creating build.json or marking this batch code-ready.
Full combined regression, exhaustive scope audits, and changed main/repeat/clean
reproductions remain deferred under BUILD-FIRST. The complete catalog remains
in scope; accepted E082 and provisional coverage counts are unchanged.
