# E045 result: pawn-supported named terminal mating patterns

Research only. Usage cutoff and shutdown cancelled. Extension and numerical
rating research remain separate; no push. [Sources](SOURCES.md) provide
terminology metadata only; no source games, positions, move sequences, diagrams
or evaluations were imported into fixtures.

New opt-in supportedMateTags labels actual terminal Damiano, Lolli and Hook
patterns. Every event requires legal actual checkmate and the sole checker to
be the unit on the played move's destination. The independent replayer executes
the move, checks zero legal replies, verifies every claimed piece and rebuilds
the support/flight roles. No forcing-sequence or castling-history claim is made.

Damiano uses the pawn form: queen h7 protected by pawn g6, enemy king g8/h8.
Lolli uses queen g7 protected by pawn f6 or h6, enemy king g8/h8. Both accept
color/rank reflection and horizontal file mirror. Broader bishop, pawn-cage or
historical-sacrifice variants remain outside this exact profile. Hook requires
adjacent rook check outside a corner, pawn protects knight, knight protects rook
and controls a vacant flight outside rook coverage, plus an adjacent enemy
blocker. Full piece records, all matching knight flights and all adjacent enemy
blockers are retained. Pawn support is not claimed to be uniquely necessary.
Flight attack geometry uses an explicitly king-removed geometric board; actual
mate is separately checked legally.

Comments name the pieces' jobs concisely, for example “Hook mate: pawn g3
protects knight f4; the knight guards rook g6 and seals h5.” Default false
preserves exact frozen E044 output. The shared 50,000-node classification budget
drops all new tags on exhaustion and keeps inherited certificates. Settings,
support squares, helper types, king position, omitted flights/blockers and
history mismatch/terminal continuation have meaningful rejection tests.

Negatives include missing pawn or knight, missing blocker, bishop-supported
queen mate, knight-supported queen mate, wrong pawn rank and a central
pawn-supported queen mate. Several retain actual mate but receive no new named
label. The original authored h7-pawn Hook blocker permits h7xg6, refuting mate;
it remains an explicit negative. A different enemy knight blocker makes the
authored positive work without that capture. Initial corner queen placements
already checked the non-moving king and were refused; corrected starts do not.
An initial bishop blocked the intended queen route and an initial central mate
left flights open. These exposed fixture corrections are recorded in the plan;
no validation gate was weakened. Dedicated Lolli definition metadata justified
the preregistered h6 support addendum before decisive evaluation.

Validation: 72 new and 1,274 cumulative tests pass; maintained-source and diff
checks pass. Main evaluates 1,146 authored/reflected cases: 1,108 with facts,
32 abstentions and six invalid moves refused. Selected comments stay at most
19 words. Independent replay checks 1,973 event certificates, 140 mate queries,
8,671 reply/history edges and 25,650 leaves. New cases use 88 classification
nodes and no new mate-search nodes. Coverage reaches 250 verified names across
285 original occurrences, with 77 partial and 723 unimplemented. The three new
names retain the stated terminal subsets; the original list is unchanged.

Main, repeat and initially clean checkout match all normalized input hashes,
deterministic outputs and metrics at source revision c89cedc. Final runs took
101–108 seconds; clean working-tree status is empty. Separate saved JSON replay
verifies 28 new certificates: eight Damiano, sixteen Lolli and four Hook, with
four full support chains and eight flight witnesses. It also verifies four
legal pawn captures refuting the original blocker and 24 actual mates that
correctly receive no new label. Missing knight/blocker and wrong pawn rank
remain nonmates. All 1,078 inherited full-result hashes exactly match E044 in
fixture order. Retained evidence totals 1,649,246 bytes, below 3 MB.
[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json), [main](evidence/run.json),
[repeat](evidence/repeat-run.json), [initially clean checkout](evidence/clean-run.json).

Reproduce with `node research/experiments/E045-supported-mating-patterns/code/run.mjs --out research/runs/E045/reproduction`.
Saved JSON replay obtains guarded D001 test receipt and calls
`replay(row.fixture, event)` from code/replay.mjs for each damiano-mate,
lolli-mate and hook-mate event. Full new certificates are directly in JSON.
Pilot: research/runs/E045/development. Superseded pilot before the final added
negative is not used as decisive evidence. No registered game was analyzed.

Synthetic mechanics are verified; real-game explanation precision and human
learning benefit remain unmeasured. Next: E046 investigate Greco, Blackburne and Kill box mating patterns from
the original list, requiring
exact roles, legal terminal verification and meaningful negative controls.
Keep frozen records intact, production separate and commits local.
