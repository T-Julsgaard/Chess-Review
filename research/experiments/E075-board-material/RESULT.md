# E075 source-freeze checkpoint

2026-10-08. Approved queue ranks 1–8 implemented as optional research input,
board and nominal-material explanations. Full registered 134-case pilot passed:
62 accepted, 40 rejected, ten terminal-root unavailable, four exhausted, two
disabled-parent compatibility cases and 16 invalid-input errors. Independent
state/event replay passed. Full corpus 4,554 cases; longest selected comment 21
words. Pilot elapsed 259321ms. Failures and priority correction retained in
EXPOSURE.md; no gate relaxed.

Focused 165 tests passed in 3.4s; full cumulative coach regression (4,906 tests)
passed in 103.9s. Maintained source/diff checks passed. Occurrence audit confirms
1,077 nonbatch original rows unchanged, C0030/C0031/C0547 partial, five proposed
new mechanics names. No tracker promoted yet: E074 remains canonical.

Next: freeze this tested source, run exact main/repeat/initially clean detached
reproductions, independently replay saved state/certificates and compare all
4,420 ordered E074 fingerprints and original-list hash before completion.
Budget 20MB; reuse existing verification checkout, preserve ignored pilot output.
After exact checks update RESULT/INDEX/README, commit and locally fast-forward
only under AGENTS clean/no-operation/ancestry checks. No push or extension work.
Approved queue continues after this batch; numerical research and cancelled
usage/shutdown automations stay paused. Goal was checked active in the prior
turn; no replacement goal or automation was created.
