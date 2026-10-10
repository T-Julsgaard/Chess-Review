# E162 — queen placement threats and weak-square entry control

2026-10-10 prospective compatible batch, parent E161 ba4da2a. Current main
authorized; research-only local commits, no push. No new E162 positions queried
before registration. Original C0375 exposed queen and C0379 queen domination of
weak squares remain broad claims; this batch implements explicit causal finite
comparisons, not general queen safety, enduring domination or optimal placement.

Require full actual history and a quiet nonchecking queen move plus a distinct
legal quiet nonchecking same-queen alternative from the identical root/history.
Default-disabled queenPlacementTags wraps E161 unchanged. queenPlacementMode is
exposure or control; queenPlacementAlternative is UCI. Exposure requires declared
queenAttack UCI (quiet nonchecking enemy minor move, legal after BOTH placements).
Control requires queenEntries exactly two distinct quiet enemy knight UCI moves
from the same unit, legal after BOTH placements. maxQueenPlacementNodes integer
0..50000 default50000, atomic cap over context and both complete panels. Optional
queenPlacementPanels {actual,alternative} admitted by independent legal replay.
Missing required history/parameters abstains; malformed/illegal supplied values
reject. Parent flags and budgets remain independent. No partial new witness/event
on exhaustion. Comments <=24 words; qualityClaim:false; priority188.8.

C0375: actual placement permits declared newly contacting enemy minor attack;
alternative avoids that exact geometric attack. After attack enumerate EVERY own
legal response. Track the original queen through its own response. Every response
either removes original attacker's geometric contact or permits that same attacker
to legally capture the tracked queen with strictly positive threat-root-relative
nominal gain after capture and EVERY immediate own counterreply. Require live,
nonempty counter inventories, at least one queen-move evasion and at least one
certified queen loss. A persistent contact with no legal capture is a refutation,
including counterchecks/pins. Full legal capture/response/counter inventories and
failed attempts retained. Enemy move must create contact from its new square;
neither initial endpoint may check or be terminal. No fabricated side-to-move
position. This is a placement-specific avoidable threat, not forced queen loss.

C0379: actual queen geometrically controls both declared empty entry squares,
at least one newly versus root. Both legal entries by same enemy knight permit
same moved queen capture retaining gain>=1 and that queen through EVERY immediate
enemy counterreply, with live nonempty counters. Alternative fails at least one
identical legal entry. All other legal enemy replies explicitly retained outside
this conditional scope. Enumerate complete occupancy-independent enemy pawn
prepromotion route DAGs: straight/diagonal one-step and initial double-step,
ignore blockers/check/victim existence, stop before promotion. Neither square may
be attacked by ANY reachable enemy pawn square; require an enemy pawn so this is
not empty-army weakness. Reuse E070 route semantics, new generalized support query
implemented prospectively because frozen E070 graph function is private. Separate
verifier enumerates reachable nodes by rank-distance/file-distance and verifies
edges independently. No claim about promoted pawns, other pieces, future queens,
all enemy replies, lasting weakness or whole-position domination.

Raw collection snapshots true histories, legal inventories, material and terminal/
fifty/threefold flags; any visited claim state suppresses new findings globally.
Collection retains all selected capture attempts and every counter, without early
failure pruning. Independent verifier/checker imports no collector/detector/policy
and reconstructs inventories, exact costs and conditions using shared Chess rules
(shared-rules limitation disclosed). Existing E088/E022 concepts guide threat
semantics but their artificial initial-turn frame/early failure pruning cannot
supply this contract. Reuse only exactly hash/source/input/history/budget compatible
raw panels. Source binding includes complete parent build and recursive static/
dynamic imports; normalized text, exact binary bytes.

Prospective authored roots: exposure White Kh1 Qd1 Pa2 versus Black Kh8 Nb8 Ph7,
Qd4 versus Qd2, enemy Nc6. Control White Kh1 Qd1 Pa2 versus Black Kh8 Ne8 Pa7,
Qe5 versus Qd2, Nd6/Nf6. White and reflected black positive/negative checks,
noncontact alternative, independent recapture defender, pawn-route-supported
square, both-successful alternative, claims/terminal/budget/history/strict input,
disabled equality and independent witness mutations. Archive failed hypotheses;
append dated amendments before changing fixtures, never relax proof gates.

Cheap smoke first, focused checks plus two E161 representatives and <=20-case
guarded authored pilot, independent saved replay. Target seconds, no expensive
engine/tablebase or real games. Retain sufficient losslessly compressed raw
evidence (500KB soft target, document overrun), eligibility receipts, commands,
runtime, revision, exact sources and hashes. Full cumulative regression, exhaustive
occurrence/priority/absence/history/budget audits and changed main/repeat/initially
clean reproductions deferred to combined freeze. Real-game precision and teaching
usefulness unresolved. Accepted tracker/production/numerical research unchanged.
