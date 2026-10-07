# Authored development exposures

2026-10-07, before decisive runs. No external game examples or labels used.

An ordinary pawn capture of a ram blocker replaces it with the capturing pawn;
it cannot be called a release of the pawn behind. Release therefore requires
the exact removed square empty and all-reply legal next-turn straight moves;
authored en-passant history exercises this. Escape concerns the capturing
pawn's own new file and is separately checked.

Initial target 91/102 passes. A supposed two-ram positive fails correctly:
either enemy blocker can capture the breaker, leaving the OTHER ram intact
without its proposed capture witness. Correct positive pins both enemy
blockers to their king with independently authored bishop rays. A rook on h5
cannot capture d5 through its own e5 pawn; corrected negative uses Rd8xd5.
Rh3-h1 is blocked by default Ph2; corrected legal checking reply Rg3-g1.
These were fixture errors, not relaxed all-reply predicates.

The simple challenge's selected text is a genuine hanging-pawn warning.
Preserve it; add a pinned-blocker positive to check selected challenge text.
Release and escape already select the short new comment. Priority remains the
preregistered 101.3. Second target passes 106 tests after authored corrections.

Additional renewed-blocker negative uses Nc6-e5, retaining released Pe4 but
blocking its straight advance; Nf6xe4 would merely duplicate pawn loss.
Added next-turn four-way promotion subsets, a legal enemy Qg1 mate reply and
an actual mating capture that must suppress the new labels. Expanded target
passes. All changes precede source freeze and full reproductions.

Final target 119/119 and cumulative E020–E060 2,663/2,663 pass. Maintained
source verification and diff checks pass before source commit. Full runner
retains frozen E059 ordered baseline fingerprints and E053 compact display.
