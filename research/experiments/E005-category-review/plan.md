# E005: blinded category rubric and review workflow

Registered 2026-10-05 before selecting cases or collecting reviews. This is
instrument development, not a model comparison or a confirmed finding.
The user has authorized a review pack and will review later; work proceeds
without depending on a response tonight.

## Question and scope

Can reviewers describe consequential mistakes and exceptional moves using our
own concrete rubric, with uncertainty and reasons, before seeing any algorithm
label? Prepare 24 cases from approved D001 training games. One case per game,
deterministic hashed selection/order. No validation/test games or new searches.
The user is the first human reviewer; a single review is individual evidence,
not inter-reviewer agreement. Pending reviews are not validation.

Stratify eight cases each from: material concessions/offers with low engine loss,
substantial engine loss, and other low-loss controls. Selection uses SF18 retained
training context and board mechanics only; reviewers see no strata, engine scores,
labels, player identities, ratings, game outcomes or subsequent actual moves.
These enriched samples cannot estimate population prevalence or classifier
precision. Record all candidate counts and exclusions in the private key.

For concession selection, identify a played move after which an opponent has a
legal capture of a nonpawn mover-owned piece whose value exceeds the capturer,
or an actual material deficit created by the move. This is an offer heuristic,
not proof of sound sacrifice; en passant, pins and tactics can defeat it. Verify
legal moves/history and require at least two legal alternatives. Low loss <=0.02
expected points; substantial loss >=0.10. Exclude mate-root and terminal cases.
Hash seed E005-case-v1; reserve one game across strata, concessions then losses
then controls, and use a separate E005-order-v1 hash for presentation.

## Instrument and evidence rules

See the [rubric](rubric.md). Record ordinal consequence, exceptional-move
perception, confidence, instructional usefulness, reasons and an abstain option.
Present a board before/after the focal move and full preceding SAN history, with
FEN available. Let reviewers analyze independently; no engine answers in the pack.
Local progress must persist and export with case/pack/rubric identity; allow
partial work. Initial labels are development annotations, never hidden truth.

At least two independent reviews of the same blinded cases are required before
agreement analysis. Preserve disagreements; adjudication is a separate version,
not replacement of original labels. Future candidate comparison needs a new
predeclared protocol, frozen algorithms, independent annotation and confirmation
cases. No quantitative improvement gate is asserted for this workflow study.

## Reproduction and resources

Use the shared guarded loader, retain eligibility and per-case source lineage,
and hash/register the generated key and blinded pack before reuse. Keep the key
in evidence separate from the standalone reviewer HTML. Human blinding means
information is withheld in the pack, not secrecy from someone inspecting Git.
Use maintained Chess mechanics. Budget <1 minute compute, <1 MB retained output.
Synthetic tests verify deterministic selection, legality and browser progress/
export mechanics; they supply no human validity evidence. No runtime edits.

Next: implement and validate the pack; then await later reviews while numerical
research continues. Review timing does not block independent research.
