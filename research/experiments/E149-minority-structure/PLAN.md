# E149 — minority advances and recorded structural exploitation

2026-10-10, before implementation or decisive evaluation. Parent E148 26e2a20.
Current main explicitly authorized after isolated checkout disappeared; research
only, local commits, no push. D001 test preflight passed; authored fixtures only.
BUILD-FIRST: focused checks and tiny pilots, no cumulative or long tests.

Original scopes: C0198 minority attack (smaller pawn group advancing against a
larger group); C0525 minority attack in strategic planning; C0230 structural
advantage (healthier or more useful pawn arrangement). Existing fixed-wing
minority counts alone discharge none of these. Preserve full broader occurrences.

Default-false minorityStructureTags wraps E148. Strict maxMinorityStructureNodes
integer0..50000 default50000. Require full legal history with arbitrary authored
legal start. No engines, acquired games, tablebases or fabricated turn controls.
Fixed wings a-d/e-h follow existing E021 conventions, not inferred theater.

C0198: actual quiet nonpromoting pawn advance stays on its wing, own pawn count
>=1 and < enemy before advance. Advance creates a NEW legal enemy pawn capture
of the advanced pawn; compare actual pre-move geometric contact and post-move
legal inventory. Existing contact, pinned enemy pawn and static counts abstain.
This establishes a concrete minority lever, not intention, safety or quality.

C0525: actual last four history plies are actor minority advance, opponent pawn
capture of that pawn, own OTHER pawn recapture of the capturing pawn, opponent
quiet nonpawn move. All are real legal moves. Exchange must create a newly
isolated opposing pawn on the same fixed wing; actual move captures that pawn
with positive nominal1/3/3/5/9 gain immediately and through EVERY immediate reply.
Retain complete history and before/after structural snapshots. No assertion that
opponent had to cooperate, alternative defenses fail, or the plan was intended.

C0230: before actual capture, own isolated-pawn count strictly less than enemy's,
own doubled-file count <= enemy's; actual target is an isolated enemy pawn and
capture has the positive all-immediate-reply certificate above. Explicitly a
bounded exploitation of an observed relative health profile, not general score,
winning position, strategic superiority or proof every healthier structure wins.
Track missing broader features (backward pawns, activity, compensation, plans).

Complete generic panel keyed by FEN/full history/source square: all legal root
moves retained; all same-source pawn moves, otherwise all same-source captures
of isolated enemy pawns, become variants. Each variant retains complete opponent
legal inventory, structural snapshot, FEN/terminal flags. Every variant pawn
capture retains ALL immediate replies, gains and terminal flags, including
failed/recapturable captures. Pawn advances retain complete legal pawn captures
of moved pawn. EP uses victim square. No vacuous certificate: terminal capture,
empty replies, terminal reply or nonpositive gain refute it. Any visited claim
context (50-move/threefold) abstains from all new labels. Terminal frames closed.

Cost: 3wrapper ticks + 1root context + history length + 1root structure + 1root
inventory; each variant 1move+1structure+1inventory; each pawn-capture ledger
1context/inventory+1per reply. Cache/fresh identical charge, atomic exhaustion
drops all new events/witness and preserves parent. Caller-supplied panel is
untrusted: independent semantic verifier reconstructs inventories/history/FEN/
structure/material/terminal/cost. Independent saved-witness checker derives
claims separately, without importing detector/collector/derivation helpers.

Prospective pilot hypothesis: White Kh1,Rd1,Pa4,Pb4 vs Kh8,Pb7,Pc6,Pd5;
b4-b5 creates legal ...c6xb5. Recorded b5/cxb5/axb5/Kh7 should leave newly
isolated d5 and b7; actual Rxd5 should retain1nominal point through all replies.
Own1isolated vs enemy2 before capture should support bounded health comparison.
Both colors. Controls: equal pawn counts, existing contact, pinned contact,
no history, zero cap, recapturable target, preexisting isolated target,
nonminority exchange and a healthier pawn profile without profitable capture.
These are hypotheses, not results; preserve failures and dated amendments.

Focused checks: strict controls, disabled equality, cache/fresh identity, exact
and one-short atomic budget, EP/terminal/claims/full history, legal/history/
structure/ledger/summary/label mutations and representative E148 parent checks.
Cheap smoke then hash-bound raw-panel reuse. Retain compressed pilot/raw, source
closure (parent build plus every new helper/test/plan/fixture), environment,
receipt, revision, null engine/seed and output hashes. Independent saved replay,
source verification and diff check. Soft storage target <100KB compressed;
record overruns, never discard evidence to fit it.

Defer full combined regression, exhaustive occurrence/absence/interaction/
priority/history/budget audit, exact main/repeat/initially-clean reproductions
and real-game precision/usefulness. No accepted tracker or production changes.
Full catalog goal remains open.
