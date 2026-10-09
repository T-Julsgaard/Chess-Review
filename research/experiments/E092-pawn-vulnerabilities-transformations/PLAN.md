# E092 pawn vulnerabilities and transformations

Registered 2026-10-09. Provisional build-first research, E091 wrapper, E021
pawn features, E022 legal capture certificates, E024 history, E027 turn boards,
E037 promotion route policy; compatible unchanged FRIEND-03 wedge forwarded.
Default-disabled structureTags; maxStructureNodes integer0..50000;
structurePushes integer1..6 default2. Atomic exhaustion retains E091 output.
Only live before/after nonchecking positions are used for hypothetical capture
comparisons; side changes clear EP and label turns. No strategic engine rating.

C0205/C0522: new enemy backward-pawn resource: neighbors all relatively ahead,
no pawn support, legal pawn moves exist and are straight advances only; EVERY
advance permits certified loss of that pawn through ALL immediate counters.
Previous same-color turn snapshot did not have that full weakness.
C0225: same tracked own piece has two recorded legal profitable capture contacts
with the same unchanged enemy pawn across actual piece moves and opponent turn;
full history and both original positive E022 certificates required.
C0521: newly certified pawn capture targets ranked by fixed guaranteed nominal
capture gain, ties UCI; conditional labelled actor-turn targets, not best move.
C0886: changed pawn feature asymmetry plus unequal complete conditional pawn
capture vulnerability counts; compare both sides with explicit hypothetical
turn inventories, no positional strength conclusion.
C0893: own passer-count advantage and selected actual pawn with surviving
all-defense queen route at declared push bound. Reuse matching E089/E037 proof.
C0894/C0297/C0905: prior four-file pawn majority becomes a newly created passer
with that route and no same bounded straight route from its pre-move square;
majority-to-promoting-resource transformation only, no global game win.
C0537/C0050: actual pawn capture removes a doubled file, newly creates passer
and changes failed pre-route to surviving after-route; bounded favorable
structural transformation, not general easier-position or structure score.
C0220: forward unchanged FRIEND-03 pawn-wedge event when wedgeTags requested;
causal denial of enemy king destinations is a concrete cramping subset, general
serious restriction of nonking armies remains unresolved. Preserve its exact
evidence and hash-bound observations; no renamed copy or duplicate run.

Focused both-color positive/negative, pins/counterrecapture, history missing/
invalid, passed EP rules, strict inputs, disabled equality, budget/terminal and
focused independent witness replay/tampering tests. Cheap guarded synthetic D001
pilot, source verification and diff checks. Record failures openly. Defer full
cumulative regression, whole saved semantic replay, integration interactions,
exact main/repeat/initially-clean reproductions, original scope audit and
real-game precision/usefulness to combined frozen stage. Accepted tracker and
extension unchanged. Long-term structural defect, broad compensation and
sustained cramping remain prerequisites; full teaching catalog retained.

Git workflow clarified by human in other chat: completed checked commits now
fast-forward into shared local main when clean/on main; never push. E0913607242
already integrated. Keep development in the existing isolated checkout/branch.
