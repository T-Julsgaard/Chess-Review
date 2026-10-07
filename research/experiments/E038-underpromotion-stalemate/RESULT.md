# E038 result: underpromotion and conditional stalemate resources

Research-only checkpoint. Usage cutoff and PC shutdown instructions are
cancelled; the automation was deleted. No extension integration or push.

Actual rook, bishop or knight underpromotion can be explained as avoiding
stalemate when the same-square legal queen promotion would stalemate, and the
played choice remains nonterminal or actually checkmates. A synthetic knight
example gives checkmate where queen promotion would draw. This establishes
the actual contrast, not general necessity of that piece or a forced win for
nonterminal underpromotion. Dead-material underpromotions refuse this label.

A conditional stalemate resource names the exact legal capture of the moved
non-pawn/non-king piece that would leave its owner stalemated. It never claims
the opponent must accept or that all replies draw. Refutation fixtures retain
a legal king escape; an explicit test establishes a nonterminal alternative
reply in a positive resource case. Immediate mate warnings retain priority.

Validation: 23 new tests, 1,043 cumulative tests, source verification and diff
checks pass. Main evaluates 948 authored/reflected cases: 916 with facts,
26 abstentions and six invalid moves refused. Maximum selected comment remains
19 words. Independent replay checks 1,491 event certificates, 72 mate queries,
4,131 reply/history edges and 8,260 response/terminal/fact leaves. Coverage is
216 verified names across 243 original occurrences, 89 partial and 753
unimplemented occurrences. All checked entries retain their exact scopes.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md) and
[results](evidence/results.json) retain legal moves, resulting terminal FENs and
alternate queen FENs. [Main](evidence/run.json), [repeat](evidence/repeat-run.json)
and [initially clean local checkout](evidence/clean-run.json) match every
normalized source and deterministic output hash at source revision `9af7cbf`.
All three runs took about 51 seconds. Total retained evidence passes the 3 MB gate.
Metadata records exact source revision, command/config/environment and guarded
D001 receipt; no registered game is analyzed. Pilot: research/runs/E038/development.
Compact JSON retains all certificates.

No preregistered gates changed. Tests cover both colors, legal counterfactuals,
promotion type/terminal status and capture/FEN witness tampering. These claims
are synthetic verified mechanics, not measured real-game explanation precision
or human benefit. The stalled/forced-draw or best-defense questions remain open.

Next: E039 broaden further verifiable items in the original concept list, with
independent certificates and short comments. Keep numerical-rating research
paused, preserve all older evidence, and create only local commits.
