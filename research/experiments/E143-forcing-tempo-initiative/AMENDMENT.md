# E143 saved-panel interface amendment

2026-10-10 after preregistration0e8c5ef, before implementation or evaluation.
To reuse bounded proof panels across smoke, tests, pilot and replay, split the
query collector from label derivation. Optional forcingTempoPanel supplies a
saved complete panel. It is not trusted: reconstruct legal history/inventory,
validate every proof with the independent mate-tree replay, recompute logical
query/claim traversal cost and enforce the SAME registered budget. No cached
success can replace semantic replay. Without a panel, collect once locally.
Bind collector/fixture/dependency source hashes in retained observations. Other
interfaces, claims, bounds and deferred gates unchanged.

After the initial authored smoke/cache validation: the no-counterattack negative
revealed 7,697 recorded search ticks versus 7,527 reconstructed from returned
trees. E029 legitimately discards failed search branches after finding a winning
choice; proof trees alone cannot reconstruct their cost. Version2 panels now
retain every query's FEN tick trace, including discarded exploration. Independent
replay consumes that trace in canonical legal search order, reconstructs returned
proofs and checks the exact cost. It does not search absent trace branches.
Claim contexts in discarded exploration also cause abstention. Preserve version1
failed ledger evidence under runs/E143; recollect only these six small authored
panels because the required observation format changed. No engine/tablebase run.
