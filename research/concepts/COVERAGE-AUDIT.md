# Canonical duplicate coverage audit after E074

2026-10-08. Generated metadata audit against the latest complete canonical
tracker, not the catalog snapshot's stored statuses. Reproduce with
`node research/concepts/audit-queue.mjs`; the retained hash-bound output is
[coverage-audit-E074.json](coverage-audit-E074.json).

All 1,085 original occurrences appear once, with exact original text and current
scope. All 54 duplicate groups contain byte-identical entries after line-ending
normalization; 66 redundant working rows were merged. Twenty groups have all
occurrences verified; 34 have all occurrences pending. **No group has both a
verified and a pending occurrence**, so this audit offers no compatible missing
context to discharge by copying existing proof. No tracker status changes.

The filtered queue has 690 working rows covering 729 outstanding original
occurrences. Phase 6 retains 124 support rows separately. Same-name entries with
different text remain separate, including C0020 material inventory and C0547
material in position evaluation. Their different scopes are not interchangeable.

The adopted E075 batch is ranks 1–8: C0001, C0002, C0016, C0017, C0020,
C0030, C0031 and C0547. Its plan distinguishes objective mechanics from broader
evaluation. Material-imbalance rows beyond rank 8 are retained for subsequent
work; sharing vocabulary or code does not automatically verify them.

This audit loads metadata only, never games or model outputs. It validates the
full original-ID mapping, exact duplicate membership and deterministic ranks,
then filters pending work against the latest tracker. After future studies,
rerun against the new canonical tracker rather than modifying frozen results.
