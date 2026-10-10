# E142 — tactical trade judgments

2026-10-10. Prototype, not accepted evidence. Preregistered91c5e48, parent
E141ea1e96e. Authorized current main, research-only local commits/no push.
Four new provisional scopes C0039/C0040/C0045/C0046. Broader positional trade
quality, advice across realistic games and full catalog occurrences remain open.

Implemented callable default-false tacticalTradeTags wrapper over E141. Full
legal history must end in an opposing capture exchanging equal nominal nonpawn
units. Complete current legal-move inventory distinguishes recapture on that
arrival square from keeping the exchange incomplete. Captures elsewhere can
belong to the latter group; they are not falsely described as quiet moves.
Both sides receive complete finite mate queries after EVERY candidate, at the
same bound. Unproved alternatives remain unresolved, never safe/drawn. A good
recapture forces actor mate while a nonrecapture allows enemy mate; a bad one
allows enemy mate while another option forces actor mate. Ahead/behind labels
use material BEFORE the initiating capture, as context rather than causal proof.

The registered authored hypotheses worked without correction: after ...Rxh7,
Qxh7# completes the rook exchange while Qh4 permits ...Qe1#; after ...Rxg5,
Qxg5 permits ...Qe1# while Qxh7# leaves the rook exchange incomplete. The latter
position is nominally behind before initiation; the former ahead. Reflections
have the same outcomes. This is tactical outcome comparison, not a claim that
all trades while ahead or all retained pieces while behind are beneficial.
Declining recapture here leaves an enemy rook on board after one's rook was
captured; it does not preserve an already captured friendly rook. The exact
keeping-exchange-incomplete scope is retained for C0046, with broader strategy open.

Strict remaining bound0..2 default1 and node cap0..50000 default50000. Atomic
budget exhaustion removes all new witness/labels and preserves parent output.
Draw-claim leaves cause explicit claim-rule-prerequisite abstention; no history
claim becomes a game result. Full all-defense policies, terminal checks, canonical
FEN/SAN and both proof trees are retained. No shortest/best move claim. No new
engine searches, tablebase probes, game data or documentation diagrams were used.

31 focused checks pass6.1s. They cover12 authored/reflected fixtures, disabled
exact parent equality, strict controls, exact/one-short budgets, complete legal
inventory including unresolved alternatives, nominal-context counterexample,
absent/empty/unrelated history,11 independent witness mutations and altered
quality metadata. Two representative E141 parent checks pass4.1s. Source
verification and diff checks pass. No long/cumulative suite was run.

Guarded D001-test pilot12cases:6positive,8complete comparison witnesses,
2missing-history and2zero-budget cases. The two short-bound witnesses have
no trade labels because opposing mate is not proved at zero plies. Positive
H1 panels consume1,683 or1,913 counted nodes. Independent saved checker imports
Chess and the existing independent mate-tree replay, not detector/query/search.
It rebuilds full legal histories, initiating exchange, pre-exchange balances,
option inventory/classification and verifies every retained proof and exact label.
Saved replay also checks parent-event snapshots and all source/output hashes;
exhaustive parent interaction/priority validation remains deferred.

Retained evidence/results.json.gz49,167bytes (456,014uncompressed) plus run.json:
187normalized source/fixture/plan/dependency hashes, environment, commands,
preregistration revision plus working-source bindings and eligibility receipt.
The final build includes E141's full source manifest, vendor pins, acquisition
and probe code for the representative inherited check, rather than only static
JavaScript imports. Expanding that dependency manifest superseded an initial
162-input development pilot; the final small pilot/replay was regenerated with
187inputs. Six-case initial smoke and focused legal proof checks preceded it.
These are cheap deterministic authored mechanics, not repeated engine/tablebase
collections or independent confirmation. No hypothesis failure was observed.

Accepted E082 remains378/1,085(34.8%),328names and63studies. Current build340
provisional entries,62ready/0stale batches;718accepted-or-candidate(66.2%),
367without ready code. No accepted tracker, shared policy, production or
numerical behavior changed in this batch.

Deferred: combined full regression, occurrence/absence/priority/history/budget
audits and exact main/repeat/initially clean reproductions; broader nonmating
positional trade judgments, realistic precision and teaching usefulness. The
original strategic concepts remain in scope beyond these tactical counterexamples.
Next: compatible causal tempo/initiative or piece-quality comparisons with real
alternative policies; preserve perpetual-attack recurrence and sustained named
rook-defense prerequisites. Full catalog goal remains unfinished.
