# E062: causal pawn space and enemy king destinations

2026-10-07. Research only; numerical work paused, cutoff/shutdown cancelled.
Original list unchanged. No extension integration, acquired games or pushes.

Opt-in pawnSpaceTags names an actual nonpromoting pawn move's newly controlled
squares in the enemy half only when they remove enemy king destinations.
Each named square must occur in the complete legal BEFORE king set, disappear
from the complete ACTUAL after set and return in the complete removed-pawn
causal set. The before position explicitly gives the enemy a hypothetical
turn; the causal after position removes only the moved pawn. Both clear EP,
preserve other state and must independently be legal and live. These are
counterfactuals, not invented actual history. No general space advantage,
safe occupation by another piece, best-move or permanent restriction claim.
Default-disabled API is exact frozen E061; exhaustion drops all new events.

Full evidence retains canonical history/actual move, pawn/king identities,
before/after attack sets, new enemy-half territory, all three ordered legal
king-move sets, every denied square and every actual enemy reply. Replies
include pawn captures, remaining pawn attacks and terminal flags. Independent
replay imports no detector helpers and reconstructs every counterfactual,
legal set, identity, reply and exact short text. Selected examples:

- “Space: e5 newly controls f6, removing that square from the enemy king's legal destinations now.”
- “Space: e5 newly controls d6 and f6, removing those squares from the enemy king's legal destinations now.”
- “Space: dxe6 newly controls f7, removing that square from the enemy king's legal destinations now.”

EXPOSURE.md records development inspection and castling augmentation correction:
generic horizontal reflection relocates the king from e-file and clears rights.
Use an authored standard queenside counterpart for denied c8; both colors pass.
Complete king sets include castling, not just adjacent moves. No detector or
priority changes after target inspection. Prior control by another piece,
remote king, territory outside enemy half and promotion do not qualify.
Absolute pinned pawn removal exposes its own king, so that otherwise valid
control geometry is deliberately unlabelled under the legal causal contract.
Illegal before-turn or terminal removed-pawn positions also abstain. Actual
mate suppresses the label; an enemy mating reply is retained as terminal.
Hanging-pawn and mate warnings retain selection despite the current-space event.

All 117 new tests and 2,939 cumulative E020–E062 tests pass. Maintained source
verification and diff checks pass. Full run: 2,700 cases, 2,586 with facts,
76 abstentions and 38 refused illegal moves; selected comments at most 20 words.
Cumulative independent replay: 5,179 certificates, 288 queries, 16,587 reply
or history edges and 38,088 replay leaves. New classification 2,960 bounded
nodes; inherited trap checks 64 on new cases. No engine search/numerical fitting.

Main, repeat and initially clean clone use exact source ff182a3 and match
normalized input hashes, physical output hashes and metrics; 203–206 seconds.
Saved JSON independently reconstructs 48 new certificates on 48 positive rows.
All 56 legal negative rows/four illegal moves checked. Complete evidence includes
560 reply references, 1,000 king-move references, 56 denied-square references,
12 pawn captures, eight terminal replies, eight castling references and eight
history plies. Denied king moves, causal restoration, pawn captures and actual/
reply mates physically checked. All 2,592 inherited full-result fingerprints
match E061 in order; original-list hash unchanged.

Full evidence 3,575,551 bytes, within the prospectively declared 5MB budget;
all proofs retained, frozen E053 compact display. Coverage 287 verified names /
328 original occurrences; 76 partial, 681 unimplemented occurrences. New name
Space within concrete pawn-control/king-restriction scope. General Space
advantage/disadvantage/imbalance remain unimplemented. Human teaching benefit,
real-game precision and extension readiness remain unknown.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean](evidence/clean-run.json).
Reproduce: `node research/experiments/E062-pawn-space/code/run.mjs --out research/runs/E062/reproduction`.
Guarded D001 test receipts retained. Continue in the isolated checkout while
other activity owns the shared checkout.

Next: E063 investigate Pawn storm as actual advances by distinct pawns toward
a history-verified castled enemy king's flank. Require full legal history,
traceable pawn identities/advances and unchanged king context; do not infer
attacking intent, safety, best play or successful king attack from marching
pawns alone. Budget complete report/display overhead before decisive runs.
