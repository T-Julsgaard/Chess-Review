# E122 — forced pawn replies and irreversible pawn holes

2026-10-10 preregistration, approved build-first parent E121. C0916 inducing pawn
moves and C0910 permanent weakness. Prior E114 pawn-rank invariant and E116
all-reply entry inform proof methods; new causal forcing policy not their labels.

Default-false forcedPawnTags; maxForcedPawnNodes safe integer0..50000 default50000.
Disabled exactly E121; atomic new budget exhaustion preserves parent findings.
Legal live actual/history, no castling rights. Quiet nonpawn/nonking actual mover.
Actual postboard must have legal replies and ALL are pawn moves (captures and
promotion count as pawn moves). Fresh postframe restoring only moved unit to
its old square, same turn/clocks, clear EP, must be legal and permit at least one
nonpawn reply. C0916 then states exact causal forced pawn response, not intent.

C0910 stronger selected-square policy: enumerate initially empty squares on
files c-h/ranks3-6 and stationary own knights in square order. Every actual reply
must leave target empty, abandon direct pawn control of target (reply pawn
attacked target before moving), and leave ALL enemy pawns beyond the rank from
which an enemy pawn could attack target. Black pawn ranks must all be <=target
rank; White >=target rank. Since pawns never retreat or reappear, this proves
permanent absence of enemy pawn control, including after captures/promotions.
Same own knight must then have legal quiet nonterminal entry to target after
EVERY reply, with no immediate legal enemy capture of it. Complete response lists
retained. This proves irreversible pawn-cover hole with immediate safe entry,
not permanent knight occupation/safety, full strategic weakness or lasting value.

Retain complete actual/restored legal inventories, target/knight candidate order,
failed branch prefixes, exact pawn inventories and immediate captures; stop first
successful candidate. Independent checker reconstructs everything using neutral
Chess legality; no candidate import or new engine. Focused both-color positive/
negative, nonpawn defense, no causal restoration, unsafe entry, retained pawn
control, missing knight, history, strict/disabled and atomic budget. Small guarded
synthetic pilot plus source/diff checks; no full cumulative historical runs.

D001 test preflight passed before plan. Register before evaluation. No acquired
games, labels or production. Defer exhaustive scope/integration/priority/history/
absence/budget audit, combined regression, frozen main/repeat/clean and real-game
precision/usefulness. Structural long-term quality remains an explicit prerequisite.
