# 2026-10-11 — bounded focused controls and exact admission reuse

After three saved smoke positives, before focused checks/pilot:
the plan's phrase 'Both candidate moves quiet noncapturing/nonpromoting' has an
ambiguous word. The already explicit per-claim gates control: both noncapturing/
nonpromoting/nonterminal; tempo has ONE checking and ONE nonchecking move; queen
placement has TWO nonchecking king moves. No gate or observed outcome changes.

Full semantic replay of identical root panels across reversed choices and result
mutations is costly despite zero search. Runtime and independent checker may
each memoize their OWN source admissions in memory only, keyed on exact ordinary
fen/history/H/panel values, with cloned immutable snapshots. Each process first
fully replays each distinct complete panel. A changed proof/history/H must miss
and independently replay/reject. Never persist an admission success, cache own
labels or share checker/runtime admission caches. New actual/alternative roles
are rederived every call. Frozen raw evidence and declared logical node cost stay
unchanged. This follows E183 exact-value admission practice.

One unmatched cheap focused context is prospectively declared: existing White
E143 root with halfmove clock49 and genuine empty history of THAT authored root,
H0. Earliest quiet source branch reaches fifty and must suppress claims, even
though the initial root is live. No invented earlier game prefix. This checks
evaluate fresh versus inspect saved equality AND visited-claim handling with a
single tiny new source panel. Retain source bindings, receipt, full result and
raw panel; subsequent runs reuse it. Max50000 source/overall cap stays fixed.
No other new source collection is needed. True threefold traversal, longer
nonempty prefixes and full historical interactions remain deferred combined
checks; fifty claim does not establish those checks.
