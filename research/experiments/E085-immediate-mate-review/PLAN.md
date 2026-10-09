# E085 immediate mate review and legal forcing candidates

Registered2026-10-09 before code/testing. Default-disabled E084 wrapper; exact
history/legal input guard. Synthetic mechanics only, no extension/numerical work.

Enumerate complete legal root candidate records (checks/captures/immediate mates)
and every legal opponent move after actual move to collect all mate-in-one moves.
Reuse E029 query for existential one-ply missed mate proof when compatible; no
renaming old proofs. Independently enumerate root records for completeness.
Before opponent-turn snapshot clears EP, not an actual pass; skip when root in
check. For existing-mate threat, compare every actual alternative: report
retained/immediately prevented threats only with exact legal alternatives and
complete enemy mate-in-one sets. No hidden intention, engine-error grade, forced
win/draw beyond this horizon or proof a preventive move is globally safe.

Claims C0114 concrete legal checking/capturing candidate inventory;
C0116/C1061 complete legal checks/captures and immediate mates, deeper threats
unresolved; C0134/C0821 finite immediate-mate blunder-check report;
C0851 missed available immediate mate only (reuse E029 proof);
C0853 actual move retains existing immediate-mate threat despite an alternative
that removes all such mates (no psychological 'ignoring' assertion);
C0778 actual move removes all previously witnessed immediate mates on the
hypothetical enemy snapshot, with full actual legal reply set.
C0117 finite legal one-ply root/reply tree; broader calculation trees unresolved.
Queue tactical260/256/259 before phase5 support290-293/301/483/542 because useful
warnings share complete legal-move machinery. No new error classifier.

Focused positive/negative both colors, legal counterfactual snapshots labelled,
strict/default/disabled input compatibility, history/terminal/repetition,
all-underpromotion/capture/EP move records, atomic budgets and source/diff checks.
Cheap guarded pilot with independent focused move/mate witness checks. Affected
E084 focused tests. Deferred combined regression, independent complete semantic
replay/interactions, exact changed-work three reproductions, scope audit and
real-game precision/usefulness. Accepted counts unchanged.
