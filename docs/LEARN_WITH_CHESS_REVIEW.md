# Learn with Chess Review — objective and progress

## Implementation tracker

Completed the initial fully usable learning release on 2026-10-14. This file travels with the repository so development can continue on another computer. Study progress stays local to the browser; this tracker records implementation progress. Local commits are created with the maintainer as author and Codex as co-author; nothing is pushed automatically.

- [x] Stage 1: Isolated learning workspace, bottom entry beside controls and below Engine, home, navigation, return to the exact review position/orientation and paused playback.
- [x] Free learning board: either colour can move using normal legal piece moves without alternating turns. Left/Right arrow keys step through its session history; a new move after stepping back replaces the future continuation. No history buttons are added. Moves and history use the existing chess sounds and mute setting; review state and saved learning progress stay separate.
- [x] Stage 2: 23 complete concept lessons in seven categories, 47 exercises, interactive examples and counterexamples, prerequisites, scoped validation and feedback, completion states and difficult-exercise revisits.
- [x] Stage 3: 50,000 distinct offline puzzles across twelve themes and three difficulty bands, all setup/solution moves legally replayed. Filters, mixed/theme practice, hints, retry, reveal, missed-puzzle review and 1/5/10-minute challenges. Timers exclude loading/validation/saving; unique, repeat and assisted completions remain separate.
- [x] Puzzle expansion: increased the initial 216 positions to 25,000, then 50,000 from Lichess's CC0 database, retaining every original record and ID for saved progress. Quality filters, position deduplication, legal replay and mate-ending checks apply. The maintenance importer preserves existing content and uses a bounded download; normal use stays offline.
- [x] Puzzle game modes (2026-10-23): three aligned buttons show normal unique solves, the Time attack record, and the Knockout record. Time attack lasts three minutes with three lives; Knockout has one life and no timer. Both advance automatically, start with eight easy puzzles, then climb in rating without repeating positions in the run. Numbered checks/crosses show each outcome, alongside score, remaining lives and record. Records save after every solve and remain separate from normal puzzle Elo, statistics and resume. Time attack starts when the first board is ready and continues through all later moves and transitions; deadline expiry cancels pending input and replies.
- [x] Stage 4: 36 opening courses / 220 variations / 3,216 individually annotated half-moves. Every course has plans for both colors, structures, common mistakes and thematic tactics; the opening viewer supports both board orientations, variation selection, move navigation and saved study positions. The 2026-10-25 expansion gives every course at least six variations, and eight each for the Ruy Lopez and Sicilian Defense, using original annotations and the bundled CC0 opening book. The original two lines retain their indexes for saved progress.
- [x] Stage 5: Responsive themed boards, SVG piece preferences, keyboard/click/drag input, legal promotion choices, focus management, reduced motion and loading/empty/error/completion states. Keyboard, pointer, promotion, reduced-motion and saved-state regression checks cover the learning workspace.
- [x] Learning simplification (2026-10-22): Morph in place 3 is the sole presentation; all saved design choices migrate to it. The square board keeps the review's top-right corner fixed and expands by up to 10% (80 pixels), within available space, down and left on a straight 1150 ms path. The study panel stays beside the original board edge. Desktop space for Settings is always reserved, so opening it does not shift the scene.
- [x] Transition polish: animate the live review and learning panels in their original style and scroll contexts. No cloned controls or temporary copies of the Elo slider are created. Outgoing panels fade before incoming panels appear; returning during entry reverses from the board's currently painted size. The square grid owns the scale animation, avoiding a snap caused by its wider review wrapper. Reduced motion and interrupted-animation cleanup remain supported. The Chrome audit checks slider identity, appearance, values and scroll on every return frame, plus quick reversal geometry.
- [x] Direct entry into Puzzles with three tabs: Puzzles, Concepts, Openings. One “Solve a puzzle” action, a compact Elo / solved count, a single Elo track with two accessible handles, and a checklist of puzzle types under “Puzzle settings.” Adaptive pairing continues to honor the selection; progress and phase filters and the introductory dashboard are removed.
- [x] Puzzle statistics (2026-10-22): a minimal Puzzle Statistics button beside “Solve a puzzle” opens strengths, areas to practise, and clean-solve rates by puzzle type, with counts and understated progress bars. Finished attempts include repeats; mistakes, hints and skips count as needing work. Multi-theme puzzles count toward each matching type, while the overall total counts each attempt once. Highlights require three attempts per type, small samples are labelled, and untried types stay collapsed. Uses existing saved progress across all puzzle settings. Back and Escape return to puzzles with focus and filters preserved. Empty and narrow layouts are covered by the browser audit.
- [x] Board-focused puzzle solving shows “Puzzle practice,” Hint and Skip. Hints highlight the piece first, then use the configured best-move arrow; this cycle resets for each solver turn, and the first hint forfeits Elo exactly once. Legal destinations toggle off on a second click. Opponent replies wait 800 ms, then animate for 280 ms when motion is enabled. Closing during the pause cancels the pending reply and preserves a stable resume. The Flip board button, move history, text entry and instruction box are removed from puzzle practice.
- [x] Puzzle setup: all 50,000 records retain the preceding opponent move. On a fresh first attempt, show the preceding position for 450 ms, animate that move for 420 ms, then enable the solver. Input and the challenge clock wait for the introduction; it never changes Elo or solution progress. Resumed or previously attempted puzzles skip it. Missing/invalid setup data opens directly to the solver, and reduced motion applies the setup without a delay or slide.
- [x] Puzzle feedback: picked-up squares retain a translucent selection highlight in learning and review. Wrong moves use translucent red rather than the orange mistake grade. The final solver position paints before saving, eliminating a drag-origin flash. Elo stays visible throughout practice; saved gains count up over 900 ms with a subtle pulse and delta, while losses settle over 350 ms. Reduced motion updates immediately, screen readers receive the final value, and failed saves never animate uncommitted gains.
- [x] Concepts and openings use divided list rows without progress labels. Lesson mistakes/prerequisites and opening plans/structures/tactics are available in collapsed notes. Bookmarks, examples, practice and saved progress remain supported.
- [x] The review concepts panel and concept analysis default off. A one-time migration disables both for existing installs; deliberate later opt-ins remain available. The research catalog and detectors are preserved.

