# Current-capture defender correction

2026-10-10 after first smoke. Both-label and both separating-label cases passed
with 87/151/77 logical nodes. The added Be6 negative was rejected as illegal:
Be6 blocks Bc4–f7 rather than permitting Bxf7 followed by recapture. Preserve
original fixtures/runner/error and all three complete checkpointed panels under
evidence/initial-blocked-capture-hypothesis/. Before further query, replace only
that extra bishop with Black Be8: path d5/e6 is clear and Be8 may answer Bxf7
with Bxf7. Keep the expected withholding, non-loss threshold, history and all
proof gates. Collector/context source is unchanged, so reuse the three complete
positive panels. The old Be6 input remains an illegal-input regression.

Before focused checks, register a separate current-resource isolator: White Bc2
instead of Bc4, remove White Pe4, Black Pf5 instead of Pf7; same four history
moves and comparators, current Bxf5. Hypothesis both historical quality contrasts
still pass, but recapturing Rg5 now answers Bxf5+ with Rxf5, defeating current
resource preservation. This tests the shared current gate independently of
historical quality failures. Retain the original Be8 pilot negative too; no
gate, non-loss threshold or registered pilot case is replaced.

Final interface review found the witness used the caller's FEN spelling for
`before`, although parent/history admission normalizes FEN. Bind that endpoint
to the canonical recorded recapture endpoint and require equality with the
parent's before/after. Add a whitespace-alias input regression. This does not
change any legal query, policy gate or cached raw panel; existing canonical
fixtures and archived witnesses retain exactly the same semantic endpoints.

The added FEN-alias check failed: E020 preserves caller FEN spelling in `before`
(line212), rather than normalizing that returned field. Archive the failed log,
source variants and complete dependency bindings under evidence/failed-fen-
normalization-assumption/. Correct the mistaken interface assumption: retain
caller spelling in witness/parent `before`, independently verify its canonical
position against the recorded recapture endpoint, and keep the new before/after
parent equality guard. Revise the regression to assert BOTH representations
explicitly. No legal proof or label gate changed; existing raw remains reusable.
