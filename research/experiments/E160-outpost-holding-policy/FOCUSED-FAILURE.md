# E160 focused runner failure

2026-10-10. Corrected smoke passed and collection produced12 complete panels,
six exact smoke reuses and six reflected fresh panels. Focused tests then failed
at file level before any named test result was emitted. Do not interpret this as
passed checks, a chess-policy counterexample or a code-ready batch.

Commands attempted, all terminal with failure:

1. npm run research:coach-tests -- E160 — file failure,93.4seconds, dot reporter.
2. node --test '--test-name-pattern=strict controls' research/experiments/E160-outpost-holding-policy/code/holding.test.mjs
   —44.46seconds, fatal allocation failure around46.4MB old-space usage.
3. node --max-semi-space-size=1 --max-old-space-size=256 --test
   '--test-name-pattern=strict controls' research/experiments/E160-outpost-holding-policy/code/holding.test.mjs
   —same fatal allocation failure, including parent process failure.
4. node --test --test-isolation=none --test-timeout=30000
   '--test-name-pattern=strict controls' research/experiments/E160-outpost-holding-policy/code/holding.test.mjs
   —same fatal failure around40seconds. The timeout did not prevent failure during
   module setup. No run remains active.

Diagnostic excerpt: `FATAL ERROR: Committing semi space failed. Allocation failed
- JavaScript heap out of memory`. One process also reported
`FATAL ERROR: NewSpace::EnsureCurrentCapacity Allocation failed`.

Small metadata command could gunzip retained observations successfully:452,677
compressed bytes,20,956,005 uncompressed. Runtime reported4,320,894,976 free
physical bytes out of8,434,679,808; available committed virtual memory was not
established. OS process/memory inspection through CIM was denied; no escalation,
unknown process termination or host configuration changes attempted.

The full saved-panel loader parses all12 raw comparison trees before any named
test. That creates an avoidable memory peak, but the precise allocation failure
point is not yet instrumented. Next change loading/retention to process one raw
comparison at a time with hashes/receipts and complete semantic replay preserved.
Reuse the exact existing observations; do not recollect or lower response depth,
budgets, branches, material/support criteria or acceptance gates. Keep focused
checks small; avoid repeating whole-file attempts until the loader changes.
