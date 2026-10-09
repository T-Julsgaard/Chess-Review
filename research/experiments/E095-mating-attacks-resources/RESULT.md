# E095 complete mating attacks and defensive resources

Provisional prototype2026-10-09: eight original scopes C0408/C0129/C0412/
C0417/C0095/C0096/C0469/C0471. Accepted tracker unchanged. Default-disabled
matingAttackTags wraps E094, attackPlies0..5(default2), maxAttackNodes0..50000,
compareMateDefenses boolean(defaultfalse). Atomic exhaustion discards every new
label and witness, including an earlier actual win if late alternatives exhaust.
Short comments, qualityClaim:false; no production/numerical changes.

Unchanged E029 all-legal-move query and independent tree replayer reused. Actual
positive mate policy supports king attack/forcing-sequence explanations; quiet
moves included in search, full defender branches retained. No inferred optimal
mate distance, hidden intent or general strategic value. Opposite-castling attack
also requires supplied legal history recording both opposite-wing castles and
current kings at recorded destinations, not a FEN-only castle guess.

Pawn-shield sacrifice requires actual geometric cover-pawn capture, positive
nominal cost difference, at least one LEGAL capture acceptance and positive mate
through ALL replies. Greek Gift additionally requires checking Bxh7/Bxh2 against
g8/g1 king. Current examples include actual legal acceptance and declined offer;
neither acceptance nor opponent blunder is assumed. Broader Greek Gift/attack/
shield-destruction strategies remain unresolved.

Defensive resource requires POSITIVE played actor-mate policy or actual draw
threshold and a certified enemy mate after at least one legal alternative, at
identical further-ply bound. Every alternative retained when comparison enabled.
Capture/check additionally triggers defensive tactical-shot explanation. A failed
finite mate search never proves safety. Optional only-certified-resource event
requires every alternative to have a positive enemy-mate proof; C0470 only-defense
and C0458 king-evacuation are deliberately outside reported build coverage pending
suitable positive examples and scope evidence. General optimal defense unresolved.

E029 draw-stop semantics preserved: repetition,50-move threshold, stalemate and
insufficient material stop the search. Positive mating proof is conservative
under available draw claims; a failed query does NOT establish no forced mate.
The draw-resource branch represents availability under this model; optional claim
and intended-move interfaces require combined review, not automatic game outcome.
No new accepted draw claim. Positive defensive pilot proves own immediate mate.

25 focused E095 checks pass; affected E094/E029/E030 checks pass. Both colors,
quiet/checking policies, accepting/declining sacrifice defenses, castling-history
requirements/no-history negatives, counter-mate/fifty-threshold/missing-helpers
refutations, strict controls/default equality, actual/late-comparison atomic budgets.
Independent original mate-tree replay plus new label/history/cover/cost/acceptance/
complete alternative-inventory checks; altered cost, acceptance, defender branch,
root inventory, alternative list and castling side rejected. EXPOSURE.md records
invalid initial fixtures and shorter genuine wins; no claim gate loosened.

20 guarded authored D001 pilot cases,20 complete witnesses, independently replayed
from saved evidence with exact fixture FEN/move/history,97 normalized source hashes
and compression/plain hashes. No outside game content or new acquisitions.
Retained evidence/results.json.gz45,949bytes SHA256
47de3983d4baa523492168152e55a1eff9631859121d34188ee26419cc398966.
Plain JSON649,464bytes SHA256
 d77b3124dca55cc3b8bbabb4d9e105d287ffe434ab4f03eb42e5e66c87bc4643.
run.json binds preregistration fff5496 and exact working source closure. Source
verification and staged diff pass; eligible unchanged historical proof evidence
preserved, no cumulative regression or historical evidence regeneration.

Deferred: combined full regression, complete saved semantic/absence replay,
interaction/priority/history/budget matrix, exact main/repeat/initially-clean
reproductions at combined freeze, occurrence-scope audit and real-game usefulness.
All strategic/general scopes and complete original catalog remain in scope.

Status commands: accepted E082378/1085(328names),76partial,631unimplemented,
707remaining,63completed studies. Build122pending provisional entries,16ready,
0stale;500/1085accepted-or-candidate46.1%,585without candidate. Backlog668items/
707pending; candidate coverage never discharges broader original definitions.

Resume: same isolated research/runs/E020/clean branch
codex/coach-concepts-e058-evidence. Shared clean main prior result b993e83; locally
FF completed result into existing shared research branch and clean main, never
push. No live run uses mutable E095 inputs. Next prioritize current finite
material/tempo-development or endgame resource explanations sharing retained
legal/policy machinery; C0470/C0458 need positive proof fixtures rather than a
failed search. Last five-hour usage81%used/19%remaining. At about95%used, stop,
commit completed work, exact resume record and explicitly authorized PC shutdown.
