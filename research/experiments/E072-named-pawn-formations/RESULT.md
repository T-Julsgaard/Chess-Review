# E072: verified named pawn formations

Completed 2026-10-07. Research-only opt-in comments for **Stonewall structure**
and **Maroczy Bind** from the unchanged user list. Neither changes the extension.
`formationTags` defaults false; disabled results exactly match E071.
`maxFormationNodes` is a shared integer budget 0..50000; exhaustion atomically
discards new certificates and preserves the parent comment and events.

Stonewall requires an actual pawn move newly completing c3/d4/e3/f4, or black
c6/d5/e6/f5. Three support links are independently certified by legal captures
in explicit enemy-knight replacement counterframes. Absolute pins and illegal
counterframes refuse the comment. Example:

> Stonewall structure: c3/d4/e3/f4; c3 and e3 support d4, while e3 supports f4.

Maroczy requires newly completed c4/e4 controlling empty d5 (black c5/e5, d4),
no own d-file pawn or enemy c-file pawn, and a recorded exchange between the
identified root own d2 pawn and enemy c7 pawn (color reverse). Either original
pawn may capture the other; immediate opposite-color nonpawn recapture must
remove the survivor. Identities are tracked through movement, captures,
en passant and promotion. Both common-target captures must be independently
legal in the explicit enemy-knight control counterframe. Example:

> Maroczy bind: c4 and e4 control d5 after the recorded d-pawn/c-pawn exchange.

Black uses the explicit label **Reversed Maroczy bind**. FEN-only pawn absence,
wrong root identities, delayed recapture, occupied target, pinned controllers
and merely similar files do not qualify. Named structures are fixed-file facts:
horizontal reflection is a negative, while color reversal preserves the pattern.
The API retains all events, then selects by priority 101.008/101.009 below urgent
tactical warnings. Terminal promotion warnings take precedence in authored cases.
All new comments are at most 24 words and `qualityClaim:false`.

Actual after must be live. Certificates retain full legal history, actual move,
exact pawn cells, all legal countercaptures, exchange records and every full-history
enemy reply, including promotions, en passant, checks, captures and rule terminals.
Named-pawn loss after a reply is allowed because the text describes the current
position. No permanent bind/wall, forbidden pawn break, winning attack, general
positional strength, opening move order or player intent is inferred.

Frozen source **8e40489a55d15a51c3529a5036c1a67cbdba11c4**. Focused **174 tests**
passed in 8.2s; full cumulative **4,336 tests** passed in 143.7s. Maintained source and
diff checks passed. Corrected authored-fixture pilot failures are retained in
[EXPOSURE.md](EXPOSURE.md); no protocol gate or budget was loosened.

Main/repeat/initially clean detached reproduction all exited 0 and matched exact
revision, source/input hashes, physical output hashes and metrics. Durations
236824/235124/237598ms. Original concept list and all **3,860 ordered E071 full
result fingerprints** unchanged. Full corpus: 4,028 cases, 3,792 with facts,
154 abstentions, 82 invalid moves; longest selected comment 21 words.
Canonical [results.json](evidence/results.json), [demo](evidence/demo.html),
[tracker](evidence/concept-status.md), and main/repeat/clean manifests are retained.

Independent saved-proof replay imports no detector helpers: it reconstructs fixed
files, scalar original-pawn paths, legal replacement counterframes and complete
capture/reply sets. **42 positive certificates**: 22 Stonewall and 20 Maroczy;
122 legal negatives and 4 invalid moves across 168 new cases. Replayed 332 replies,
106 countercaptures, 116 history plies, 32 promotions, 8 terminal replies and 10
named-pawn losses. Both exchange orders and an original-pawn en-passant exchange
are covered. Tampered structures/history/exchange/capture sets/replies/text fail.
Across the full corpus: 6,969 certificates, 288 query proofs, 25,359 reply edges and
52,562 continuation leaves. New formation budget consumed 1,202 counted nodes.
Canonical evidence 4,895,874 bytes, within prospective 20,000,000-byte budget.

Progress is computed by `npm run research:status`; checked rows state these
explicit mechanics scopes, not universal chess understanding or real-game
precision. New formation/identity subsets can abstain on otherwise valid named
structures, particularly truncated histories and delayed exchanges. Synthetic
development exposure cannot establish human teaching value or real-game precision.

Next **E073**: investigate Hedgehog and Carlsbad structures from the list, checking
primary naming definitions and any required exchange identity before preregistering
fixed-file/support/majority gates. No generic claim of counterplay or minority
attack success. Reuse stable checkouts and local branches; no push, numerical
research, extension integration, cutoff/shutdown or automation revival.
