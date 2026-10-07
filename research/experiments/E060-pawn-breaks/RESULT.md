# E060: pawn breaks with legal next-turn witnesses

2026-10-07. Research only; numerical goal paused, cutoff/shutdown cancelled.
Original list unchanged. No extension integration, external games or pushes.

Opt-in pawnBreakTags adds three bounded pawn-break profiles. An actual straight
pawn advance newly challenges an enemy pawn ramming another own pawn: every
legal reply must preserve that own pawn and either vacate the blocker or permit
its legal capture by the breaker. An actual capture release leaves the other
pawn's forward square empty; ordinary captures replace the blocker, whereas
en passant can satisfy this rule. An escape captures a neighboring pawn out of
the mover's own ram. Release and escape require a legal straight single-step
after EVERY enemy reply, including all promotion choices when applicable.
No terminal branch qualifies. No advantage, best-move, intent, permanently
open position or forced promotion claim. Exhaustion drops all new events;
default-disabled result exactly matches frozen E059.

Independent replay reconstructs strict full history, before/after pawn
identities, actual move and captured square, every enemy reply and complete
legal capture/advance subsets. Pinned pawns and checking replies are handled
through legal moves. Selected examples:

- “Pawn break: d4 challenges e5's blockade of e4; every legal reply vacates e5 or permits capturing its pawn next turn.”
- “Pawn break: dxe6 removes e5's blocker; pawn e4 can advance straight after every legal reply.”
- “Pawn break: exd5 escapes e5's blockade; pawn d5 can advance straight after every legal reply.”

EXPOSURE.md retains authored errors and corrections. Both challenged blockers
must be pinned in the two-ram positive: capturing the breaker with either
unpinned blocker leaves the other ram without its witness. A rook cannot
capture through its own pawn. The simple challenge legitimately loses its
selected text to a hanging-pawn warning; preserve that warning and test the
selected challenge on an authored pinned-blocker position. Priority unchanged.
Actual/checkmating reply, repeated blocker, tracked-pawn loss, all four next-turn
promotions, legal EP history, disabled and shared exhaustion checks pass.

All 119 new tests and 2,663 cumulative E020–E060 tests pass. Maintained source
verification and diff checks pass. Full run: 2,440 cases, 2,342 with facts,
68 abstentions and 30 refused illegal moves; selected text at most 20 words.
Cumulative replay: 4,831 certificates, 288 queries, 14,879 reply/history edges
and 35,152 leaves. New classification 6,980 bounded nodes; no engine search,
numerical fitting or human-outcome measurement.

Main, repeat and initially clean local clone all use exact source 3e9a55e,
matching normalized input hashes, physical output hashes and metrics; 187–190
seconds each. Saved JSON independently reconstructs 40 new certificates on
36 positive rows: 28 challenges, eight escapes, four releases. All 72 legal
negative rows and four illegal moves checked. Complete evidence includes
272 reply references, 324 legal own move references, 64 vacated-blocker
references, 112 promotion references and four history plies. Capture, check,
renewed-blocker, ordinary replacement and actual/reply mates physically checked.
All 2,328 inherited full-result fingerprints match E059 in order; original-list
hash unchanged.

The planned <3MB evidence storage target FAILS: full evidence is 3,392,940 bytes
including repeat/clean manifests. Keep every proof rather than silently drop
cases or claim this resource target passed. Frozen E053 compact demo is used;
the 112-case board/card HTML accounts for 919,255 bytes and full JSON for
2,253,683. This post-run storage deviation changes no chess predicate, source,
fixture, certificate or verification result. Future runs should budget their
display cost prospectively or improve presentation independently of proofs.

Coverage: 285 verified names / 325 original occurrences, 76 partial and 684
unimplemented occurrences. New name Pawn break within the three stated scopes.
Human teaching benefit, real-game precision and extension readiness unknown.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [clean](evidence/clean-run.json).
Reproduce: `node research/experiments/E060-pawn-breaks/code/run.mjs --out research/runs/E060/reproduction`.
Guarded D001 test receipts retained. Work continues in the isolated checkout;
the shared checkout stays untouched.

Next: E061 investigate Closed file from the original list. Verify exact pawn
occupancy and an actual rook/queen's legal file access with captures and blockers
retained. Distinguish a currently pawn-blocked file from permanent restriction,
strategic inferiority or a general closed-position claim. Budget full evidence
and board/card HTML explicitly before its decisive run.
