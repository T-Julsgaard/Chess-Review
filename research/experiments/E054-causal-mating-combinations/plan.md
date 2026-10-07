# E054: attraction, decoy and escape-blocking mating combinations

2026-10-07. Frozen E053, research only. No usage cutoff/shutdown, extension,
numerical-rating edits or push. Original list unchanged. Authored synthetic
E030/E043 seeds and new variations only; metadata definitions, no imported
external boards/games/FENs/sequences. Commit protocol before evaluation.

Opt-in namedDecoyTags defaultfalse exact parent. Requires existing decoyTags
and complete mateDepth2 mating-sacrifice evidence, with its independent causal
roles. maxNamedDecoyNodes integer0..50000 default50000 shared classification
budget; exhaustion drops ALL new labels, retaining parent facts exactly.
<=24 words, qualityClaim false; no best-move, intent or forced-acceptance claim.

Attraction combination: positive nominal sacrifice offer, every legal enemy
defense allows mate on the next own move, and at least one legal KING capture
of the offer changes its square so the SAME before-legal nonmating move mates.
Decoy combination: the same complete all-defense mating offer plus such a
king-attraction role or a nonking self-blocking role. Pure defender-duty
deflection alone is insufficient for these particular labels.
Blocking combination: a nonking acceptance lands adjacent to its own king,
blocking a flight. Accepted branch and actual next own mate are legal; removing
ONLY that capturer from the final board permits a legal king escape onto the
formerly blocked square. This is an explicit artificial causal counterfactual,
not a claimed legal played removal. Accepted capture is conditional in text.

Retain complete frozen mating-decoy certificate once in each full result,
including all-defense mate tree and exact complete role set. New events refer
to that same-row parent event ID and store sorted eligible role keys, selected
role key, color, actual move/FEN and nominal cost. Do not duplicate bulk trees.
References require resolving the full parent proof; no standalone reference
may be accepted without it. Each named conditional acceptance must belong to
the all-defense proof. Independent replay revalidates the entire frozen parent
certificate, exact eligible roles/selected key, root legality/history/counters,
and exact short comment. It imports no detector helpers.

Cases king attraction, nonking self-blocking, combined self-blocking/deflection,
pure deflection without a self-blocking role, other valid mating offers without
causal roles, equal trade, no acceptance, missing mate helper, declined offer
escape/countercheck, full histories, disabled/exhausted prerequisite budgets,
wrong role or missing/foreign/tampered same-row proof, missing all-defense
branches and malformed/exhausted new flags. File/color reflections preserve
rights/history via the local E053 mirror conventions when needed.

Guard D001 test receipt before dynamic fixture import. Cheap smoke/sample,
cumulative E020–E054 tests, maintained-source and diff checks. Source committed
before main/repeat/initially clean clone; all three match exact revision,
normalized inputs, deterministic hashes and metrics. Saved independent replay,
exact ordered frozen E053 full-result hashes and unchanged original-list hash.
Use compact E053 demo cards linked to full certificates. Full retained evidence
below3MB; estimate ~170 seconds per full run, overlap three. Synthetic mechanics
only; real-game precision/human learning value unmeasured.
