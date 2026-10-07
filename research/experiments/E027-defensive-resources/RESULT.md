# E027 result and resume state

State: complete, 2026-10-07. Synthetic mechanics gates pass; educational benefit
remains inconclusive. Coach expansion and usage cutoff active; numerical
research stays paused. No extension integration or pushes.

Plan registered `78bfe2c`; evaluated source `b10319c`. Frozen E020–E026 remain
unchanged. The prototype adds immediate piece defense, active capture/check
defense, defensive pawn support, attacker removal, specified file/diagonal
blocks, king check escapes and certified back-rank luft.

The old threat uses an explicitly hypothetical opponent turn with en-passant
cleared. It must yield positive nominal gain through every immediate reply.
The actual played move then lets every capture of that same target be answered
without net nominal material loss. This concerns one piece over two plies;
countercaptures can meet that bound even if the original piece is traded.
It does not prove overall move quality or that all targets remain safe.
Luft additionally requires a legal new king step, an old back-rank mate witness
and no actual opponent mate in one afterward. A new step alone stays partial.

The [tracker](evidence/concept-status.md) has 140 verified names, 149 verified
occurrences, 76 partial occurrences and 860 unimplemented occurrences among
all 1,085 original list entries. Verification is limited to stated scopes.
[Demo](evidence/demo.html) contains 40 new authored/reflected cases; the 496
inherited cases are checked and fingerprinted in [results](evidence/results.json).

582 cumulative tests and source verification pass. All 536 synthetic cases
pass: 512 produce facts, 18 abstain and 6 refuse illegal moves. Selected comments
reach at most 19 words. 395 independent certificate/fact replay records cover
1,731 relevant reply branches and 2,962 material-response leaves. These include
direct line/king facts as well as finite tactics; they are not all gain proofs.
New E027 events total 135 across new and inherited fixtures, including 2 strong
luft witnesses, 22 saving-piece and 20 defending-piece events. Specific pin,
cross-pin and defender-removal comments survive competing general defense;
mate/draw/warnings retain higher priority.

Pinned recapturers, a second profitable attacker, capture mate, unchanged threats,
existing legal recaptures, attacked escape squares, nonadjacent pawn moves and
new escape with remaining mate reject the corresponding stronger claim. Budget
exhaustion removes finite/escape claims but retains legal line/king facts.
Independent replay rejects changed gain/baseline/target and missing/duplicate
capture, reply, king-step or mate witness coverage. See plan implementation notes
for the initial protected-rook and blocked-rook fixture discoveries.

Main, repeat and initially clean local checkout exactly match normalized source
and deterministic output hashes. [Main run](evidence/run.json),
[repeat](evidence/repeat-run.json) and [clean](evidence/clean-run.json) retain
revision, receipt, configuration, environment and hashes. Evaluation took about
15 seconds excluding eligibility, with about 1 MB retained evidence. D001 is
only the guarded eligibility dependency; no real games were used as samples.

Actual new scans replay supplied verified history; FEN-only inputs cannot infer
earlier repetition and parents keep their frozen limitations. Synthetic success
does not establish real-game precision, human teaching benefit or longer-term
material/safety. No engine or live game integration.

Next: E028 expands short named mating-pattern explanations with actual checkmate
witnesses and narrow, sourced geometry definitions. Keep actual 300-minute
usage monitoring: near 10% remaining checkpoint/commit, disable the cutoff
heartbeat and execute authorized normal shutdown without force-closing apps.
