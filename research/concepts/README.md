# Coach concept catalog and scheduling review

The user approved the ordering and support-routing recommendations on
2026-10-08. [ACTIVE-QUEUE.md](ACTIVE-QUEUE.md) is the current scheduling policy;
the catalog and review documents below remain the unchanged E074 snapshot.

2026-10-08 review, frozen at E074. This is vocabulary/progress metadata only: no games were loaded, no empirical experiment ran, no extension behavior changed and the paused research goal was not resumed. The active experiment schedule and original trackers are untouched.

| Item | Count |
| --- | --- |
| Original occurrence rows | 1085 |
| Fully identical duplicate groups | 54 |
| Redundant separate rows merged | 66 |
| Cleaned working rows | 1019 |
| Original verified occurrences | 356 |
| Original verified names | 307 |
| Original partial occurrences | 76 |
| Original unimplemented occurrences | 653 |
| Outstanding original occurrences | 729 |
| Outstanding working rows | 690 |
| Fully mechanically verified working rows | 329 |

These are different denominators. A working row may contain multiple original occurrences with different scopes/statuses. Merging rows does not verify any missing scope, change scientific results, or establish real-game precision/human usefulness. It does not justify rewriting the historical 32.8% progress measure.

- [Confirmed duplicate merges: every removed separate row](DUPLICATES.md).
- [Complete cleaned working list, with every original ID and scope](CATALOG.md).
- [Proposed fixed easier-to-harder order and batching](ORDER.md).
- [Nonduplicate removal/reclassification suggestions only](REMOVAL-SUGGESTIONS.md).
- [Machine-readable lossless mapping and queue](catalog.json).

## Conservative method and validation

Merge only identical full bullet text, ignoring solely line endings and the common bullet prefix. Keep the earliest ID as a working key and retain every occurrence’s category, exact text, status and tracker scope. Same name with a different definition stays separate. All 1,085 original IDs appear exactly once in catalog.json; every one of the 729 outstanding IDs appears exactly once in the proposed work mapping. There are 54 merged groups and 66 removed separate rows, with no nonduplicate deletion. Source verification and diff checks apply to these retained documents.

The machine-readable metadata records source hashes so this snapshot can be checked independently. Do not silently refresh these files while research runs or make them a second authoritative evidence tracker. After scheduling approval, update the actual routing at a safe boundary, preserving frozen IDs and all acceptance gates.

Original list SHA-256: `a7b06b6f9530b8c894471f32eeaea49c8ef340deb40e215e7f065967016a1bdd`.

E074 tracker SHA-256: `d929648b87055ff1e8c51754e23966bd4706ec88a45f85d3feaf99e6e18576e1`.

Source list: [original CONCEPTS.md](../experiments/E020-coach-concepts/CONCEPTS.md). Status source: [frozen tracker](../experiments/E074-french-scheveningen/evidence/concept-status.md).
