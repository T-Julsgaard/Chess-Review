# E145 — critical mating decisions and recorded reversals

2026-10-10. Prototype, not accepted evidence. Preregistered d2f118c, parent
E144 af60027. User-authorized current main, research-only local commits/no push.
Two provisional scopes C0130/C0131; general critical decisions and the full
catalog remain open. C0092 positional sacrifice still requires long-term
positional-compensation evidence; finite mate offers cannot discharge it.

C0130 compares EVERY legal candidate at the same continuation-ply bound and
requires both a certified actor-mate option and a certified enemy-mate option.
Unproved outcomes remain unresolved; mechanically terminal stalemate/insufficient
material outcomes have their own class. Available decision stakes are separate
from the outcome of the actually played move. No shortest, unique, best-choice,
all-mistakes, positional-evaluation or general criticality claim is made.

C0131 adds a genuine recorded-history transition. Replay the full actual history
and derive the previous SAME-actor decision two plies earlier from its true
prefix. Its actually played move must have allowed certified enemy mate; the
current panel must offer actor mate and enemy mate after the recorded opposing
reply. An arbitrary earlier snapshot or two plies existing is insufficient.
The earlier position may have other opportunities outside these particular
certified roles; no claim that all longer-term opportunities switched sides.

The authored reversal records Qh5-g5 / ...Qh4-g3, then Qg8#. Earlier Qg5 allowed
...Qe1#, while the recorded ...Qg3 gave up that opportunity and allowed Qg8#.
At bound1 the current panel has one actor-mate option,17enemy-mate options,
16unresolved options and no mechanical draws. The previous panel has no
actor-mate option,16enemy-mate options and8unresolved options; the recorded Qg5
has enemy-mate role. A separate baseline has1/19/18 actor/enemy/unresolved
options. Reflection preserves the claims. Quiet losing actual Qh5 retains the
decision-stakes label; it does not receive a favorable move-quality claim.

Default-false criticalDecisionTags wraps E144. Strict criticalDecisionPlies0..2
default1, maxCriticalDecisionNodes0..50000 default50000. Supplied cached panels
are untrusted and independently admitted before labels. Missing full history
abstains. Counterfactual repetition/fifty-move claim contexts anywhere in either
panel abstain, including discarded exploration. Current claims stop before
collecting the previous panel. Atomic exhaustion clears all new evidence/events
and preserves parent behavior. Same fresh/cached logical cost:3context nodes
plus exact complete current/prior panel costs, including every exploration tick,
retained proof node/edge and history/claim work. Baseline costs1817nodes;
reversal costs2361(3+1660+698). One-short combined budget abstains atomically.

Prospective AMENDMENT.md separates mechanical terminal draws from unresolved
bounded queries; claim-rule contexts still abstain. The initial authored smoke
supported both preregistered positive hypotheses. A focused negative moving the
earlier enemy queen to h3 retains the current board after its recorded reply,
but the earlier played move is unresolved at the same bound: no reversal label.
No observed hypothesis failure or altered claim gate is recorded for this batch.

42focused checks passed23.8s:12authored/reflected fixtures, strict/disabled
parent equality, fresh/cache equality, exact/one-short cap, all legal alternatives,
quiet actual move, unavailable prior history, mechanical draw distinction,
history-only negative, current and previous counterfactual repetition claims,
17independent proof/history/summary mutations, caller panel mutation and quality
metadata/comment limits. Two representative E144 parent checks pass. Source
verification and diff checks pass. No cumulative suite or long historical
reconstruction was run.

Guarded D001-test pilot:12cases,4positive,8witnesses,2missing-history and2zero-cap
cases. Saved panels:10total,2borrowed from E143,2new initial-smoke panels reused,
6newly collected for this pilot. The smoke's baseline is also byte-equal to its
borrowed E143 panel. Collection binds22source inputs; complete build binds231.
All ten panels are semantically replayed. Independent checker imports Chess and
E143's independent panel verifier, never detector, contexts, collector or query
helper. It reconstructs actual full histories, prior decision prefixes, complete
legal inventories, successful/failed policies, canonical exploration traces,
summary classes, exact cost and comments. Retained replay verifies source/output
hashes, eligibility receipts, E143 provenance and parent-event snapshots.
Full inherited interactions/priority remain combined-validation work.

Retention: observations.json.gz43,748bytes; results.json.gz63,073bytes
(779,196uncompressed); run.json with environment, commands, null engine/seed,
preregistration revision plus exact working-source hashes, output hashes,
receipt and borrowing provenance. Final pilot/replay reuse all cached panels;
no recollection. No engine/tablebase searches, game content or imported diagrams.
Accepted tracker, shared data policy, production and numerical behavior unchanged.

Accepted E082 stays378/1,085(34.8%),328names,63accepted studies. Build347
provisional entries,65ready/0stale batches;725accepted-or-candidate(66.8%),
360without ready code. Narrow candidate coverage never completes broader scopes.

Deferred: combined full regression, exhaustive occurrence/absence/priority/
history/budget audits, exact main/repeat/initially clean reproductions, broader
nonmating criticality, real-game precision and teaching usefulness. Next:
calculation stopping-point or backward-goal policies with suitable finite
alternatives; preserve positional-compensation, sustainable perpetual-attack
and named rook-defense prerequisites. Full catalog goal remains unfinished.
