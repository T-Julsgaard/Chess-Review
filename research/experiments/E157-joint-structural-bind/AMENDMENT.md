# E157 development amendments

2026-10-10 initial four-family smoke: the no-pin control passed, while three
pinned rows were refused by independent admission. Collector used Chess.get(s)
as though it included square; it returns type/color only. The independent
board-array pin checker correctly expected c5. No joint finding was admitted.
`evidence/failure-pin-metadata.json.gz` retains original smoke/error output,
all four full raw panels, receipt and original E157 source text/hashes plus full
dependency closure. One successful raw panel reused; rejected rows were collected
again solely to retain raw evidence lost when wrapper admission threw.

Before next evaluation, attach the known square explicitly when collecting pin
blockers. No legal query, pin geometry, scope, threshold, test or gate changes.
This changes collector bindings, so run a fresh tiny four-family smoke, retaining
the original failed observations. Reuse corrected hash-bound smoke panels for
the pilot. No broad or cumulative regression is justified by this metadata fix.
