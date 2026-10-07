# E035 result: opening development history

Complete development-mechanics checkpoint. No extension integration or push.

The prototype adds first minor development, development accompanied by check,
repeated original minor moves while another remains unmoved, early first
queen moves with fewer than two developed minors, and completion of all four
surviving original minors off the back rank. Comments describe counts and
history; they do not infer good squares, wasted time or strategic benefit.

All labels require complete legal history from the orthodox starting setup
(also its rank/color-reflected synthetic counterpart), with identity tracking
through captures. Opening labels stop after ten own turns; early queen labels
stop after eight. FEN-only and partial histories abstain. Existing tactical
warnings remain higher priority. A captured minor cannot count as developed;
a return to the home rank cannot count toward current completion.

Validation: 30 new tests, 960 cumulative tests, source verification and diff
checks pass. Main evaluates 878 authored/reflected cases: 848 with facts,
24 abstentions and six illegal moves refused. Maximum selected comment is
19 words. Independent replay checks 1,383 event certificates, 72 mate queries,
3,387 reply/history edges and 5,284 response/terminal/fact leaves. New tracker
has 206 verified names across 228 original occurrences; 90 partial and 767
unimplemented occurrences. Avoidance recommendations remain partial.

[Demo](evidence/demo.html), [tracker](evidence/concept-status.md),
[results](evidence/results.json) and [main run](evidence/run.json) retain exact
source revision, normalized inputs, outputs, environment, command and guarded
D001 eligibility receipt. No D001 game is analyzed. [Repeat](evidence/repeat-run.json)
and [initially clean local checkout](evidence/clean-run.json) match every
normalized input and deterministic output hash at source revision `137910c`.
Main and clean runs took about 38 and 39 seconds; retained evidence is under
3 MB. Exposed pilot used research/runs/E035/development.

No changes to preregistered gates were required. Two additional exposed
controls test captured-minor counting and expiration of the opening window.
Checking development denotes mandatory response to check, not net tempo gain:
the opponent can sometimes develop while answering. No real-game explanation
precision, human learning benefit or overall development advantage is proven.

Next: E036 broaden other short verifiable concepts from the original list.
Continue actual 300-minute usage monitoring. At about 10% remaining preserve
completed work, commit it, record the resume state, disable the existing
heartbeat and execute authorized normal shutdown without force-closing apps.