## Fully usable now

Puzzle practice now has a persistent player Elo, adaptive pairing, the review's wrong-answer sound, square feedback, visible rating changes and full-line progress. A first mistake costs Elo once; retries keep that loss and cannot earn it back on the same puzzle. Clean solves of new puzzles increase the rating. See [Puzzle Elo and practice](PUZZLE_RATING.md) for rating, assistance and repeat-puzzle rules and verification commands.

All published lessons, puzzles and opening courses have a complete path. No unfinished lesson pages or research-named detector variants are exposed as courses. Review scores, original game moves and the research catalog/detectors/proofs are preserved. Repeated or assisted puzzle answers do not inflate unique unaided solves. Concept recognition, exercise objectives and move quality are separate validation fields; exhausted, unavailable or unsupported proofs never become incorrect answers.

The application regression suite passes **407 tests**; all seven final content checks also pass after the instructional text review. The Chrome and Firefox smoke checks exercise both bundled engines plus real learning proof workers, opening practice as Black, hidden puzzle solutions, assisted-progress persistence and unchanged review state. `npm run test:learning-browser` checks fifteen packaged Chrome screenshots/measurements, including 320 px layouts, reduced motion, timed scoring and return to review. Engine hashes, maintained source and reachable history pass verification, and Chrome/Firefox ZIPs build locally. Packaged Firefox lint has zero errors and one existing DOM-helper warning. Repository-wide lint reports four existing research-file errors (one invalid generated JSON and three oversized evidence files), plus research/demo warnings; those research files are outside the shipped extension and are preserved.

## Content and validation limits / next optional expansion

- The 23 authored lessons cover a curated part of the large concept catalog. More advanced catalog topics still need complete instructional text, contrasting board examples and exercises with supported validators before admission. Existing provisional research is retained and is not promoted by this feature.
- The 220 opening lines teach selected important variations and model continuations, not every branch of opening theory. Some move orders intentionally transpose into another opening, as noted in the annotations. The offline book supplies names and position recognition. New families and deeper branches need original annotations, plans and legal replay checks.
- Puzzle solutions/themes come from Lichess's Stockfish puzzle pipeline. We verify admission, legal setup/continuation replay and advertised mate endings; we do not claim independent reproduction of the original 40-meganode searches. Any legal checkmate is accepted; other moves follow the supplied unique-solution convention. See `data/learning/SOURCES.md` for licensing, source-row hashes and reproducible selection.
- Local progress has no account or cross-device synchronization. This development tracker and all content/code are in Git so another computer can continue from the same repository state.

## Where to continue

- Content and course schemas: `lib/learning/content.js`
- Puzzle source records: `data/learning/puzzles.json` and `data/learning/SOURCES.md`
- Scoped validation and worker: `lib/learning/validation.js`, `lib/learning/validation-worker.js`
- Local storage and challenge clock: `lib/learning/progress.js`
- Workspace/navigation/boards: `lib/learning/workspace.js`; measured panel transitions in `lib/learning/morph.js`; review entry/lifecycle in `analysis.js`; shared styling in `styles.css`
- Regression coverage: `tests/learning-*.test.mjs`; browser audits: `scripts/learning-browser.mjs`, `scripts/browser-smoke.mjs`
- Refresh puzzles deliberately with Node 24: `node scripts/import-learning-puzzles.mjs`, then `npm test`. Do not refresh during normal startup or build.
- Reproduce packaged checks: `npm run verify:source`, `npm run verify:engines`, `npm run build`, `npm run test:browsers`, `npm run test:learning-browser`.

## Original objective (verbatim)

