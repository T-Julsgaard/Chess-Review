# E041: unique defense against immediate mate

Date: 2026-10-07. Research only; cutoff and shutdown remain cancelled.

Opt-in uniqueDefense boolean defaults false; shared maxUniqueDefenseNodes
integer 0–50,000. Preserve the frozen E040 result exactly when disabled. Use
frozen E029 history-preserving one-ply mate query with no engine or FEN cache.
The actual move must leave a nonterminal position and have a complete negative
enemy-mate-in-one proof. Enumerate every other legal move from the same legal
history; each must have a positive enemy-mate-in-one witness. Require at least
two legal moves, distinguishing tactical necessity from sole legal moves.

Emit a short unique-mate-defense comment with exact SAN, explicitly restricted
to avoiding mate in one. Do not claim overall safety, a forced win or best move.
All alternatives and every legal actual-position enemy move must be replayable.
Any negative alternative or budget exhaustion abstains. Terminal actual moves
and alternative terminal draws/mates must never fake uniqueness. Preserve mate,
draw and stronger inherited warnings in comment selection.

Authored synthetic positives, wrong played move, another safe move, extra
material defense, terminal, checking, history, zero/boundary budget, both colors.
Independent checker replays the exact alternative set, all negative actual
replies and each positive mate; tampering, omitted choices and illegal mates fail.
Track Only move/Forced move with the explicit immediate-mate-defense subset;
retain unrelated strategic/prophylactic intentions as unresolved.

Cumulative E020–E041 tests, source verification, main/repeat/initially clean
checkout at exact source revision, normalized input/output hashes, guarded
D001 receipt. No registered game analyzed, no extension or rating edits/push.
Retain compact lossless JSON under 3 MB; expected ~75 seconds per full 1,000-case
run, three overlapping runs. Smoke the new query and witnesses before main.
