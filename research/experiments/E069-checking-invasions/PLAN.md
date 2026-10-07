# E069: checking rook and queen invasions

2026-10-07. Preregister before implementation/evaluation. Research-only paired
claims: Rook penetration C0342/C0677 and Rook invasion C0358; Queen invasion
C0362. Explicit checking subset, not all strategic invasions. Frozen E068,
3,412 ordered baseline results, guarded authored D001 test positions only.

invasionTags boolean default false; maxInvasionNodes integer 0..50000 shared.
Disabled exact E068; exhaustion drops all new events. Actual legal own rook or
queen starts in own relative ranks 1–4 and enters relative rank 7/8 along its
file. Its destination directly checks the enemy king horizontally through an
unobstructed rook-like ray on that same rank. Actual after must be live.
Capturing entries permitted; history, when supplied, replayed strictly in full.
Retain before/actual identity, relative ranks, check ray and EVERY full-history
legal enemy reply with capture, retained invader and terminal flags. Separate
rook/queen event IDs and independent positive/negative gates, text <=24 words,
qualityClaim false, priorities rook 101.004 and queen 101.005 below urgent
material/mating warnings. No safe invasion, winning attack, intent, positional
advantage or best-play claim.

Independent replay imports no detector helpers; reconstruct all history,
relative-rank entry, direct horizontal ray, exhaustive legal responses and text.
Both units/colors/horizontal reflections, seventh/eighth rank, captures,
capturable invaders, check evasions, terminal replies, full history/repetition,
negative non-entry/short/diagonal/blocked/discovered-only/wrong unit/terminal
actual, disabled/budget/domain/illegal moves and corrupted records/rays/replies.
Never mark general rook/queen activity or other adjacent concepts verified.

Cheap focused pilot; final focused/full cumulative/source/diff gates. Freeze
source, then exact main/repeat/initially clean detached reused checkout runs,
independent saved-proof replay, all inherited full-result fingerprints and
original list hash unchanged. Estimate ~270 seconds/run overlapping three;
prospective full evidence <=12MB. Retain/report failed gates without dropping
proofs or changing budget. Save results/tracker/demo, commit coherent changes,
fast-forward existing local research branch/main only under clean ancestry rules.
No new branches, extension integration, push, usage cutoff or shutdown.
Exposed synthetic mechanics do not establish real-game precision/teaching value.