I want to expand Chess Review beyond reviewing games by adding a dedicated learning experience called “Learn with Chess Review.”
The current concept experience isn’t achieving what I wanted, but we’ve invested substantial work in the concept catalog, detectors, and proofs. Preserve that work and reuse the relevant parts as the foundation for interactive lessons and exercises.

1. Entry point and learning workspace
Add a “Learn with Chess Review” button at the bottom of the review layout, to the right of the backward/play/pause/forward controls and below the Engine panel.
Clicking it should open a spacious learning workspace over the existing review interface, with a polished, subtle transition. It should feel like another part of Chess Review, with enough room for a board, lesson content, and navigation.
Provide a clear “Back to review” action. Preserve the current game, selected move, board orientation, and review state so the user can return exactly where they left off.
The learning home should offer three main destinations:
- Puzzles
- Chess Concepts
- Openings
Also show useful personal progress and a “Continue learning” action for unfinished activities.

2. Chess Concepts: understand, observe, practise
Build a searchable lesson library from our existing concept catalog, organized into understandable categories such as fundamentals, tactics, mating patterns, pawn structures, positional play, defense, and endgames. Arrange lessons from introductory to advanced, with prerequisites where useful.
Use familiar chess terminology in the interface. Related detector variants should become one coherent lesson where appropriate, rather than separate lessons with technical research names.
Each lesson should include:
- A clear explanation of the concept and why it matters.
- Interactive board examples with short explanations, move navigation, and selective arrows or square highlights.
- Common mistakes and examples showing when the concept does not apply.
- Exercises where the user identifies, creates, prevents, or executes the concept.
- Helpful feedback explaining why their answer works or what they missed.
Match the exercise to the concept. A fork might require playing a move; a weak square might require selecting a square; a pawn structure might require identifying its defining features. Avoid forcing every lesson into “find the best move.”
Reuse our existing detectors and proofs to validate exercises within the exact scope they support. Check concept recognition separately from move quality and the exercise’s objective. Accept alternative valid answers when the exercise allows them. An inconclusive or unsupported validation result must not be treated as an incorrect answer.
Track lesson progress as not started, in progress, and completed, and let users revisit exercises they struggled with.

3. Puzzles: regular practice and timed challenges
Create a substantial, varied puzzle library with verified legal positions, solutions, and explanations.
Provide filters for difficulty, tactical theme, game phase, and solved/unsolved status. Allow users to practise a specific theme, play a mixed selection, or revisit previous mistakes.
Regular practice should offer hints, retries, a solution reveal, and an explanation connecting the solution to its underlying concepts. Keep engine evaluations and solution arrows hidden until appropriate.
Add three timed challenge modes:
- 1 minute
- 5 minutes
- 10 minutes
The objective is to solve as many puzzles as possible before time expires. State the rules before starting, including how mistakes, skips, and hints affect the result. Start the clock only when the first puzzle is ready, and ensure loading or validation delays do not unfairly consume time.
Afterward, show puzzles solved, mistakes, accuracy, personal best, and an option to review missed puzzles.
Persist progress locally. Distinguish unique puzzles solved, repeat completions, and assisted solutions so the totals remain meaningful.

4. Openings: learn the ideas behind the moves
Create a searchable opening library organized by opening family, variation, and playing color. Reuse our existing offline opening book where suitable, while recognizing that opening names and move sequences still need instructional content.
Each opening should provide:
- An interactive main line and selected important variations.
- Explanations of the moves, typical plans, and resulting pawn structures.
- Common mistakes and thematic tactics.
- Practice from either side, with automatic opponent replies.
- Saved study progress and optional bookmarks.
Prioritize understanding over memorization. Handle transpositions where supported, and distinguish a move outside the selected line from an objectively bad move.

5. Visual quality and interaction
Follow Chess Review’s existing typography, colors, panels, board themes, piece sets, and user preferences.
Make the experience feel premium through careful spacing, readable content, responsive boards, and consistent interaction. Use restrained animations for workspace transitions, navigation, moves, feedback, and progress updates. Respect reduced-motion preferences.
Give the board and learning content visual priority. Every visible control should work, and loading, empty, error, and completion states should receive the same care as the main screens.
6. Implementation and content quality
Build this in coherent stages, beginning with the workspace and a complete path through each destination, then expanding the libraries.
Keep lessons, puzzles, opening content, validation, and progress storage structured so we can add material without rebuilding the interface. Reuse existing chess rules, board behavior, engine infrastructure, and concept logic where appropriate.
Use original or suitably licensed content with recorded sources. Do not inflate the libraries with duplicates, unverified exercises, generic filler, or unfinished lesson pages. Report what is fully usable and what still needs content or validation.
The intended result is a learning experience where users can understand chess ideas, practise them on the board, and see their progress, all within the familiar Chess Review environment.

Please make sure to do a .md file that both saves this prompt and tracks our progress so that i can continue from other pc's in the future.
