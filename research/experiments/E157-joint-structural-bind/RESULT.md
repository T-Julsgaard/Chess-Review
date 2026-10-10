# E157 — joint pawn-contact and piece-activity restriction

2026-10-10. Prototype, not accepted evidence. Preregistered8948ef5, parent
E1563f03b7b. Authorized current main, research-only/local commits/no push.
One provisional C0303 scope: actual quiet pawn choice versus a same-pawn
alternative leaves no live unit-safe pawn-contact break, with every lost break
traced to a maintained absolute pin, and at least two enemy pieces losing safe
destinations to the advanced pawn while ending with at most one each. General
durable bind judgment, useful pawn sacrifices and further-turn exits remain open.
This does not complete the broader strategic definition or C0300 strategic trade.

Default-disabled bindTags wraps E156 exactly. Strict bindAlternative UCI and
maxBindNodes integer0..50000 default50000; optional bindPanel independently
admitted. Genuine full history required; missing history/alternative are explicit
prerequisites. Malformed inputs/evidence reject; nonpawn/capture/promotion actual
moves withheld and checking initial choices suppress the finding. Atomic budget
exhaustion preserves parent events/comment; qualityClaim:false and <=24words.

E152 legal/profile collector extended locally, without modifying frozen sources,
to retain every enemy pawn move alongside all N/B/R/Q options, every legal actor
counterreply, all states/flags/survival, true after-position armies, contact sets
and absolute-pin rays. Full legal inventories include kings and failed options.
Original E152 deriveRoom reused unchanged for the piece-side causal criterion.
Independent verifier reconstructs every edge, promotion/EP identity, geometry,
history, terminal/claim and ledger using Chess directly. Independent witness
checker rederives both restrictions without collector/detector/derive imports.
Shared Chess rule semantics remain a limitation; integrity alone is not replay.

Pawn-contact break means legal capture of an actor pawn or quiet move adding a
geometric attack on an actor pawn. Direct rams/arbitrary pushes/existing contacts
alone do not qualify. Unit-safe requires the moved pawn or promoted piece to
survive every immediate counterreply in live states with nonempty inventory.
All sacrificial/noncontact moves remain in evidence; their value is unresolved.
Actual safe contact-break count must be0 versus >=1 after alternative. Each lost
safe break must be absent from actual legal moves, its pawn the sole blocker on
an actor-slider/enemy-king ray, alternative advanced pawn on that ray, and actual
pawn and lost break destination off it. Actual may maintain a prior pin rather
than create one. The comparison is an observed pair of genuine legal positions.

Every enemy piece safe count must not improve. At least two strictly fall to
<=1 and every lost safe option must remain legal but permit legal capture by
the actual advanced pawn on a newly controlled advanced-middle cell. Thus pin
geometry alone, aggregate mobility, one cramped piece or an unaffected available
contact break cannot establish this joint scope. Any visited claim suppresses it;
terminal/vacuous countersets cannot supply safe moves or a positive joint proof.

Corrected four-family smoke passes. White Ka1 Bg1 Pa4 Pb4 Pe2 Ph4 versus Black
Kb6 Ra8 Re8 Nc7 Ng7 Pa6 Pc5 Pe6 Ph5: actual e4 preserves Bg1/c5/Kb6 pin,
while alternative e3 blocks the ray and permits ...cxb4. Actual leaves0 safe
contact breaks versus1. Alternative ...a5 adds b4 contact but bxa5 captures its
pawn, so it is retained as non-safe. Knight c7 d5 and knight g7 f5 are safe
after e3 but e4 legally captures them after e4; each knight falls1->0 and all
piece safe totals fall13->11 without any unit improvement. Remove Bg1: break
persists despite cramped knights. Add Black Pg5: ...gxh4 remains despite pin.
Remove Re8/Pe6: both knights retain >=2 safe destinations despite pawn restriction.
All three controls withhold the joint event, in both colors.

Initial smoke's three pinned rows were refused by independent admission because
Chess.get returns no square field and collector omitted blocker identity. No-pin
control passed. AMENDMENT.md and failure-pin-metadata.json.gz retain the original
smoke/error, all four complete raw panels, original sources/hashes and receipt.
Metadata fixed by explicitly attaching the known square; no geometry, legal
query, hypothesis, threshold or gate changed. Changed collector bindings justified
a fresh tiny smoke; four corrected white panels then reused for collection,
only four reflected panels newly collected. Raw costs465/465/366/366/553/553/
466/466; wrapper adds3. No acquired games, engine or tablebase. D001-test guarded.

51focused checks pass7.8seconds plus2representative E156 parent checks. Includes
strict/disabled/history/alternative, fresh/cache identity, exact/one-short atomic
budgets, both independent restrictions, non-safe break retention, reversed choices,
genuine four-ply prefix, legal EP with victim e4, all four underpromotions with
correct promoted identity, high-clock pawn reset, discovered-mate empty profiles,
terminal root and nonpawn refusal, 20 independent raw/witness mutations, caller
admission and event metadata. No cumulative suite or lengthy reproduction ran.

Guarded14case pilot passes:2positive,8witnesses, two each missing alternative,
missing history and zero cap. Independent saved replay passes every legal panel,
both causal certificates, positive/negative admission, parent snapshots, exact
four-smoke reuse, receipt and456 normalized source/dependency hashes. Canonical
copies byte-identical to replayed run outputs and independently replayed there.
Source verification/diff checks pass. Combined cumulative/occurrence/absence/
priority/history/budget audits and exact main/repeat/initially clean reproductions
remain deferred, along with real-game precision and teaching usefulness.

Evidence bytes: observations51,174, smoke37,418, results88,390(1,583,976plain),
failure60,427, run.json65,174. Gzip artifacts237,409bytes below400KB compressed
soft target; all evidence302,583bytes. Every failed/legal branch retained
losslessly; environment, commands, null engine/seed, prereg revision, source
closure and output hashes in run.json. Replay:
node research/experiments/E157-joint-structural-bind/code/replay-saved.mjs

Accepted E082 remains378/1085(34.8%),328names,63accepted studies. Build376
provisional entries,77ready/0stale batches;754accepted-or-candidate(69.5%),
331without ready code. Production/numerical/accepted tracker/shared policy unchanged.
Full catalog remains open, including broader scopes of implemented occurrences.

Next C0300: compare a recorded equal exchange with a genuine declined-exchange
line against a positional objective, reusing complete pawn-break/activity proof
machinery where compatible. Require matched material/pawn context and retain
full position differences; neither this narrow bind nor a tactical capture
benefit alone proves general strategic exchange value or player intent.
