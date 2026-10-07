# E069: verified checking rook and queen invasions

Completed 2026-10-07. Research-only opt-in `invasionTags`, default false.
Separate rook/queen labels certify a checking entry from own half along its
file into relative rank seven/eight, directly checking the enemy king from
the side. Example: “Rook invasion: Ra7+ enters a7 deep in the enemy position
and checks the king from the side.” Queen uses the corresponding label.
Rook penetration C0342/C0677 and Rook invasion C0358 share this explicit
checking subset; Queen invasion C0362 has independent positive/negative gates.
No safe-piece, winning attack, best-play or general activity claim.

197 focused and 3,888 cumulative coach tests passed (full suite 87.7s);
maintained source verification and diff checks passed. Independent saved-proof
replay verified 44 rook and 44 queen certificates, 96 legal negatives and eight
illegal moves. Complete 368 legal responses, 48 history plies, 24 captures of
the invader and 56 terminal responses retained. Both colors/reflections,
seventh/eighth rank, home/fourth-rank starts, capturing entries, a check-evasion
entry and direct/discovered/diagonal-ray exclusions covered. Actual mate is
suppressed in favor of existing terminal explanation. Material-gain warnings
outrank the invasion. Failed authored pilot assertions remain in EXPOSURE.

Full-history repetition fixture has `...Kh8` as a third-occurrence terminal
reply for both pieces. Fresh FEN reconstruction would miss the repetition;
explicit tests and independent saved replay check the difference. Clock-terminal
replies and captures producing terminal draws are retained too.

Frozen source `32068c472dbfd8c4662b5aaf881ec2fb4bebc668`. Main/repeat/reused
initially clean detached runs all exited 0, with exact source/input/physical
output/metrics equality in 241.8/240.4/240.4 seconds. All 3,412 inherited
ordered full-result fingerprints and original list hash unchanged. Full corpus
3,604 cases: 3,386 facts, 148 abstentions, 70 invalids; maximum selected comment
21 words. 6,255 certificates, 288 query proofs, 22,751 legal reply edges and
47,036 continuation leaves retained/replayed. Full evidence 4,500,307 bytes
within the prospective 12MB budget.

[Proofs](evidence/results.json), [tracker](evidence/concept-status.md),
[demo](evidence/demo.html) and main/repeat/clean hash manifests retained.
Tracker: 297 verified names, 346 verified occurrences, 76 partial and 663
unimplemented occurrences. Synthetic exposed mechanics do not establish
real-game precision or teaching value. Extension unchanged. Local integration
follows clean ancestry rules; no push.

Next: E070 pawn-supported knight outposts, conservatively proving no current
enemy pawn can reach an attacking square before promotion, with legal support
counterframes and full legal replies. Consider advanced outposts separately.
Broader coach goal remains active; numerical research paused, cutoff cancelled.
