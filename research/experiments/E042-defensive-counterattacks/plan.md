# E042: counterattacking defense and defensive sacrifice offers

Date: 2026-10-07. Research only. Usage cutoff and shutdown remain cancelled.

Require frozen E041 unique immediate-mate-defense certificate and an actual
checking move. Opt-in defensiveTags boolean defaults false, preserving parent
exactly. Emit one defensive-counterattack event, explicitly scoped to avoiding
mate in one. Checking alone and a unique nonchecking defense are insufficient.
Do not attribute the entire benefit exclusively to check or claim longer-term safety.

For a defensive sacrifice offer, require a moved non-king unit, positive fixed
nominal offer cost versus any captured piece, and a legal enemy capture of that
actual unit. After acceptance and every legal immediate own response, nominal
balance versus before the played move must remain strictly negative. Nonterminal
acceptance and nonterminal responses only; exclude draws/mates and recapturable
offers. Preserve every response and acceptance FEN/gain. Enumerate all qualifying
acceptances; acceptance remains conditional, never forced. Priority below stronger
terminal/missed-mate warnings, within unique-defense explanation priority.

One shared maxDefensiveTagNodes integer 0–50,000 budget for all acceptance and
response enumeration; exhaustion drops new tags, retaining frozen parent evidence.
Reuse unique-defense proofs without new mate search. Include both colors,
checking capture of attacker, nonchecking unique defense, a knight offer with
multiple defenses/counterresponses, better/safe alternatives, disabled profiles,
zero/boundary budgets, history, altered proof/capture/reply/gain witnesses.

Preregister before smoke. Cumulative E020–E042 tests, source verification,
main/repeat/initially clean clone with exact source and deterministic hash match,
saved JSON proof replay, guarded D001 receipts. No registered games, extension,
rating edits or push. Expected ~75 seconds per ~1,030-case run; retain lossless
compact JSON under 3 MB. Keep comments <=24 words. Counterattack and Defensive
sacrifice retain exact subsets; extend already verified Active defense scope.

Exposed smoke addendum: adding a rook to recapture the knight's acceptor also
creates another safe Rf3 defense, so preserve that case as a prerequisite
refutation. An authored bishop recapture case preserves unique Ne3+ and directly
tests rejection of recoverable material offers. No gate is relaxed.
