# Broader tactical explanations

Research-only `explainMove({fen,move,alternative?,maxBroadNodes?})` imports E022.
It adds all-piece finite forks, triple attacks, discovered double attacks,
finite hanging-capture warnings, legal immediate mate warnings and descriptive
x-ray/interference geometry. It corrects inherited en-passant victim locations.
No extension integration. [Tracker](evidence/concept-status.md), [demo](evidence/demo.html).

Run `node --test research/experiments/E023-broad-tactics/code/*.test.mjs`, then
`node research/experiments/E023-broad-tactics/code/run.mjs`; optional
`--out research/runs/E023/name` preserves repeated results.

Finite forks require a target capture against every defense and positive net
nominal material after every immediate counterreply. Hanging warnings are
possible legal captures, not inevitable loss, best play or long-term evaluation.
X-rays state that a blocker prevents a direct attack/defense. Interference names
one removed attack line, not complete safety. Cross-pins remain deferred.
