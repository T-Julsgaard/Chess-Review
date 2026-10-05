# F001: retained evidence is usable; fifty test games are already consumed

Date: 2026-10-05. Track: measurement/datasets. Outcome: integrity audit passed;
no model-improvement claim. Maturity: development/retrospective inventory.

[E001](../experiments/E001-evidence-audit/RESULT.md) verified public input hashes,
cohort bindings, retained rating features and exclusions, and replayed B000.
The data contains 4,000 distinct player identities in 2,000 games; the retained
rating cohorts and existing game folds have no player overlap. These are bounded
artifact facts, not evidence of a uniquely correct accuracy scale or rating.

Two local SF19 studies evaluated fifty distinct test games after the public
provenance record was written. Their reports show failed gates and are now
preserved with selection IDs and hashes. Remaining test secrecy is unverified.
Use [D001's exposure ledger](../datasets/D001-public-baseline/README.md) rather
than treating a historic `finalTestEvaluated: false` flag as current authority.

Decision: use hash-verified training evidence for cheap development comparisons;
obtain newly registered untouched evidence before confirming any improved model.
Numerically replay the archived studies before citing their reported effect
sizes as verified. No promotion is justified by this inventory alone.

What changes this conclusion: a documented earlier exposure record changes the
consumption ledger; a reproducible integrity failure changes input eligibility;
new independently assessed data can support claims beyond development.
