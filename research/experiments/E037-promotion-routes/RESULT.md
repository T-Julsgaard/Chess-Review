# E037 result: verified promotion routes and rule of the square

Research-only checkpoint. The user revoked the usage cutoff and PC shutdown
instruction on 2026-10-07; its automation was deleted. Continue concept work
without that cutoff. No extension integration or push.

The opt-in promotionDepth profile searches 1–6 remaining own pawn pushes,
preserving every legal defender response and supplied history. Every successful
route ends in queen promotion that either checkmates or survives all immediate
responses with positive nominal material gain over the position after the
actual move. It does not promise a whole-game win. Profile zero preserves the
inherited behavior. A shared 50,000-node ceiling drops all new route claims on
exhaustion, including an earlier complete candidate.

The rule-of-square label requires bare K+P versus K, a conservative
promotion-square king-distance/tempo gate and an independently verified route.
It does not classify all inside-square cases or use distance alone. Starting
rank double-step ambiguity is excluded from this label; legal route search
still supports the first double push. King-supported promotion can be proved
without receiving the square label. Promotion races remain deferred.

Validation: 31 new tests and 1,020 cumulative tests pass, plus source verification
and diff checks. Tests include both colors, legal double push, blocked/caught
routes, promoted-queen capture, stalemate, short/zero/exhausted budgets, later
candidate exhaustion, history matching/restoration and tampered proof trees.
Main evaluates 928 authored/reflected cases: 896 with facts, 26 abstentions,
six invalid moves refused. Comments remain at most 19 words. Independent replay
checks 1,455 event certificates, 72 mate queries, 4,119 reply/history edges and
8,222 response/terminal/fact leaves. Coverage is 212 verified names across 239
original occurrences, 89 partial and 757 unimplemented occurrences.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md) and
[results](evidence/results.json) retain exact route trees and safety leaves.
[Main](evidence/run.json), [repeat](evidence/repeat-run.json) and
[initially clean local checkout](evidence/clean-run.json) match every normalized
input and deterministic output hash at corrected source revision `f517982`.
Main/repeat/clean took about 48/46/47 seconds. The first pretty-printed retention
exceeded the 3 MB gate; the initial evidence commit mistakenly preceded handling
that failed gate. The runner now writes losslessly compact JSON. Replacement
main/repeat/clean evidence passes every hash comparison, and retained evidence
is 2,837,011 bytes. Parsed JSON is identical to the first retained report; demo
and tracker hashes are unchanged. This closes the retention correction.
Metadata includes
exact source revision, command, config, environment and guarded D001 receipt.
No registered game is analyzed. Pilot: research/runs/E037/development.

Plan addendum documents the explicit profile and conservative square gate
before implementation; exposed controls added stalemate, later-candidate
exhaustion and supplied-history restoration. These are synthetic mechanics,
not real-game explanation precision or measured human improvement. A full
promotion-race comparison still needs both sides' legal routes and checking
promotions. No race coverage is claimed.

Next: E038 broaden further independently verifiable original-list concepts,
including promotion-race feasibility, underpromotion tactics or positional
transitions with exact witnesses. Keep research-only scope and local commits.
