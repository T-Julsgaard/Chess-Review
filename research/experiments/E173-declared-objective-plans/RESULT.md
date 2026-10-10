# E173 — explicit objectives and complete short policies

2026-10-10. **Prototype, not accepted evidence.** Preregistered ade8452, parent
E172 360bd26; pre-evaluation fixture amendment 7fa6c06. Authorized current main
checkout; research-only local commit, no push. Three bounded original scopes
C0517/C0518/C0520. C0519 long-term planning remains without candidate code:
short legal policies do not establish enduring value, private intent or a
long-term plan. Preserve that entry and its prerequisites rather than emitting
a copied short-plan label.

`planTags` is default-disabled and wraps E172 exactly. Inputs require genuine
legal history, explicit `planObjective:{kind:'rook-seventh-rank',unit:<square>}`
and a distinct quiet same-unit `planAlternative`. The objective identifies an
own rook at the current root, separately from the unit making the first move.
Actual and alternative first moves must be legal, noncapture, nonpromotion and
nonchecking. Unsupported objective kinds abstain; malformed controls reject.
Missing inputs abstain. Already satisfied or historical terminal roots abstain.

`planPlies` accepts integers 1–3, default three, including the supplied first
move. Future search starts on the genuine enemy turn. The objective is the
original identified rook surviving on the actor-relative seventh rank at a
live endpoint. Checking endpoints are allowed; terminal positions and other
rooks cannot satisfy the objective. This is a declared board goal, not a claim
that entry is strategically useful, optimal or intended by the player.

Three separate gates:

- C0520: a complete legal policy reaches the declared objective, including
  possible direct achievement by the supplied first move.
- C0518: the objective remains unmet after that move, but every enemy reply
  admits a later own action reaching it within the declared bound.
- C0517: the short policy exists after the actual move and fails after the
  paired quiet alternative at the same objective and horizon. This compares
  route establishment; it does not observe when a human formed a plan.

White Kb1 Ra1 Qa2 versus Black Kh8: Qb3 clears the original rook's route, so Ra7
is available after every reply. Qa3 leaves the route blocked. All three labels
pass. Qc4 also clears the route, withholding only the comparative label.
Without the queen, direct Ra7 emits only objective achievement. Adding Black
Ra8 permits capture of the original Ra1 after clearance, defeating the policy.
Both colors pass. A focused case with another White rook retains failure after
the original rook is captured, even though the replacement could enter rank seven.

Raw panels retain both full deterministic query trees, every visited legal
inventory, original-rook identity, endpoint/terminal/claim/goal states, horizon
and played move record. Actor success chooses a successful child; actor failure
retains all legal failures. Enemy success requires all defenses; enemy failure
retains a defeating child. Failed branches inspected before a selected child
remain in the tree and trace. Thus unsuccessful exploration, draw claims and
node work cannot disappear through proof pruning.

`maxPlanNodes` is integer 0–50000, default 50000. Context/history, panel/history,
variant and query work are charged; derivation adds three nodes. Atomic exhaustion
drops own witness/events, preserves parent and records limit+1. Any visited
fifty-move or repetition claim suppresses labels. Priority 190.9,
`qualityClaim:false`, comments at most 24 words. No production behavior changed.

Development evidence:

- 61 focused checks passed in 15.7 seconds, plus two E172 parent representatives.
  Checks include one/two/three-ply distinctions, original identity after capture,
  full reply inventories, genuine history prefixes, repetition, visited fifty-move
  claims, exact/short/fresh budgets, disabled compatibility and 25 semantic proof
  mutations. Independent reconstruction imports no detector/collector/context/
  derivation code.
- Guarded D001-test authored synthetic pilot: 20 cases, ten witnesses, six
  positive cases and ten unique panels. Final execution reused all ten panels
  with zero fresh searches. Successful smoke supplied four White panels; the
  initial pilot collected four reflected counterparts and two short-horizon panels.
- Independent saved semantic replay passed all cases, witness gates, complete
  deterministic exploration, costs, raw/result output hashes, inherited snapshots,
  policy receipt and 733 normalized recursive dependency/source hashes, including
  the complete parent build. Source verification and diff checks passed.

The amendment preserves the original illegal bishop alternative and its
pre-evaluation correction. Initial smoke then rejected the direct-case Ra1–b1
alternative because own Kb1 occupies b1. Original fixture/runner and failure
summary are retained under `evidence/initial-direct-alternative-failure/`.
The original runner wrote after the whole loop, so its first two successful
small searches had no retained raw panel. Recollection was necessary; the runner
now checkpoints each completed case. Legal quiet Ra3 replaces only that invalid
alternative. No proof gate, horizon or objective was relaxed.

Compressed observations/results total 39,440 bytes; all retained evidence totals
170,737 bytes, below the 500KB soft target. Standard gzip decodes the JSON.
`code/replay-saved.mjs` performs independent semantic replay. Cache eligibility
binds full history/root, first-move pair, objective, horizon, collector/context
closure and receipt. No engine, tablebase, new real games, human review or locked
confirmation was used; none of these synthetic checks measures human usefulness.

Accepted coverage stays E082: 378/1,085 entries (34.8%), 328 names. Provisional
coverage is separate: 418 pending entries in 93 ready batches, zero stale;
796/1,085 accepted-or-candidate entries (73.4%), 289 without candidate code.
Narrow candidate scopes do not discharge the broader original definitions.
Full cumulative regression, exhaustive original-occurrence/absence/priority/
history/budget audits and changed main/repeat/initially clean reproductions remain
deferred to the combined freeze. Long-term planning, strategic value, real-game
precision and teaching usefulness remain open.

Next: C0523 piece improvement, then C0533 creating an outpost, filtering out
already implemented target-selection/weakness-identification/minority-attack/
prophylaxis scopes. Preregister compatible observable improvement/outpost claims
and reuse existing E156 piece-objective and structural machinery where eligible;
do not substitute generic placement labels for the broader strategic concepts.
