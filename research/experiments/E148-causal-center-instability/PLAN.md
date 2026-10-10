# E148 — causal central-pawn alternatives and recorded collapse

2026-10-10 before implementation/evaluation, parent E147 b7a5d40. Previous turn
progressed: two credited opening scopes, three failed hypotheses preserved and
C0170 uncredited. D001-test resumption preflight passed. Authorized current main,
research-only local commits/no push. BUILD-FIRST focused checks/small pilots;
no cumulative/long tests. Full catalog and deferred gates remain scope.

Batch C0180 dynamic center, C0187 overextended center, C0188 center collapse.
Reuse legal Chess/history/nominal1/3/3/5/9 conventions. Existing E022 certificate
short-circuits failures; do not misrepresent its positive tree as complete raw
negative observations. Collect a small complete capture/reply ledger instead,
including failed captures and ALL immediate replies. No engine/game/tablebase.

Default-false centerInstabilityTags wraps E147; strict maxCenterInstabilityNodes
0..50000 default50000. Require explicit full legal history, any legal authored
start; do not fabricate opening context or side-to-move controls. Central zone
is d/e files,ranks3..6, with core d4/e4/d5/e5. Actual actor's central-file pawn:
enumerate EVERY legal move from its square, preserving true extended histories,
promotion/en-passant/turn/rights/clock metadata. For other actual units enumerate
all their legal captures of enemy central-zone pawns. Generic panel keyed by
root/history/source square; same-pawn actual alternatives reuse that panel.

Each variant retains exact central pawn/support snapshot, ALL legal opponent
moves and EVERY legal capture of the moved pawn (including EP victim square).
Each such capture retains full legal actor reply inventory, resulting FENs,
signed nominal material changes and terminal/claim flags. Central-pawn captures
by the variant itself also retain full opponent-reply material ledger. A
certificate requires live capture position, nonempty complete replies, positive
gain immediately AND through EVERY reply, with no terminal reply. Unknown longer
compensation/outcomes are not inferred. Claim contexts anywhere abstain from all
new labels. Mechanical terminal branches refute material certificates.

C0180 dynamic-center comparison: actual central pawn has a legal central-pawn
capture and a noncapturing advance among same-pawn options; original own center
contains at least two central-zone pawns including a core pawn. Two options
produce distinct central occupancy/contact and material-certificate profiles.
Retain both complete legal frames and all other options. This demonstrates rapid
central tension change, not generally volatile engine scores or safe advances.

C0187 overextension: actual noncapturing/nonpromoting central-pawn advance reaches
relative rank>=5, leaves geometric pawn support (previous nonempty, after empty),
allows a positively certified enemy capture of that pawn, while another legal
same-pawn option avoids such a positive immediate capture certificate. Original
own center has>=2zone pawns including a core pawn. Compare real legal alternatives,
not a pass or a reset hypothetical turn. This is a bounded material vulnerability,
not general safety, an overall bad-move judgment or exclusion of deeper compensation.

C0188 recorded collapse: previous same-actor move two plies earlier captured an
enemy central support pawn; actual capture removes the pawn it supported in
that earlier true position. Follow the remaining target through the ACTUAL
opponent reply if it moves; no arbitrary historical snapshot. Both victims must
be d/e-zone pawns, at least one on core; prove original directed pawn-support
relation. Actual capture's complete material certificate plus signed offset
from before the first capture must guarantee>=2nominal points through every
immediate opponent reply. Retain true history, both victim identities/locations,
support relation, cumulative material baseline and all replies. This proves a
particular recorded tactical dismantling, not that earlier defenses could not
prevent it, all pawn losses are collapse or long-term positional unsustainability.

Logical budget:3wrapper/context/derivation ticks plus collection cost:1root context,
1per supplied history move,1before snapshot,1root legal inventory; per variant
1move,1snapshot,1opponent legal inventory; per capture-ledger1context/inventory
and1per complete reply;1per separately followed enemy capture. Complete failures
charge all work, no discarded branches. Same cached/fresh cost; atomic exhaustion
clears witness/new events and preserves parent. Optional centerInstabilityPanel
is untrusted and independently semantically replayed before labels. Independent
outer checker derives claims separately without importing detector/collector or
its derivation helpers.

Prospective authored hypotheses, six cases plus color reflection<=12pilot:
White Ka1,Pd4,Pe3 vs Kh8,Pe5,Pe6, actual d5: e3 support is left behind; ...exd5
should guarantee1point, whereas legal same-pawn dxe5 avoids that certificate.
Actual dxe5 uses SAME generic raw panel and should yield dynamic comparison only.
Add own Pc4: d5 retains pawn support/recapture and must not be overextension,
though alternative center transformations remain dynamic. Collapse: Ka1,Bg4 vs
Kh8,Pd5,Pe6; record Bxe6/...Kh7, actual Bxd5. Hypothesis original Pe6 supports
Pd5, both removed, cumulative minimum2points. Missing history/zero cap abstain.
Focused additions: no same-pawn alternative, recapturable second capture, unrelated
two pawn captures, EP victim square, longer true histories, claims/terminal flags,
strict/disabled/cache/fresh/exact-one-short budget and proof/summary mutations.

Cheap smoke first, hash-bound cached complete panels thereafter. Source closure
must explicitly include all behavioral/fixture/helper inputs; final build includes
parent build closure. Guard every research entry, retain compressed raw/pilot,
environment/commands/null engine+seed/receipt/source revisions+working hashes/
outputs. Preserve failed hypotheses and implementation failures/amendments.
Focused checks and representative E147 parent checks, independent saved semantic
replay, source verification and diff. Combined full regression/occurrence/
priority/history/budget audits, exact main/repeat/clean reproductions, broad
strategic sustainability and real-game precision/usefulness deferred. Accepted,
production, shared policy and numerical behavior unchanged. Complete goal open.
