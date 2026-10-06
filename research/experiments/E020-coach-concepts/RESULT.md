# E020 result and resume state

State: complete (2026-10-06). Outcome: **inconclusive for educational improvement**;
all declared synthetic mechanics gates pass. Evidence maturity: exploratory.
There is no independent human assessment or real-game confirmation.

Protocol registration: `840c6bb`; evaluated code/fixtures/amendment revision:
`7d7dffd77f339888422225193dc766e4af8b8e18`. The dated amendment records fixture
corrections and expanded exposed boundary tests. No acceptance gate was changed.

## What is working

The pure research API emits move-specific facts and structured evidence for
knight/pawn/royal forks, a specific opponent fork warning, an avoided fork
compared with a supplied legal alternative, new absolute pins, discovered
checks, double checks, check/mate/stalemate and special move facts. Fifteen
supplied concept names are verified within the scope stated in the
[tracker](evidence/concept-status.md). Its 1,085 occurrence IDs preserve duplicate
entries: 17 verified occurrences, three partial, 1,065 not implemented.
The [complete supplied list](CONCEPTS.md) preserves the attachment bytes.

Example comments:

- "Your knight on d6 forks the king on e8 and the queen on f7. Every legal reply
  still allows a capture of one of these targets."
- "Watch out: Nd3+ lets the opponent fork your queen on b2 and your king on e1."
- "Your move prevents the fork with Nd3+ that Qb2 would allow."
- "Your piece on e1 pins the rook on e7 to the king on e8. It cannot move off
  that line without exposing its king."

Open [the browsable demo](evidence/demo.html) for boards, comments, negative
cases and expandable evidence. The runner regenerates it without dependencies
beyond Node.js 24 and bundled chess.js. The demo's four filters passed a jsdom
interaction check; its boards/comments were visually inspected in the app
browser. A narrow-layout overflow found during inspection was corrected before
the final evaluated code commit. No extension files changed.

## Evidence and gates

All 34 authored positions and their color/rank-reflected counterparts are
exposed synthetic development fixtures. They include both successful examples
and capturable/pinned forkers, defended equal-value targets, immediate countermate,
terminal draw, old motifs, pin-line moves, castling-rook checks, en-passant
discovery and illegal inputs. No real games, ratings or existing review cases
were loaded into this experiment. Each input-loading runner/test calls the
shared guarded loader and retains or verifies D001 eligibility first; that
check admits registered bytes but does not make D001 an experimental sample.
The [run record](evidence/run.json) retains the public-data-v1 receipt, exact
LF-normalized source/fixture hashes, command, revision, environment and outputs.

| Gate | Units | Result |
| --- | --- | --- |
| Exact expected labels, negative abstentions and boundary controls | 74 tests | 74 passed; zero failures |
| Declared corpus output | 68 cases | 40 with supported facts, 22 abstentions, six invalid moves refused |
| Independent finite-witness replay | Eight certificates | 72 defender replies, 945 counterreply leaves passed |
| Repeat generation | Results, HTML, tracker | Identical output hashes |
| Clean local clone generation and tests | Code revision 7d7dffd, initially clean tree | All three output hashes and all input hashes match; 74 tests pass |
| Source integrity | `npm run verify:source` | Passed |
| Demo filters | 34 displayed authored cases | All 34, comments 20, abstentions 11, invalid three |

The [verification summary](evidence/verification.json) retains hash comparisons
and counts. [results.json](evidence/results.json) contains every case and complete
accepted defender-reply witnesses. The [separate replay implementation](code/certificate.mjs)
does not reuse detector selection, material helpers or budget logic, but does
use the same chess.js legal-move library. It checks geometry, completeness of
defender replies, legality of each target capture, every immediate counterreply
and the reported minimum gain; tampering tests reject missing replies and
changed gains. It is not a second independent rules engine or human oracle.

Default generation took about 1.7 seconds after the eligibility gate; about
0.64 MB of evidence is retained. Positive pawn-fork examples require the most
branches. `maxNodes=50000` bounds counted move-generation/application operations;
budget exhaustion explicitly abstains from all tactics while retaining rule
facts. No Stockfish searches, engine options, randomness or cache substitution.
Tests take about three seconds including the eligibility check.

## Reproduction

```sh
node --test research/experiments/E020-coach-concepts/code/*.test.mjs
node research/experiments/E020-coach-concepts/code/run.mjs
node research/experiments/E020-coach-concepts/code/run.mjs --out research/runs/E020/repeat
npm run verify:source
```

For a clean replay, clone this repository locally into a new empty ignored
`research/runs/E020/` child directory, check out `7d7dffd`, and run the first two
commands there. No installation is needed. Compare the three output hashes and
all input hashes in its `evidence/run.json` with the retained record. Run
timestamps/elapsed time/Git output status are metadata and need not match.
The retained main run had result/index documentation changes and generated
evidence; its hash-bound evaluation inputs were unchanged. The clean clone began with empty Git status.

## Interpretation and next action

A supported fork has an exhaustive **finite** certificate: after each legal
defending reply, the forker can capture an original non-pawn target, and all
immediate counterreplies retain positive net nominal material relative to
before the fork move. Defender mate/draw and terminal draw branches reject the
claim. This is stricter than geometric attacks or a single preferred engine
line, but proves neither long-term tactical safety nor a winning/best move.
Comments state the verified capture property without praise or an optimality
claim. Avoidance names one counterfactual fork, not universal prevention.

Absolute pins restrict leaving a line, rather than all movement. Move facts
do not establish that castling improved safety or an underpromotion was best.
FEN setup syntax/non-moving king safety are checked; historical reachability
and prior repetition are unknown. Arbitrary dead positions and other concepts
remain deferred. Synthetic fixtures cannot estimate real-game precision,
coverage, educational utility, or comparison to current phrase-bank commentary.
There is no baseline instructional improvement claim and no promotion record.

Resume state: mechanics prototype, per-entry tracker, demo, tests, finite
certificates and clean replay are complete. Next action is a **separate planned
evaluation** of real-game explanation precision and human usefulness, with
fresh registered public evidence and blinded reviewers, before considering
extension integration. Do not resume the paused numerical goal automatically.
The extension stays at B000.
