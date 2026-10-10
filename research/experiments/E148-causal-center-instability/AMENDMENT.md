# E148 terminal collapse hypothesis and fixture correction

2026-10-10 after initial two-root smoke, before corrected-root evaluation.
Advance hypothesis passed; original Bxe6/...Kh7/Bxd5 hypothesis failed: after
removing the last two enemy pawns, only K+B versus K remains, so the actual
capture is insufficient-material draw and must not have a material certificate.
Preserve complete original raw panel/result/source hashes and original fixture
source snapshot in evidence/terminal-hypothesis-failure.json. No gate relaxation.

Prospective corrected example adds own Pa2 to keep the final board live; all
central pawns, support relation and recorded moves unchanged. Retain original
failed example and its color reflection as explicit negative pilot cases.
Pilot becomes14cases rather than12; these tiny material ledgers remain cheap.
No claims of strategic compensation or terminal material gain are introduced.

Changing fixtures invalidates literal full fixture-source equality. Reuse the
two original smoke panels only with audited unchanged collector dependency
hashes, exact original fixture-source snapshot hash, and identical serialized
root/history/source-square keys. New Pa2 roots are genuinely collected once.
Document this input-extension audit rather than relabeling an unchanged full
source hash or repeating unchanged observations. Preserve all original failures.

After initial focused/pilot/replay passed, review exposed a V1 terminal-ledger
defect: the refused K+B/K capture still listed mechanical Chess moves after its
automatic draw. No positive material certificate was granted, but these are not
game continuations. V2 closes terminal/claim positions before generating replies;
terminal variants have empty continuation inventories. Preserve V1 observations
and exact collector/fixture source snapshots in terminal-ledger-amendment.json.
Legacy admission is explicitly diagnostic-only; runtime rejects V1. Recollect
all eight tiny final panels because collector semantics changed, rather than
claiming the old full source binding remains compatible. Initial smoke reuse is
historical only. Re-run focused affected checks and final saved pilot/replay;
no cumulative tests or engine work. Material/center claim gates unchanged.
