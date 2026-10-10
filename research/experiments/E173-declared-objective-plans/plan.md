# E173 — explicit objectives and complete short policies

2026-10-10 prospective build-stage study; parent E172 360bd26. Authorized current
main checkout, research-only local commits, no push. Follow BUILD-FIRST.md:
focused development checks and cheap authored synthetic pilots, combined final
validation later. Preserve all original concepts and accepted evidence.

Queue entries C0517 plan formation, C0518 short-term plan, C0519 long-term plan,
C0520 strategic objective (ranks 385–388) are considered together. Three narrow
observable candidate scopes are registered below. C0519 remains unavailable:
a three-ply policy cannot establish a long-term plan, player intent, durable
strategic value or educational usefulness. Do not emit a long-term label, count
that entry as code-ready, or silently replace it with a short policy. Later work
needs an explicit longer-term objective/policy, suitable history or declared
intent, and an independently justified strategic assessment/validation budget.

## Registered interface and distinct claims

Default-disabled `planTags` wraps E172 exactly. Required genuine `history`,
`planObjective:{kind:'rook-seventh-rank',unit:<own rook root square>}` and
`planAlternative`, a distinct legal quiet nonchecking move by the same unit
making the actual first move. The objective's tracked rook need not make the
first move: another own unit may clear its route. Actual first move must be
noncapture/nonpromotion/nonchecking. Objective schema is exact; unsupported
objective types are prerequisites, not inferred intentions. Malformed supplied
controls and illegal actual/alternative roles reject; missing inputs abstain.

`planPlies` integer 1–3, default 3, includes the supplied first move. Remaining
search starts on the genuine opponent turn with H−1 plies, without fake turns,
null moves or manual piece removal. `maxPlanNodes` integer 0–50000, default 50000.
Optional complete `planPanel` must be semantically admitted. Historical terminal
roots abstain. Any visited repetition/fifty-move claim suppresses own labels.
Atomic budget exhaustion drops own events/witness, preserves parent and records
limit+1. No event asserts a best move or quality; `qualityClaim:false`, priority
190.9 and at most 24 words per comment.

Objective: the originally identified own rook remains alive and reaches the
actor-relative seventh rank at a live endpoint. Original rook identity is
tracked through moves and captures; another rook or a promoted replacement
cannot satisfy it. Check at an endpoint is permitted, game termination is not.
The goal is an inspectable board objective, not proof that seventh-rank entry
is useful or strategically best. Root already satisfying it abstains.

- C0520: the explicit rook-entry objective has a complete bounded legal policy
  after the actual first move. A direct first-move achievement may emit this
  alone, distinguishing objective achievement from a multi-action plan.
- C0518: C0520 plus the objective is still unmet after the actual first move,
  and the complete policy requires a later own action after every enemy reply.
  This is an observable short policy, without a claim about private thinking.
- C0517: C0518 plus the paired quiet same-unit alternative lacks such a complete
  policy at the identical objective, horizon and history. This certifies that
  the supplied first move establishes the bounded route in that comparison;
  it does not establish when the player formed a plan.

## Proof and reuse

Reuse maintained Chess legal history/material/terminal utilities and parent
behavior. E021 already detects static seventh-rank rook placement, while E156
compares equal pieces against a capture objective; neither discharges this
identity-bound complete future policy and first-move comparison. Do not recreate
those detectors or transfer their labels as evidence for this claim.

Build a bounded objective-query tree with exact deterministic UCI order. On
actor turns, success needs one legal successful child; failure retains every
legal failed child. On opponent turns, success retains every legal successful
child; failure retains a legal defeating child. Every visited node retains its
complete legal inventory, exact FEN, remaining horizon, original-rook identity,
terminal/claim flags and goal truth. Goal, terminal and horizon leaves are
explicit. Record all visited search ticks, including unsuccessful branches
inspected before a selected proof child, so budget and claim suppression cannot
be hidden by proof pruning. Count history reconstruction and all query work.

An independent saved semantic replayer reconstructs history, original identity,
legal inventories, full deterministic exploration, terminal/goal states, material
where retained, claim exposure, costs and three separate event gates. It imports
no detector, collector, context or derivation. Bind the full normalized recursive
dependency closure and parent build. Reuse observations only when full root,
history, move pair, objective, horizon, collector closure and receipt match.

## Unqueried authored hypotheses and checks

White Kb1 Ra1 Ba2 versus Black Kh8, White to move. Bb3 clears the original rook's
file and should permit Ra7 after every Black reply within three total plies;
Ba3 leaves that route blocked and should fail. Objective is original Ra1 entering
the seventh rank. Hypothesis, not an observed result. A Bc4 alternative also
clears the route and should withhold only the comparative formation label.
Direct Ra7 from a root without the bishop should emit objective achievement
alone. Adding a Black rook on a8 may allow capture of the tracked rook after
clearance, defeating the complete policy. Preserve all failures, and append
dated amendments before any adaptive fixture/hypothesis change.

Use at most 20 authored pilot cases, both colors, with exact history-derived
reflected counters. Guard D001 test admission and retain its receipt. Smoke
first, then strict/missing/disabled/horizon/identity/terminal/history/draw/budget
checks, representative positive and separating negatives, independent proof
mutation checks, two E172 parent representatives and independent saved replay.
Retain every pilot case; record abstentions separately. Soft evidence target
500KB, not an acceptance gate. No engine, tablebase, new real games, human review
or confirmation evidence. Source verification and diff checks before a coherent
local result commit. Accepted tracker and production remain unchanged.

Full cumulative regression, exhaustive original-occurrence/absence/priority/
history/budget audits and changed main/repeat/initially clean reproductions are
deferred to the combined freeze. Broader strategic planning, long-term validity,
real-game precision and teaching usefulness remain explicitly unresolved.
