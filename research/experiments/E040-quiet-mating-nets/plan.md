# E040: quiet mating nets with complete legal-defense certificates

Date: 2026-10-07. Research only; usage cutoff and shutdown remain cancelled.

Use the frozen E029 mate-in-two proof exposed through E039. Add no engine or
new search. Require an actual noncapture, nonpromotion move giving no check,
nonterminal resulting position, and a complete positive two-ply proof: every
legal opponent reply admits a legal checkmating response. Independent replay
must enumerate the exact defender move set and execute every mating response.

One quiet-mating-net event names this concrete threat, without claiming it is
new, the only winning move, or better than alternatives. Stronger existing
warnings, missed-mate and terminal labels retain their priority. No net for
checking moves, immediate mate, three-move-only proofs, draws, disabled mate
profile, or exhausted budget. Keep comments <=24 words.

Track the bounded mating-net/mating-attack and forcing-threat subsets, and the
quiet tactical move label. The original broad Quiet move wording says
non-forcing; this verified mate threat is not evidence of that property, so
keep that entry partial. Do not infer a newly created threat from the after
position alone.

Authored positives, color/rank reflection, counter-mate refutations, checking,
capture, terminal, short/zero budget and history cases. Tests must reject omitted
defenses, wrong mate responses, wrong resulting FEN, reply counts and move kind.
Cumulative E020–E040 tests, source verification, exact repeat and initially
clean checkout runs, independent retained-pack read-back, input/output hashes,
guarded D001 receipts. No registered game analyzed. Retain lossless evidence
under 3 MB. Reuse E039 runner and deterministic gzip retention; estimate three
968+ case runs at about 75 seconds each, largely overlapping, <3 MB retained.

Exposed pilot addendum: the first positive case has a sole legal reply, despite
its initial many-defenses name. Preserve it with an accurate name and add an
authored opposing knight with multiple legal defenses. Require a positive
test asserting multiple replies and a non-king defense; no proof gate changes.
The first pilot also caught a demo adapter dereference for compressed proof
references; the display fix and smoke test preserve the canonical certificates.
