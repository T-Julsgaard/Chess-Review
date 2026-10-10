# E172 — returning material to refute a bounded attack

2026-10-10. **Prototype; not accepted evidence.** Preregistered at c420980,
parent E171 fddc929. Current authorized main checkout; research-only local
commit, no push. Two separate occurrence scopes: C0474 finite initiative
neutralization and C0475 returning no more than the recorded sacrifice gain.

The default-disabled `materialReturnTags` wrapper preserves E171 exactly.
It requires genuine legal history, `acceptedSacrificePly` (one-based, 2–1000),
and a distinct quiet `returnAlternative` by the original accepting unit.
The recorded enemy quiet offer must immediately precede its capture; that
acceptance is the only capture from the offer through the current root, with
no promotions. The original accepting nonking/nonpawn unit must remain alive.
This attributes the nominal gain to the recorded capture without asserting
that the opponent intended a sacrifice.

The actual return is a noncapture check by that unit. Complete enemy mate
queries must fail within three plies after the return but succeed after the
quiet alternative. Every legal capture accepting the return is retained and
must lose material while leaving a live position without enemy mate within
two plies. C0475 additionally requires every acceptance to return no more than
the recorded gain and retain a nonnegative balance relative to the pre-offer
anchor. These are distinct gates; general initiative and cessation of longer
attacks are unresolved.

White Kb1 Qe2 Re1 versus Black Kh8 Ra8 Pf7 Pg7 Ph7, with history Qa2 Rxa2 Rd1,
records a nine-point Black gain. Rb2+ instead of Ra3 refutes the finite attack:
Kxb2 returns five points and retains four, whereas Ra3 permits Rd8 mate.
Offering a bishop instead records only three points; the same return neutralizes
the bounded attack but exceeds the gain, so only C0474 is emitted. With extra
White bishops on e4/e5, the attack persists after both Kxb2 and Bxb2; neither
label is emitted. Color-reflected cases pass with histories reconstructed exactly.

`maxMaterialReturnNodes` is an integer 0–50000, default 50000. Atomic exhaustion
discards this wrapper's witness/events and preserves parent behavior, recording
limit + 1 nodes. `initiativePlies` accepts integers 0–3; values below three
abstain because this registered comparison requires the three-ply bound.
Missing prerequisites abstain; malformed or illegal controls reject. Historical
terminal roots abstain, and any visited fifty-move/threefold claim suppresses
the labels. Priority 190.7, `qualityClaim:false`, comments at most 24 words.

Raw panels retain full history/configuration, offer and acceptance frames,
original capturer identity, pre-offer/accepted/current material, both complete
legal-response inventories, every accepting capture, endpoint states and full
E144 traced finite-query proofs. Logical work includes history reconstruction,
variant/acceptance work and query ticks. Independent panel reconstruction and
label/material replay import no detector, collector, context or derivation code.

Development evidence:

- 54 focused checks passed in 15.5 seconds, plus two representative E171 checks.
  Controls include exact/fresh exhausted budgets, genuine history prefixes,
  repetition, acceptance clock reset, a legal quiet suffix reaching a visited
  fifty-move claim, malformed inputs and 20 semantic witness mutations.
- Guarded D001-test authored synthetic pilot: 16 cases, six witnesses, four
  positive cases and six unique raw contexts. Final execution reused all six
  matching panels with zero fresh collection. White smoke supplied three panels;
  the corrected initial pilot collected only the three reflected counterparts.
- Independent saved semantic replay passed all cases/witnesses/panels, output
  hashes, policy receipt, inherited snapshots and 716 normalized recursive
  source/dependency hashes, including the complete parent build.
- Source verification and diff checks passed. No engine, tablebase, new real
  games, human review or locked confirmation was used.

Failed authored attack-persistence hypotheses and complete smoke outputs are
retained under `evidence/initial-extra-attacker-hypothesis/`,
`evidence/failed-single-bishop-hypothesis/` and
`evidence/failed-d-file-bishop-hypothesis/`. The single-bishop case correctly
supports finite neutralization because a pawn can capture that bishop and open
an escape square. All three archives are independently checked by focused tests.
The dated amendment records each prospective revision and the initial pilot's
reflected full-move-counter failure; no horizon or proof gate was relaxed.

Compressed observations/results total 19,157 bytes; total retained evidence
178,158 bytes before this result record, below the 500KB soft target. Standard
gzip decodes the JSON. Run `code/replay-saved.mjs` for semantic replay; cache
reuse binds exact history, move pair, acceptance index, horizon, collector/context
dependency closure and dataset receipt. Replaying saved proofs is distinct from
repeating the searches.

Accepted evidence remains E082: 378/1,085 entries (34.8%), 328 names. Build
coverage is separately 415 provisional pending entries across 92 ready batches,
zero stale; 793/1,085 accepted-or-candidate entries (73.1%), 292 without candidate
code. Narrow candidate scopes do not discharge broader original definitions.
Full cumulative regression, exhaustive occurrence/priority/history/budget audits
and changed main/repeat/initially clean reproductions remain deferred to the
combined freeze. Real-game precision and teaching usefulness remain unmeasured.

Next: preregister compatible plan-formation, short-term, long-term and objective
scopes C0517–C0520 (ranks 385–388), requiring observable policy/objective evidence
and preserving prerequisites for hidden player intent or enduring strategic value.
