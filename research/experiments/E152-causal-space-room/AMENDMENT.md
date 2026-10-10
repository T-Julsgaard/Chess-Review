# E152 terminal-root expectation clarification — 2026-10-10

After the initial 47 focused checks passed, two terminal controls were added.
The discovered-mate closure passed. The root fifty-move control failed because
its test expected a returned abstention, whereas the inherited E020 API throws
`Cannot explain a move from a terminal position` before the wrapper returns.
Preserve that established rejection and assert it for both parent and candidate.
No detector, claim threshold, fixture, collector or pilot gate changed. The
failed test source and diagnostic are retained losslessly in
`evidence/development-failures.json.gz`. The corrected test is run before build
credit. Terminal branch closure and independent flag-mutation checks remain.
