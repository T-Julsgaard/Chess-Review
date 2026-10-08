# E080 prospective pawn-shield defensive benefit

2026-10-08. Preregister before implementation or position evaluation. Finish
the approved rank-27 Pawn shield dependency after completed E079; original
contexts C0226 (pawns protecting the king) and C0400 (king safety vocabulary)
share compatible proof inputs but require explicit separate tracker gates.
Existing cover-pawn geometry alone is partial. Do not copy a checkmark into
C0227 Pawn cover, shield destruction, king shelter or enduring safety contexts.
Preserve all strategic, wedge, reciprocal and bishop-liberation prerequisites.

## Bounded claim

Research-only opt-in pawnShieldTags wrapper on frozen E079 parent. Actual move
must be a legal noncapturing, nonpromoting pawn advance, neither root nor played
position terminal, neither root actor nor played enemy king in check. Own king
stays on c/e/g of the actor's home rank. Complete before/after inventories define
cover as own pawns at most one file away and one or two forward ranks from that
king. Moved pawn must occupy this cover region before and after the advance.

Reuse E027 turnBoard's explicit hypothetical opponent-turn snapshot of the
before board (clear en-passant when changing turn); this is a threat model,
not an actual legal pass, a prior played move or historical game state. Save
the snapshot and full actual input history separately. Frozen E029 query and
independent replayQuery establish an opponent mate in one on that snapshot and
the absence of every opponent mate in one after the actual move, preserving
actual after history. A one-ply positive proof may select one complete mating
continuation; the after negative proof must cover every legal opponent move.

Require a direct causal obstruction: the chosen hypothetical mating move is
by enemy Q/R/B and captures the original cover pawn on its from square, the
new pawn square lies strictly between that slider's origin and destination,
the old ray is clear, the same slider remains on its original square after
the move, and the corresponding capture is now illegal because the new cover
pawn blocks that ray. Retain complete ray cells, blockers, actual transition,
root legal moves, both full cover sets, both kings and original histories.
Verify actual mating endpoint/checkmate, rather than infer it from attack shape.
If the solver selects a different winning move lacking this causal witness,
abstain; do not scan/reorder roots after exposure merely to obtain a label.

Candidate wording: Pawn shield: g3 blocks ...Qxg2#, with no immediate mate remaining.
This is an untested template, not a verified example. Text <=24 words,
qualityClaim false, no good/best/unique/whole-game/enduring-safety inference.
Add one pawn-shield-defense event at priority 155; inherit every previous
event/priority and keep higher warnings selected. Default disabled returns
exact E079. No implicit enabling of old support, mate or defensive search flags.

Strict new boolean default only undefined to false. Enabled maxPawnShieldNodes
safe integer 0..50,000, default only undefined to 50,000. Atomic exhaustion drops
all new proofs/events and preserves exact parent text/selection. Count one unit
before each root load, history ply, root legal query, actual transition, each
full inventory, each full cover extraction, hypothetical turn conversion, ray
enumeration and witness attachment, plus every frozen query budget tick.
Independent replay computes the fixed wrapper units separately; frozen query
ticks equal each proof node visit plus each nonterminal legal-move enumeration
plus each traversed edge. Save work status and exact node count. No source
search budget or depth changes; explicit foundation refusal is not applicable.

## Prospective gates and retention

Both colors, king c/e/g, file-reflected slider routes, Q/R/B candidates where
legal, one/two-square pawn advances and actual history require positives or
retained inability to meet coverage. At least Q and one other slider family
must have independent positive mechanics before either occurrence advances.
Every chosen home-king file requires positive proof; no forced coverage.
Represent outside-cover and already-protected pawns, unchanged geometry with
another remaining mate, no old mate, non-slider mate, selected old mating move
not blocked by this pawn, extra distant pawns, captures, promotion, nonpawn/
king/castling moves, checking moves, pinned slider/pawn, intervening blockers,
root/actual mate/stalemate/dead/repetition/clock termination, valid/malformed/
mismatched histories and FEN/UCI, strict null/nonboolean/fraction/negative/
over-limit budgets, zero/exact/one-less budget and disabled compatibility.
Retain all failed roots; add corrected roots instead of deleting or weakening.

Independent replayer must not import new detector/cover/ray predicates. Derive
cover and scalar ray geometry separately, reconstruct root/played/history/
hypothetical snapshot and exact expected inherited result, use frozen E029
replayQuery for complete semantic tree verification. Tampered cover omissions,
ray omission/blocker, king/pawn identities, snapshot/history, illegal mating
edge, missing after reply, leaf state, nodes/status/event/text/priority/quality
and selected comment must fail. Codec forgery with recomputed hashes must
still fail semantic replay. Decode E079 inherited proof pool with its retained
independent decoder where applicable; do not mistake references for full trees.

D001 preflight and guarded loader before inputs in every runner/test/probe.
No external positions/games acquired. Authored synthetic evidence is exposed
development mechanics, not independent real-game precision or usefulness.
Cheap pilot and focused tests before expensive collection; final full cumulative
coach regression/source/diff before freeze, three exact main/repeat/initially
clean detached reproductions and independent saved replay remain mandatory.
No frozen input/HEAD mutation during live decisive runs. Preserve all 5,190
ordered E079 fingerprints, original list hash and every unrelated tracker row.

Estimated cumulative run 900–1,100s based on E079; aim around 8MB canonical
evidence using existing simple lossless representation. These are soft planning
targets under the user-approved practical minimization policy. Record actual
bytes, significant optimization cost and any justified overrun; never prune
cases/branches/history/fields/failures/provenance to meet a byte target. Keep
decoder/version/hashes and immutable accessible retrieval/rebuild instructions
if repository storage becomes impractical. No E079 policy-only rerun.

Use the existing isolated branch and reusable detached checkout only. Shared
main contains completed E079; unfinished E080 stays isolated. No extension,
agents, push, numerical resumption, usage cutoff, shutdown or automation revival.

Next: implement the bounded wrapper and independent witness replay, then author
guarded positive/negative pilot without changing these acceptance requirements.
