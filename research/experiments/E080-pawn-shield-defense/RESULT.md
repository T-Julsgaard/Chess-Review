# E080 registered pawn-shield defense research

2026-10-08. PLAN preregistered before code or fixture evaluation. Reuse exact
E079 parent and frozen E027 hypothetical-turn/E029 mate-query semantics. Require
a cover pawn's causal obstruction of a complete prior hypothetical mating
capture plus exhaustive absence of mate in one after the actual move. Global
king safety, other cover interpretations and quality claims remain unresolved.
Initial research-only wrapper implemented. First three focused tests passed in
1.6s: queen-file cover hypothesis and its Black reflection produce complete
frozen-source before-mate/after-no-mate proofs independently replayed by E029;
disabled exact E079, strict new inputs and zero-budget atomic refusal pass.
Full independent wrapper replay, broader positive/negative coverage, final
cumulative gates and exact saved reproductions remain outstanding. This is
developmental exposure, not acceptance or tracker advancement. E079 canonical
coverage remains 321 names/370 verified occurrences, 78 partial, 637 unimplemented,
715 remaining, 34.1%, 60 completed coach studies (research:status).

Practical evidence minimization policy adopted from current main; estimated
900–1,100s/run and roughly 8MB are soft planning targets, not scientific gates.
Preserve complete proof content, all failures and exact independent reproductions.
Shared main/research branch contain completed E079 at 5ab2396; new E080 work
stays on existing isolated codex/coach-concepts-e058-evidence. No extension/push.
Numerical work paused; usage cutoff, shutdown and automation remain cancelled.

New tests add exact/one-less atomic budget and cover-without-threat/obstruction
negative gates; all five focused tests pass in 1.9s, maintained source/diff
checks pass. EXPOSURE retains the observed roots/results; no failure occurred.
Current
positive coverage is queen on g-file/home-g king only, both colors; c/e king
files and a second slider family remain unmet, so neither occurrence advances.

Next: independent scalar wrapper replay/tamper gates and broader guarded
synthetic pilot; retain unmet coverage/failures. Shared reconciliation policy
c43b471 incorporated at clean boundary via 22b9abe; source/diff and unchanged
261-input/three-output E079 manifest audit pass. Ordinary local divergence
will now be reconciled safely under that explicit approval before integration.
