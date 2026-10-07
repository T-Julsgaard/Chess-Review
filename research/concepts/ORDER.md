# Proposed fixed order for outstanding work

This is a frozen proposal based on E074, not an instruction to resume the paused goal. Rank is deterministic: phase, shared topic family, then original ID. Every outstanding original occurrence has exactly one working row in this queue. Fully verified rows remain in [CATALOG.md](CATALOG.md). The hardest pending context controls a merged row’s phase; one easy meaning cannot silently discharge a harder obligation.

There are 690 outstanding working rows covering 729 original occurrences. Phase 6 is a separate support backlog proposed for review; no nonduplicate concept has been removed. Phase assignments are engineering judgments, not measured runtime estimates. Broad undefined concepts default to phase 5.

| Phase | Work | Rows | Why here / scope restriction |
| --- | --- | --- | --- |
| 1 | Objective board, material and pawn descriptors | 37 | Exact observable facts first; no assertion that a move or position is good. |
| 2 | Local legal relationships and simple history changes | 70 | Reuse legal move/capture sets and before/after history; distinguish geometric contact from a profitable threat. |
| 3 | Structures, maneuvers and opening history | 82 | Needs operational definitions or longer history; named opening shapes must not imply unsupported opening provenance. |
| 4 | Bounded tactical and endgame proofs | 84 | Needs quantified continuations, defensive branches or validated tablebase inputs, rather than a shape match. |
| 5 | Strategic quality, practical decisions and combined explanations | 293 | Needs comparisons, alternatives, longer horizons or usefulness evidence; broad labels stay late unless a narrower claim is prospectively justified. |
| 6 | Supporting vocabulary, interfaces, clocks and training | 124 | Retain educational scope; propose a separate support backlog rather than requiring a new board detector for each label. |

Before new detector work, audit the rows marked “reuse”: an exact repeated label already has some verified scope, while another occurrence remains partial/unimplemented. Check whether the existing proof actually covers that occurrence; reuse compatible machinery and observations, never copy checkmarks. This is an inexpensive coverage audit, not a claim that the remaining task is easy.

## Recommended first batches

1. Board/material foundation: coordinates, legal piece movement, legal/illegal move explanations, nominal material and imbalance. Reuse the existing legal-move implementation; illegal-move coaching requires a user-input path rather than legal PGN alone. Material means declared nominal inventory, not relative positional worth.
2. Pawn inventory: structure/skeleton representation, connected passers, shields/cover, wedges and open-file structure. Shared extraction, with separate positive/negative gates per claim; shape alone does not establish good king safety or a cramping advantage.
3. Local relations: alignments and direct legal attacks, center occupancy/control, line/file opening and exchange transitions. Distinguish attacks from threats, pinned pseudo-attacks and profitable captures.
4. History-dependent forms and opening structures: reuse E074’s machinery where compatible; retain historical evidence and independent negative cases for each formation. Never identify an opening solely from a similar pawn shape.
5. Exhaustive finite proofs, then broad strategic judgments and decision explanations. Some bounded endgames may be cheaper than a nominally geometric motif; estimate the registered claim before starting each batch.

A strict list is useful for planning but must respect prerequisites. If a phase-1 label requires a phase-4 strength claim, narrow the factual output explicitly or record the dependency and revise the proposal before research; do not redefine it after seeing results. The numbered queue below is an initial fixed baseline, not a license to skip difficult cases forever.

## Speed without weaker evidence

Batch concepts sharing inputs and proof machinery in one prospectively registered study, with separate acceptance gates. Reuse compatible observations only when source/input/configuration hashes match. Run focused tests during development and retain the final cumulative suite, independent proof replay and registered main/repeat/clean reproductions. Share the work across a coherent batch rather than repeating setup per vocabulary item. Keep board descriptors, verified tactical causes and advice as distinct outputs: teaching an idea does not require claiming its move was best.

Track accepted new claims per study and wall-clock time; distinguish descriptors from useful explanatory detectors. No percentage speedup is established by this review. Easier-first ordering can improve early throughput but does not eliminate the difficult work. Duplicate-row cleanup is not equivalent to reducing experiments by 6.1%, since many duplicate occurrences already share code or are verified.

## Complete ordered proposal

| Rank | Phase | Working ID | Concept | Outstanding occurrence IDs | Existing verified context to audit |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | C0001 | Board coordinates | C0001 | No verified occurrence in this exact row |
| 2 | 1 | C0002 | Piece movement | C0002 | No verified occurrence in this exact row |
| 3 | 1 | C0016 | Legal move | C0016 | No verified occurrence in this exact row |
| 4 | 1 | C0017 | Illegal move | C0017 | No verified occurrence in this exact row |
| 5 | 1 | C0020 | Material | C0020 | No verified occurrence in this exact row |
| 6 | 1 | C0030 | Material balance | C0030 | No verified occurrence in this exact row |
| 7 | 1 | C0031 | Material imbalance | C0031 | No verified occurrence in this exact row |
| 8 | 1 | C0547 | Material | C0547 | No verified occurrence in this exact row |
| 9 | 1 | C0552 | Pawn structure | C0552 | No verified occurrence in this exact row |
| 10 | 1 | C0880 | Material imbalance | C0880 | No verified occurrence in this exact row |
| 11 | 1 | C0882 | Bishop pair versus other minor pieces | C0882 | No verified occurrence in this exact row |
| 12 | 1 | C0883 | Rook versus two minor pieces | C0883 | No verified occurrence in this exact row |
| 13 | 1 | C0893 | Passed-pawn imbalance | C0893 | No verified occurrence in this exact row |
| 14 | 1 | C0894 | Pawn-majority imbalance | C0894 | No verified occurrence in this exact row |
| 15 | 1 | C0189 | Pawn structure | C0189 | No verified occurrence in this exact row |
| 16 | 1 | C0190 | Pawn skeleton | C0190 | No verified occurrence in this exact row |
| 17 | 1 | C0201 | Connected passed pawns | C0201 | No verified occurrence in this exact row |
| 18 | 1 | C0219 | Pawn wedge | C0219 | No verified occurrence in this exact row |
| 19 | 1 | C0226 | Pawn shield | C0226 | No verified occurrence in this exact row |
| 20 | 1 | C0259 | Open-file pawn structure | C0259 | No verified occurrence in this exact row |
| 21 | 1 | C0263 | Open rank | C0263 | No verified occurrence in this exact row |
| 22 | 1 | C0312 | Outside the pawn chain | C0312 | No verified occurrence in this exact row |
| 23 | 1 | C0320 | Bishop behind pawn chain | C0320 | No verified occurrence in this exact row |
| 24 | 1 | C0366 | Queen battery | C0366 | No verified occurrence in this exact row |
| 25 | 1 | C0384 | Central king | C0384 | No verified occurrence in this exact row |
| 26 | 1 | C0385 | King in the center | C0385 | No verified occurrence in this exact row |
| 27 | 1 | C0400 | Pawn shield | C0400 | No verified occurrence in this exact row |
| 28 | 1 | C0404 | Direct attack | C0404 | No verified occurrence in this exact row |
| 29 | 1 | C0410 | Attack on a pawn | C0410 | No verified occurrence in this exact row |
| 30 | 1 | C0411 | Attack on a piece | C0411 | No verified occurrence in this exact row |
| 31 | 1 | C0435 | Battery | C0435 | No verified occurrence in this exact row |
| 32 | 1 | C0645 | Connected passers | C0645 | No verified occurrence in this exact row |
| 33 | 1 | C0665 | Side checks | C0665 | No verified occurrence in this exact row |
| 34 | 1 | C0681 | Four versus three | C0681 | No verified occurrence in this exact row |
| 35 | 1 | C0682 | Three versus two | C0682 | No verified occurrence in this exact row |
| 36 | 1 | C0970 | Symmetrical position | C0970 | No verified occurrence in this exact row |
| 37 | 1 | C0971 | Asymmetrical position | C0971 | No verified occurrence in this exact row |
| 38 | 2 | C0057 | Double attack | C0057 | No verified occurrence in this exact row |
| 39 | 2 | C0068 | X-ray attack | C0068 | No verified occurrence in this exact row |
| 40 | 2 | C0077 | Clearance | C0077 | No verified occurrence in this exact row |
| 41 | 2 | C0078 | Line clearance | C0078 | No verified occurrence in this exact row |
| 42 | 2 | C0110 | Alignment | C0110 | No verified occurrence in this exact row |
| 43 | 2 | C0111 | King-piece alignment | C0111 | No verified occurrence in this exact row |
| 44 | 2 | C0112 | Queen-king alignment | C0112 | No verified occurrence in this exact row |
| 45 | 2 | C0113 | Rook-queen alignment | C0113 | No verified occurrence in this exact row |
| 46 | 2 | C0126 | Quiet move | C0126 | No verified occurrence in this exact row |
| 47 | 2 | C0405 | Kingside attack | C0405 | No verified occurrence in this exact row |
| 48 | 2 | C0406 | Queenside attack | C0406 | No verified occurrence in this exact row |
| 49 | 2 | C0407 | Central attack | C0407 | No verified occurrence in this exact row |
| 50 | 2 | C0408 | Attack on the king | C0408 | No verified occurrence in this exact row |
| 51 | 2 | C0412 | Attack with opposite-side castling | C0412 | No verified occurrence in this exact row |
| 52 | 2 | C0415 | Opening lines | C0415 | No verified occurrence in this exact row |
| 53 | 2 | C0417 | Destroying the pawn shield | C0417 | No verified occurrence in this exact row |
| 54 | 2 | C0430 | Dark-square attack | C0430 | No verified occurrence in this exact row |
| 55 | 2 | C0431 | Light-square attack | C0431 | No verified occurrence in this exact row |
| 56 | 2 | C0432 | Attack against f7/f2 | C0432 | No verified occurrence in this exact row |
| 57 | 2 | C0433 | Attack against h7/h2 | C0433 | No verified occurrence in this exact row |
| 58 | 2 | C0434 | Attack against g7/g2 | C0434 | No verified occurrence in this exact row |
| 59 | 2 | C0436 | Line opening | C0436 | No verified occurrence in this exact row |
| 60 | 2 | C0437 | File opening | C0437 | No verified occurrence in this exact row |
| 61 | 2 | C0442 | No escape squares | C0442 | No verified occurrence in this exact row |
| 62 | 2 | C0443 | Restricting the king | C0443 | No verified occurrence in this exact row |
| 63 | 2 | C0450 | Trading attackers | C0450 | No verified occurrence in this exact row |
| 64 | 2 | C0451 | Trading queens | C0451 | No verified occurrence in this exact row |
| 65 | 2 | C0452 | Returning material | C0452 | No verified occurrence in this exact row |
| 66 | 2 | C0453 | Giving back the exchange | C0453 | No verified occurrence in this exact row |
| 67 | 2 | C0464 | Simplification | C0464 | No verified occurrence in this exact row |
| 68 | 2 | C0473 | Liquidation into an endgame | C0473 | No verified occurrence in this exact row |
| 69 | 2 | C0933 | Underprotected piece | C0933 | No verified occurrence in this exact row |
| 70 | 2 | C0934 | Self-pin | C0934 | No verified occurrence in this exact row |
| 71 | 2 | C0172 | Pawn center | C0172 | No verified occurrence in this exact row |
| 72 | 2 | C0173 | Piece center | C0173 | No verified occurrence in this exact row |
| 73 | 2 | C0174 | Classical center | C0174 | No verified occurrence in this exact row |
| 74 | 2 | C0175 | Hypermodern center | C0175 | No verified occurrence in this exact row |
| 75 | 2 | C0176 | Open center | C0176 | No verified occurrence in this exact row |
| 76 | 2 | C0178 | Fixed center | C0178 | No verified occurrence in this exact row |
| 77 | 2 | C0183 | Maintaining tension | C0183 | No verified occurrence in this exact row |
| 78 | 2 | C0526 | Majority advance | C0526 | No verified occurrence in this exact row |
| 79 | 2 | C0527 | Kingside expansion | C0527 | No verified occurrence in this exact row |
| 80 | 2 | C0528 | Queenside expansion | C0528 | No verified occurrence in this exact row |
| 81 | 2 | C0529 | Central expansion | C0529 | No verified occurrence in this exact row |
| 82 | 2 | C0540 | Changing the pawn structure | C0540 | No verified occurrence in this exact row |
| 83 | 2 | C0753 | Gain of tempo | C0753 | No verified occurrence in this exact row |
| 84 | 2 | C0754 | Loss of tempo | C0754 | No verified occurrence in this exact row |
| 85 | 2 | C0756 | Attacking with tempo | C0756 | No verified occurrence in this exact row |
| 86 | 2 | C0757 | Tempo on the queen | C0757 | No verified occurrence in this exact row |
| 87 | 2 | C0777 | Creating escape squares | C0777 | No verified occurrence in this exact row |
| 88 | 2 | C0036 | Winning the exchange | C0036 | No verified occurrence in this exact row |
| 89 | 2 | C0213 | Pawn hole | C0213 | No verified occurrence in this exact row |
| 90 | 2 | C0266 | Weak square | C0266 | No verified occurrence in this exact row |
| 91 | 2 | C0267 | Strong square | C0267 | No verified occurrence in this exact row |
| 92 | 2 | C0337 | Knight on a protected outpost | C0337 | No verified occurrence in this exact row |
| 93 | 2 | C0349 | Rook lift | C0349 | No verified occurrence in this exact row |
| 94 | 2 | C0361 | Queen centralization | C0361, C0725 | No verified occurrence in this exact row |
| 95 | 2 | C0382 | Uncastled king | C0382 | No verified occurrence in this exact row |
| 96 | 2 | C0553 | Center control | C0553 | No verified occurrence in this exact row |
| 97 | 2 | C0602 | Endgame transition | C0602 | No verified occurrence in this exact row |
| 98 | 2 | C0604 | Centralizing the king | C0604 | No verified occurrence in this exact row |
| 99 | 2 | C0630 | Liquidation | C0630 | No verified occurrence in this exact row |
| 100 | 2 | C0631 | Endgame simplification | C0631 | No verified occurrence in this exact row |
| 101 | 2 | C0648 | Queen with check | C0648 | No verified occurrence in this exact row |
| 102 | 2 | C0650 | Spare pawn move | C0650 | No verified occurrence in this exact row |
| 103 | 2 | C0806 | Pawn move irreversibility | C0806 | No verified occurrence in this exact row |
| 104 | 2 | C0850 | Hanging a piece | C0850 | No verified occurrence in this exact row |
| 105 | 2 | C0888 | Development imbalance | C0888 | No verified occurrence in this exact row |
| 106 | 2 | C0927 | Irreversibility | C0927 | No verified occurrence in this exact row |
| 107 | 2 | C0977 | Simplified position | C0977 | No verified occurrence in this exact row |
| 108 | 3 | C0139 | Control the center | C0139 | No verified occurrence in this exact row |
| 109 | 3 | C0141 | Castle early | C0141 | No verified occurrence in this exact row |
| 110 | 3 | C0143 | Avoid unnecessary pawn moves | C0143 | No verified occurrence in this exact row |
| 111 | 3 | C0144 | Avoid repeated piece moves | C0144 | No verified occurrence in this exact row |
| 112 | 3 | C0145 | Do not bring the queen out too early | C0145 | No verified occurrence in this exact row |
| 113 | 3 | C0147 | Development advantage | C0147 | No verified occurrence in this exact row |
| 114 | 3 | C0148 | Lead in development | C0148 | No verified occurrence in this exact row |
| 115 | 3 | C0155 | Move order | C0155 | No verified occurrence in this exact row |
| 116 | 3 | C0156 | Transposition | C0156 | No verified occurrence in this exact row |
| 117 | 3 | C0160 | Gambit | C0160 | No verified occurrence in this exact row |
| 118 | 3 | C0161 | Accepted gambit | C0161 | No verified occurrence in this exact row |
| 119 | 3 | C0162 | Declined gambit | C0162 | No verified occurrence in this exact row |
| 120 | 3 | C0163 | Countergambit | C0163 | No verified occurrence in this exact row |
| 121 | 3 | C0164 | Open game | C0164 | No verified occurrence in this exact row |
| 122 | 3 | C0165 | Semi-open game | C0165 | No verified occurrence in this exact row |
| 123 | 3 | C0166 | Closed game | C0166 | No verified occurrence in this exact row |
| 124 | 3 | C0167 | Semi-closed game | C0167 | No verified occurrence in this exact row |
| 125 | 3 | C0168 | Hypermodern opening | C0168 | No verified occurrence in this exact row |
| 126 | 3 | C0169 | Classical opening | C0169 | No verified occurrence in this exact row |
| 127 | 3 | C0179 | Mobile center | C0179 | No verified occurrence in this exact row |
| 128 | 3 | C0181 | Fluid center | C0181 | No verified occurrence in this exact row |
| 129 | 3 | C0204 | Candidate passed pawn | C0204 | No verified occurrence in this exact row |
| 130 | 3 | C0205 | Backward pawn | C0205 | No verified occurrence in this exact row |
| 131 | 3 | C0211 | Pawn weakness | C0211 | No verified occurrence in this exact row |
| 132 | 3 | C0212 | Weak square | C0212 | No verified occurrence in this exact row |
| 133 | 3 | C0220 | Cramping pawn | C0220 | No verified occurrence in this exact row |
| 134 | 3 | C0225 | Pawn target | C0225 | No verified occurrence in this exact row |
| 135 | 3 | C0227 | Pawn cover | C0227 | No verified occurrence in this exact row |
| 136 | 3 | C0229 | Structural weakness | C0229 | No verified occurrence in this exact row |
| 137 | 3 | C0231 | Color-complex weakness | C0231 | No verified occurrence in this exact row |
| 138 | 3 | C0232 | Dark-square weakness | C0232 | No verified occurrence in this exact row |
| 139 | 3 | C0233 | Light-square weakness | C0233 | No verified occurrence in this exact row |
| 140 | 3 | C0241 | Caro-Kann structure | C0241 | No verified occurrence in this exact row |
| 141 | 3 | C0242 | Slav structure | C0242 | No verified occurrence in this exact row |
| 142 | 3 | C0243 | Queen's Gambit structure | C0243 | No verified occurrence in this exact row |
| 143 | 3 | C0244 | Benoni structure | C0244 | No verified occurrence in this exact row |
| 144 | 3 | C0245 | Benko structure | C0245 | No verified occurrence in this exact row |
| 145 | 3 | C0246 | King's Indian structure | C0246 | No verified occurrence in this exact row |
| 146 | 3 | C0247 | Grünfeld center | C0247 | No verified occurrence in this exact row |
| 147 | 3 | C0249 | Najdorf structure | C0249 | No verified occurrence in this exact row |
| 148 | 3 | C0250 | Dragon structure | C0250 | No verified occurrence in this exact row |
| 149 | 3 | C0251 | Closed Sicilian structure | C0251 | No verified occurrence in this exact row |
| 150 | 3 | C0252 | Botvinnik structure | C0252 | No verified occurrence in this exact row |
| 151 | 3 | C0253 | Panov structure | C0253 | No verified occurrence in this exact row |
| 152 | 3 | C0324 | Knight maneuver | C0324 | No verified occurrence in this exact row |
| 153 | 3 | C0335 | Knight rerouting | C0335 | No verified occurrence in this exact row |
| 154 | 3 | C0336 | Knight tour | C0336 | No verified occurrence in this exact row |
| 155 | 3 | C0363 | Queen infiltration | C0363 | No verified occurrence in this exact row |
| 156 | 3 | C0376 | Queen harassment | C0376 | No verified occurrence in this exact row |
| 157 | 3 | C0402 | King walk | C0402 | No verified occurrence in this exact row |
| 158 | 3 | C0414 | Piece storm | C0414 | No verified occurrence in this exact row |
| 159 | 3 | C0422 | Local superiority | C0422 | No verified occurrence in this exact row |
| 160 | 3 | C0424 | Bringing reinforcements | C0424 | No verified occurrence in this exact row |
| 161 | 3 | C0425 | Switching the attack | C0425 | No verified occurrence in this exact row |
| 162 | 3 | C0426 | Attack on both wings | C0426 | No verified occurrence in this exact row |
| 163 | 3 | C0467 | Perpetual attack | C0467 | No verified occurrence in this exact row |
| 164 | 3 | C0524 | Pawn break preparation | C0524 | No verified occurrence in this exact row |
| 165 | 3 | C0544 | Switching wings | C0544 | No verified occurrence in this exact row |
| 166 | 3 | C0585 | Development lead | C0585 | No verified occurrence in this exact row |
| 167 | 3 | C0644 | Candidate passed pawn | C0644 | No verified occurrence in this exact row |
| 168 | 3 | C0658 | Fixing pawns | C0658 | No verified occurrence in this exact row |
| 169 | 3 | C0659 | Creating entry squares | C0659 | No verified occurrence in this exact row |
| 170 | 3 | C0704 | Knight maneuvering | C0704 | No verified occurrence in this exact row |
| 171 | 3 | C0709 | Knight distance from action | C0709 | No verified occurrence in this exact row |
| 172 | 3 | C0718 | Fixing pawns on bishop's color | C0718 | No verified occurrence in this exact row |
| 173 | 3 | C0761 | Move-order trick | C0761 | No verified occurrence in this exact row |
| 174 | 3 | C0762 | Transposition | C0762 | No verified occurrence in this exact row |
| 175 | 3 | C0773 | Preventing castling | C0773 | No verified occurrence in this exact row |
| 176 | 3 | C0775 | Stopping an outpost | C0775 | No verified occurrence in this exact row |
| 177 | 3 | C0856 | Unnecessary pawn move | C0856 | No verified occurrence in this exact row |
| 178 | 3 | C0862 | Pawn grabbing | C0862 | No verified occurrence in this exact row |
| 179 | 3 | C0869 | Overextension | C0869 | No verified occurrence in this exact row |
| 180 | 3 | C0886 | Pawn-structure imbalance | C0886 | No verified occurrence in this exact row |
| 181 | 3 | C0910 | Permanent weakness | C0910 | No verified occurrence in this exact row |
| 182 | 3 | C0911 | Temporary weakness | C0911 | No verified occurrence in this exact row |
| 183 | 3 | C0912 | Static weakness | C0912 | No verified occurrence in this exact row |
| 184 | 3 | C0914 | Fixation | C0914 | No verified occurrence in this exact row |
| 185 | 3 | C0916 | Inducing pawn moves | C0916 | No verified occurrence in this exact row |
| 186 | 3 | C0959 | Open position | C0959 | No verified occurrence in this exact row |
| 187 | 3 | C0960 | Closed position | C0960 | No verified occurrence in this exact row |
| 188 | 3 | C0961 | Semi-open position | C0961 | No verified occurrence in this exact row |
| 189 | 3 | C0975 | Fluid position | C0975 | No verified occurrence in this exact row |
| 190 | 4 | C0059 | Pin | C0059 | No verified occurrence in this exact row |
| 191 | 4 | C0063 | Skewer | C0063 | No verified occurrence in this exact row |
| 192 | 4 | C0091 | Permanent sacrifice | C0091 | No verified occurrence in this exact row |
| 193 | 4 | C0095 | Destroying the pawn shield | C0095 | No verified occurrence in this exact row |
| 194 | 4 | C0096 | Greek Gift sacrifice | C0096 | No verified occurrence in this exact row |
| 195 | 4 | C0104 | Hanging piece | C0104 | No verified occurrence in this exact row |
| 196 | 4 | C0105 | Loose pieces drop off | C0105 | No verified occurrence in this exact row |
| 197 | 4 | C0109 | Tactical vulnerability | C0109 | No verified occurrence in this exact row |
| 198 | 4 | C0129 | Forcing sequence | C0129 | No verified occurrence in this exact row |
| 199 | 4 | C0159 | Opening trap | C0159 | No verified occurrence in this exact row |
| 200 | 4 | C0216 | Breakthrough | C0216 | No verified occurrence in this exact row |
| 201 | 4 | C0270 | Entry square | C0270 | No verified occurrence in this exact row |
| 202 | 4 | C0271 | Penetration square | C0271 | No verified occurrence in this exact row |
| 203 | 4 | C0272 | Key square | C0272 | No verified occurrence in this exact row |
| 204 | 4 | C0273 | Critical square | C0273 | No verified occurrence in this exact row |
| 205 | 4 | C0275 | Corresponding squares | C0275 | No verified occurrence in this exact row |
| 206 | 4 | C0354 | Cutting off the king | C0354 | No verified occurrence in this exact row |
| 207 | 4 | C0392 | Corresponding squares | C0392, C0612, C0653 | No verified occurrence in this exact row |
| 208 | 4 | C0396 | King cut-off | C0396 | No verified occurrence in this exact row |
| 209 | 4 | C0458 | King evacuation | C0458 | No verified occurrence in this exact row |
| 210 | 4 | C0465 | Fortress | C0465, C0625 | No verified occurrence in this exact row |
| 211 | 4 | C0469 | Resource | C0469 | No verified occurrence in this exact row |
| 212 | 4 | C0470 | Only defense | C0470 | No verified occurrence in this exact row |
| 213 | 4 | C0471 | Defensive tactical shot | C0471 | No verified occurrence in this exact row |
| 214 | 4 | C0472 | Counter-sacrifice | C0472 | No verified occurrence in this exact row |
| 215 | 4 | C0611 | Key squares | C0611 | No verified occurrence in this exact row |
| 216 | 4 | C0614 | Zugzwang | C0614, C0652, C0766 | No verified occurrence in this exact row |
| 217 | 4 | C0615 | Mutual zugzwang | C0615, C0767 | No verified occurrence in this exact row |
| 218 | 4 | C0617 | Tempo move | C0617 | No verified occurrence in this exact row |
| 219 | 4 | C0618 | Breakthrough | C0618 | No verified occurrence in this exact row |
| 220 | 4 | C0620 | Counting tempi | C0620 | No verified occurrence in this exact row |
| 221 | 4 | C0629 | Converting an extra pawn | C0629 | No verified occurrence in this exact row |
| 222 | 4 | C0634 | Key-square theory | C0634 | No verified occurrence in this exact row |
| 223 | 4 | C0641 | Pawn breakthrough | C0641 | No verified occurrence in this exact row |
| 224 | 4 | C0647 | Promotion race | C0647 | No verified occurrence in this exact row |
| 225 | 4 | C0654 | Trebuchet | C0654 | No verified occurrence in this exact row |
| 226 | 4 | C0655 | Réti maneuver | C0655 | No verified occurrence in this exact row |
| 227 | 4 | C0662 | Cutting off the enemy king | C0662 | No verified occurrence in this exact row |
| 228 | 4 | C0666 | Long-side defense | C0666 | No verified occurrence in this exact row |
| 229 | 4 | C0667 | Short-side defense | C0667 | No verified occurrence in this exact row |
| 230 | 4 | C0668 | Lucena position | C0668 | No verified occurrence in this exact row |
| 231 | 4 | C0669 | Building a bridge | C0669 | No verified occurrence in this exact row |
| 232 | 4 | C0670 | Philidor position | C0670 | No verified occurrence in this exact row |
| 233 | 4 | C0671 | Vancura defense | C0671 | No verified occurrence in this exact row |
| 234 | 4 | C0679 | Rook sacrifice for a pawn | C0679 | No verified occurrence in this exact row |
| 235 | 4 | C0680 | Rook endgame pawn races | C0680 | No verified occurrence in this exact row |
| 236 | 4 | C0683 | Outside passed pawn in rook endings | C0683 | No verified occurrence in this exact row |
| 237 | 4 | C0694 | Bishop sacrifice for pawns | C0694 | No verified occurrence in this exact row |
| 238 | 4 | C0703 | Knight fork in endgames | C0703 | No verified occurrence in this exact row |
| 239 | 4 | C0705 | Knight versus outside passed pawn | C0705 | No verified occurrence in this exact row |
| 240 | 4 | C0708 | Knight inability to lose a tempo easily | C0708 | No verified occurrence in this exact row |
| 241 | 4 | C0726 | Passed-pawn checks | C0726 | No verified occurrence in this exact row |
| 242 | 4 | C0729 | Queen race | C0729 | No verified occurrence in this exact row |
| 243 | 4 | C0735 | Perpetual-check fortress | C0735 | No verified occurrence in this exact row |
| 244 | 4 | C0738 | Rook versus bishop | C0738 | No verified occurrence in this exact row |
| 245 | 4 | C0739 | Rook versus knight | C0739 | No verified occurrence in this exact row |
| 246 | 4 | C0746 | Fortress construction | C0746 | No verified occurrence in this exact row |
| 247 | 4 | C0747 | Tablebase position | C0747 | No verified occurrence in this exact row |
| 248 | 4 | C0748 | Tablebase win | C0748 | No verified occurrence in this exact row |
| 249 | 4 | C0749 | Tablebase draw | C0749 | No verified occurrence in this exact row |
| 250 | 4 | C0750 | Distance to mate | C0750 | No verified occurrence in this exact row |
| 251 | 4 | C0751 | Distance to zeroing move | C0751 | No verified occurrence in this exact row |
| 252 | 4 | C0764 | Passing move | C0764 | No verified occurrence in this exact row |
| 253 | 4 | C0769 | Forcing move order | C0769 | No verified occurrence in this exact row |
| 254 | 4 | C0772 | Preventing a pawn break | C0772 | No verified occurrence in this exact row |
| 255 | 4 | C0774 | Preventing development | C0774 | No verified occurrence in this exact row |
| 256 | 4 | C0778 | Preventing a tactical motif | C0778 | No verified occurrence in this exact row |
| 257 | 4 | C0780 | Preventing penetration | C0780 | No verified occurrence in this exact row |
| 258 | 4 | C0783 | Restraining a passed pawn | C0783 | No verified occurrence in this exact row |
| 259 | 4 | C0851 | Missing a tactic | C0851 | No verified occurrence in this exact row |
| 260 | 4 | C0853 | Ignoring the opponent's threat | C0853 | No verified occurrence in this exact row |
| 261 | 4 | C0878 | Entering a lost pawn ending | C0878 | No verified occurrence in this exact row |
| 262 | 4 | C0929 | Geometric tactics | C0929 | No verified occurrence in this exact row |
| 263 | 4 | C0930 | Line tactics | C0930 | No verified occurrence in this exact row |
| 264 | 4 | C0931 | Alignment tactics | C0931 | No verified occurrence in this exact row |
| 265 | 4 | C0944 | Trapping combination | C0944 | No verified occurrence in this exact row |
| 266 | 4 | C0949 | Perpetual-check tactic | C0949 | No verified occurrence in this exact row |
| 267 | 4 | C0950 | Fortress tactic | C0950 | No verified occurrence in this exact row |
| 268 | 4 | C0951 | Tactical liquidation | C0951 | No verified occurrence in this exact row |
| 269 | 4 | C0956 | Tactical retreat | C0956 | No verified occurrence in this exact row |
| 270 | 4 | C0957 | Counter-combination | C0957 | No verified occurrence in this exact row |
| 271 | 4 | C0958 | Defensive combination | C0958 | No verified occurrence in this exact row |
| 272 | 4 | C0982 | Fortress position | C0982 | No verified occurrence in this exact row |
| 273 | 4 | C0983 | Zugzwang position | C0983 | No verified occurrence in this exact row |
| 274 | 5 | C0021 | Tempo | C0021 | No verified occurrence in this exact row |
| 275 | 5 | C0022 | Initiative | C0022 | No verified occurrence in this exact row |
| 276 | 5 | C0025 | King safety | C0025 | No verified occurrence in this exact row |
| 277 | 5 | C0026 | Piece activity | C0026 | No verified occurrence in this exact row |
| 278 | 5 | C0028 | Coordination | C0028 | No verified occurrence in this exact row |
| 279 | 5 | C0029 | Harmony | C0029 | No verified occurrence in this exact row |
| 280 | 5 | C0032 | Relative piece value | C0032 | No verified occurrence in this exact row |
| 281 | 5 | C0033 | Absolute versus relative value | C0033 | No verified occurrence in this exact row |
| 282 | 5 | C0038 | Quality of pieces | C0038 | No verified occurrence in this exact row |
| 283 | 5 | C0039 | Good trade | C0039 | No verified occurrence in this exact row |
| 284 | 5 | C0040 | Bad trade | C0040 | No verified occurrence in this exact row |
| 285 | 5 | C0044 | Mass exchanges | C0044 | No verified occurrence in this exact row |
| 286 | 5 | C0045 | Trading when ahead | C0045 | No verified occurrence in this exact row |
| 287 | 5 | C0046 | Keeping pieces when behind | C0046 | No verified occurrence in this exact row |
| 288 | 5 | C0050 | Favorable transformation | C0050 | No verified occurrence in this exact row |
| 289 | 5 | C0092 | Positional sacrifice | C0092 | No verified occurrence in this exact row |
| 290 | 5 | C0114 | Candidate moves | C0114 | No verified occurrence in this exact row |
| 291 | 5 | C0116 | Checks-captures-threats method | C0116 | No verified occurrence in this exact row |
| 292 | 5 | C0117 | Calculation tree | C0117 | No verified occurrence in this exact row |
| 293 | 5 | C0118 | Principal variation | C0118 | No verified occurrence in this exact row |
| 294 | 5 | C0123 | Move ordering | C0123 | No verified occurrence in this exact row |
| 295 | 5 | C0124 | Calculation depth | C0124 | No verified occurrence in this exact row |
| 296 | 5 | C0125 | Calculation breadth | C0125 | No verified occurrence in this exact row |
| 297 | 5 | C0130 | Critical position | C0130 | No verified occurrence in this exact row |
| 298 | 5 | C0131 | Critical moment | C0131 | No verified occurrence in this exact row |
| 299 | 5 | C0132 | Stopping point | C0132 | No verified occurrence in this exact row |
| 300 | 5 | C0133 | Final-position evaluation | C0133 | No verified occurrence in this exact row |
| 301 | 5 | C0134 | Blunder check | C0134 | No verified occurrence in this exact row |
| 302 | 5 | C0135 | Opponent's best response | C0135 | No verified occurrence in this exact row |
| 303 | 5 | C0136 | Backward calculation | C0136 | No verified occurrence in this exact row |
| 304 | 5 | C0137 | Elimination method | C0137 | No verified occurrence in this exact row |
| 305 | 5 | C0138 | Comparison of candidates | C0138 | No verified occurrence in this exact row |
| 306 | 5 | C0149 | Opening initiative | C0149 | No verified occurrence in this exact row |
| 307 | 5 | C0170 | Opening equalization | C0170 | No verified occurrence in this exact row |
| 308 | 5 | C0171 | Opening advantage | C0171 | No verified occurrence in this exact row |
| 309 | 5 | C0180 | Dynamic center | C0180 | No verified occurrence in this exact row |
| 310 | 5 | C0187 | Overextended center | C0187 | No verified occurrence in this exact row |
| 311 | 5 | C0188 | Center collapse | C0188 | No verified occurrence in this exact row |
| 312 | 5 | C0198 | Minority attack | C0198 | No verified occurrence in this exact row |
| 313 | 5 | C0230 | Structural advantage | C0230 | No verified occurrence in this exact row |
| 314 | 5 | C0276 | Positional advantage | C0276 | No verified occurrence in this exact row |
| 315 | 5 | C0277 | Static advantage | C0277 | No verified occurrence in this exact row |
| 316 | 5 | C0278 | Dynamic advantage | C0278 | No verified occurrence in this exact row |
| 317 | 5 | C0279 | Compensation | C0279 | No verified occurrence in this exact row |
| 318 | 5 | C0280 | Long-term compensation | C0280 | No verified occurrence in this exact row |
| 319 | 5 | C0281 | Temporary compensation | C0281 | No verified occurrence in this exact row |
| 320 | 5 | C0282 | Improving the worst-placed piece | C0282 | No verified occurrence in this exact row |
| 321 | 5 | C0284 | Prophylaxis | C0284 | No verified occurrence in this exact row |
| 322 | 5 | C0285 | Preventive move | C0285 | No verified occurrence in this exact row |
| 323 | 5 | C0286 | Accumulation of advantages | C0286 | No verified occurrence in this exact row |
| 324 | 5 | C0287 | Two weaknesses principle | C0287 | No verified occurrence in this exact row |
| 325 | 5 | C0288 | Multiple weaknesses | C0288 | No verified occurrence in this exact row |
| 326 | 5 | C0289 | Space advantage | C0289 | No verified occurrence in this exact row |
| 327 | 5 | C0290 | Space disadvantage | C0290 | No verified occurrence in this exact row |
| 328 | 5 | C0291 | Cramped position | C0291 | No verified occurrence in this exact row |
| 329 | 5 | C0292 | Piece improvement | C0292 | No verified occurrence in this exact row |
| 330 | 5 | C0293 | Piece optimization | C0293 | No verified occurrence in this exact row |
| 331 | 5 | C0294 | Maneuvering | C0294 | No verified occurrence in this exact row |
| 332 | 5 | C0295 | Regrouping | C0295 | No verified occurrence in this exact row |
| 333 | 5 | C0296 | Re-routing | C0296 | No verified occurrence in this exact row |
| 334 | 5 | C0297 | Transformation of advantages | C0297 | No verified occurrence in this exact row |
| 335 | 5 | C0298 | Conversion | C0298 | No verified occurrence in this exact row |
| 336 | 5 | C0299 | Consolidation | C0299 | No verified occurrence in this exact row |
| 337 | 5 | C0300 | Strategic trade | C0300 | No verified occurrence in this exact row |
| 338 | 5 | C0301 | Good piece versus bad piece | C0301 | No verified occurrence in this exact row |
| 339 | 5 | C0303 | Bind | C0303 | No verified occurrence in this exact row |
| 340 | 5 | C0304 | Restriction before attack | C0304 | No verified occurrence in this exact row |
| 341 | 5 | C0305 | Multi-purpose move | C0305 | No verified occurrence in this exact row |
| 342 | 5 | C0307 | Two bishops advantage | C0307 | No verified occurrence in this exact row |
| 343 | 5 | C0310 | Active bishop | C0310 | No verified occurrence in this exact row |
| 344 | 5 | C0311 | Passive bishop | C0311 | No verified occurrence in this exact row |
| 345 | 5 | C0318 | Bishop versus knight | C0318 | No verified occurrence in this exact row |
| 346 | 5 | C0319 | Bishop in open position | C0319 | No verified occurrence in this exact row |
| 347 | 5 | C0321 | Knight outpost | C0321, C0701 | No verified occurrence in this exact row |
| 348 | 5 | C0327 | Knight versus bishop | C0327 | No verified occurrence in this exact row |
| 349 | 5 | C0328 | Good knight | C0328 | No verified occurrence in this exact row |
| 350 | 5 | C0329 | Bad knight | C0329 | No verified occurrence in this exact row |
| 351 | 5 | C0338 | Knight versus pawns on both wings | C0338 | No verified occurrence in this exact row |
| 352 | 5 | C0339 | Knight in closed position | C0339 | No verified occurrence in this exact row |
| 353 | 5 | C0352 | Rook activity | C0352 | No verified occurrence in this exact row |
| 354 | 5 | C0353 | Active rook principle | C0353 | No verified occurrence in this exact row |
| 355 | 5 | C0356 | Rook versus minor piece | C0356 | No verified occurrence in this exact row |
| 356 | 5 | C0360 | Queen activity | C0360, C0722 | No verified occurrence in this exact row |
| 357 | 5 | C0365 | Perpetual check | C0365, C0466, C0723 | No verified occurrence in this exact row |
| 358 | 5 | C0371 | Queen versus two rooks | C0371, C0884 | No verified occurrence in this exact row |
| 359 | 5 | C0372 | Queen versus rook and minor piece | C0372, C0885 | No verified occurrence in this exact row |
| 360 | 5 | C0373 | Queen and knight attack | C0373 | No verified occurrence in this exact row |
| 361 | 5 | C0374 | Queen and bishop attack | C0374 | No verified occurrence in this exact row |
| 362 | 5 | C0375 | Exposed queen | C0375 | No verified occurrence in this exact row |
| 363 | 5 | C0379 | Queen domination of weak squares | C0379 | No verified occurrence in this exact row |
| 364 | 5 | C0380 | King safety | C0380, C0548 | No verified occurrence in this exact row |
| 365 | 5 | C0383 | Exposed king | C0383 | No verified occurrence in this exact row |
| 366 | 5 | C0386 | King activation | C0386, C0603 | No verified occurrence in this exact row |
| 367 | 5 | C0397 | King hunt | C0397, C0441 | No verified occurrence in this exact row |
| 368 | 5 | C0399 | King shelter | C0399, C0732 | No verified occurrence in this exact row |
| 369 | 5 | C0403 | Attack | C0403 | No verified occurrence in this exact row |
| 370 | 5 | C0409 | Attack on a weakness | C0409 | No verified occurrence in this exact row |
| 371 | 5 | C0418 | Sacrificial attack | C0418 | No verified occurrence in this exact row |
| 372 | 5 | C0420 | Attack with material deficit | C0420 | No verified occurrence in this exact row |
| 373 | 5 | C0421 | Attack with development advantage | C0421 | No verified occurrence in this exact row |
| 374 | 5 | C0423 | Overwhelming defenders | C0423 | No verified occurrence in this exact row |
| 375 | 5 | C0427 | Creating threats | C0427 | No verified occurrence in this exact row |
| 376 | 5 | C0428 | Threat multiplication | C0428 | No verified occurrence in this exact row |
| 377 | 5 | C0429 | Forcing weaknesses | C0429 | No verified occurrence in this exact row |
| 378 | 5 | C0446 | Passive defense | C0446, C0868 | No verified occurrence in this exact row |
| 379 | 5 | C0448 | Counterplay | C0448 | No verified occurrence in this exact row |
| 380 | 5 | C0449 | Counterthreat | C0449 | No verified occurrence in this exact row |
| 381 | 5 | C0462 | Overprotection | C0462, C0782, C0899 | No verified occurrence in this exact row |
| 382 | 5 | C0463 | Reinforcing a weakness | C0463 | No verified occurrence in this exact row |
| 383 | 5 | C0474 | Neutralizing the initiative | C0474 | No verified occurrence in this exact row |
| 384 | 5 | C0475 | Returning sacrificed material to end the attack | C0475 | No verified occurrence in this exact row |
| 385 | 5 | C0517 | Plan formation | C0517 | No verified occurrence in this exact row |
| 386 | 5 | C0518 | Short-term plan | C0518 | No verified occurrence in this exact row |
| 387 | 5 | C0519 | Long-term plan | C0519 | No verified occurrence in this exact row |
| 388 | 5 | C0520 | Strategic objective | C0520 | No verified occurrence in this exact row |
| 389 | 5 | C0521 | Target selection | C0521 | No verified occurrence in this exact row |
| 390 | 5 | C0522 | Weakness identification | C0522 | No verified occurrence in this exact row |
| 391 | 5 | C0523 | Piece improvement | C0523 | No verified occurrence in this exact row |
| 392 | 5 | C0525 | Minority attack | C0525 | No verified occurrence in this exact row |
| 393 | 5 | C0532 | Prophylaxis | C0532, C0770, C0902 | No verified occurrence in this exact row |
| 394 | 5 | C0533 | Creating an outpost | C0533, C0717 | No verified occurrence in this exact row |
| 395 | 5 | C0537 | Improving pawn structure | C0537 | No verified occurrence in this exact row |
| 396 | 5 | C0538 | Exchanging a bad piece | C0538 | No verified occurrence in this exact row |
| 397 | 5 | C0539 | Exchanging the opponent's good piece | C0539 | No verified occurrence in this exact row |
| 398 | 5 | C0541 | Fixing weaknesses | C0541 | No verified occurrence in this exact row |
| 399 | 5 | C0542 | Inducing weaknesses | C0542 | No verified occurrence in this exact row |
| 400 | 5 | C0543 | Creating a second weakness | C0543 | No verified occurrence in this exact row |
| 401 | 5 | C0545 | Preparing a favorable endgame | C0545 | No verified occurrence in this exact row |
| 402 | 5 | C0546 | Preventing counterplay | C0546 | No verified occurrence in this exact row |
| 403 | 5 | C0549 | Piece activity | C0549 | No verified occurrence in this exact row |
| 404 | 5 | C0554 | Initiative | C0554, C0582 | No verified occurrence in this exact row |
| 405 | 5 | C0556 | Coordination | C0556 | No verified occurrence in this exact row |
| 406 | 5 | C0557 | Weak squares | C0557 | No verified occurrence in this exact row |
| 407 | 5 | C0563 | Minor-piece quality | C0563 | No verified occurrence in this exact row |
| 408 | 5 | C0566 | Tactical opportunities | C0566 | No verified occurrence in this exact row |
| 409 | 5 | C0567 | Potential pawn breaks | C0567 | No verified occurrence in this exact row |
| 410 | 5 | C0568 | Opponent's counterplay | C0568 | No verified occurrence in this exact row |
| 411 | 5 | C0569 | Static evaluation | C0569 | No verified occurrence in this exact row |
| 412 | 5 | C0570 | Dynamic evaluation | C0570 | No verified occurrence in this exact row |
| 413 | 5 | C0571 | Equal position | C0571 | No verified occurrence in this exact row |
| 414 | 5 | C0572 | Slight advantage | C0572 | No verified occurrence in this exact row |
| 415 | 5 | C0573 | Clear advantage | C0573 | No verified occurrence in this exact row |
| 416 | 5 | C0574 | Winning position | C0574, C0978 | No verified occurrence in this exact row |
| 417 | 5 | C0575 | Losing position | C0575 | No verified occurrence in this exact row |
| 418 | 5 | C0576 | Unclear position | C0576, C0981 | No verified occurrence in this exact row |
| 419 | 5 | C0577 | Complicated position | C0577, C0976 | No verified occurrence in this exact row |
| 420 | 5 | C0578 | Sharp position | C0578, C0962 | No verified occurrence in this exact row |
| 421 | 5 | C0579 | Quiet position | C0579, C0965 | No verified occurrence in this exact row |
| 422 | 5 | C0580 | Balanced position | C0580, C0968 | No verified occurrence in this exact row |
| 423 | 5 | C0581 | Imbalanced position | C0581 | No verified occurrence in this exact row |
| 424 | 5 | C0583 | Momentum | C0583 | No verified occurrence in this exact row |
| 425 | 5 | C0584 | Tempo | C0584, C0752 | No verified occurrence in this exact row |
| 426 | 5 | C0586 | Forcing play | C0586 | No verified occurrence in this exact row |
| 427 | 5 | C0587 | Dynamic compensation | C0587, C0909 | No verified occurrence in this exact row |
| 428 | 5 | C0588 | Activity compensation | C0588 | No verified occurrence in this exact row |
| 429 | 5 | C0589 | Time versus material | C0589 | No verified occurrence in this exact row |
| 430 | 5 | C0590 | Space versus material | C0590 | No verified occurrence in this exact row |
| 431 | 5 | C0591 | King safety versus material | C0591 | No verified occurrence in this exact row |
| 432 | 5 | C0592 | Initiative versus material | C0592 | No verified occurrence in this exact row |
| 433 | 5 | C0593 | Sacrificial initiative | C0593 | No verified occurrence in this exact row |
| 434 | 5 | C0594 | Maintaining pressure | C0594 | No verified occurrence in this exact row |
| 435 | 5 | C0595 | Losing the initiative | C0595 | No verified occurrence in this exact row |
| 436 | 5 | C0596 | Seizing the initiative | C0596 | No verified occurrence in this exact row |
| 437 | 5 | C0597 | Counter-initiative | C0597 | No verified occurrence in this exact row |
| 438 | 5 | C0598 | Forcing the opponent onto the defensive | C0598 | No verified occurrence in this exact row |
| 439 | 5 | C0599 | Dynamic equilibrium | C0599 | No verified occurrence in this exact row |
| 440 | 5 | C0600 | Temporary advantage | C0600 | No verified occurrence in this exact row |
| 441 | 5 | C0601 | Permanent advantage | C0601 | No verified occurrence in this exact row |
| 442 | 5 | C0622 | Shouldering | C0622, C0639 | No verified occurrence in this exact row |
| 443 | 5 | C0623 | Outflanking | C0623, C0638 | No verified occurrence in this exact row |
| 444 | 5 | C0661 | Active rook | C0661 | No verified occurrence in this exact row |
| 445 | 5 | C0675 | Rook activity versus pawn material | C0675 | No verified occurrence in this exact row |
| 446 | 5 | C0678 | King-rook coordination | C0678 | No verified occurrence in this exact row |
| 447 | 5 | C0698 | Bishop versus pawns on both wings | C0698 | No verified occurrence in this exact row |
| 448 | 5 | C0707 | King-knight coordination | C0707 | No verified occurrence in this exact row |
| 449 | 5 | C0710 | Bishop versus knight | C0710, C0881 | No verified occurrence in this exact row |
| 450 | 5 | C0711 | Open position favors bishop | C0711 | No verified occurrence in this exact row |
| 451 | 5 | C0712 | Closed position favors knight | C0712 | No verified occurrence in this exact row |
| 452 | 5 | C0713 | Pawns on both wings favor bishop | C0713 | No verified occurrence in this exact row |
| 453 | 5 | C0714 | Fixed pawns can favor knight | C0714 | No verified occurrence in this exact row |
| 454 | 5 | C0715 | Good bishop versus bad knight | C0715 | No verified occurrence in this exact row |
| 455 | 5 | C0716 | Good knight versus bad bishop | C0716 | No verified occurrence in this exact row |
| 456 | 5 | C0721 | Bishop's long-range advantage | C0721 | No verified occurrence in this exact row |
| 457 | 5 | C0724 | King exposure | C0724 | No verified occurrence in this exact row |
| 458 | 5 | C0758 | Useful tempo | C0758 | No verified occurrence in this exact row |
| 459 | 5 | C0759 | Wasted tempo | C0759 | No verified occurrence in this exact row |
| 460 | 5 | C0768 | Move-order finesse | C0768 | No verified occurrence in this exact row |
| 461 | 5 | C0771 | Opponent's idea | C0771 | No verified occurrence in this exact row |
| 462 | 5 | C0776 | Removing counterplay | C0776 | No verified occurrence in this exact row |
| 463 | 5 | C0784 | Neutralizing a strong piece | C0784 | No verified occurrence in this exact row |
| 464 | 5 | C0785 | Preventive king move | C0785 | No verified occurrence in this exact row |
| 465 | 5 | C0786 | Preventive rook move | C0786 | No verified occurrence in this exact row |
| 466 | 5 | C0787 | Preventive queen move | C0787 | No verified occurrence in this exact row |
| 467 | 5 | C0788 | Candidate move selection | C0788 | No verified occurrence in this exact row |
| 468 | 5 | C0797 | Risk assessment | C0797 | No verified occurrence in this exact row |
| 469 | 5 | C0798 | Practical chances | C0798 | No verified occurrence in this exact row |
| 470 | 5 | C0799 | Objective evaluation | C0799 | No verified occurrence in this exact row |
| 471 | 5 | C0800 | Subjective difficulty | C0800 | No verified occurrence in this exact row |
| 472 | 5 | C0801 | Complexity | C0801 | No verified occurrence in this exact row |
| 473 | 5 | C0802 | Uncertainty | C0802 | No verified occurrence in this exact row |
| 474 | 5 | C0803 | Critical decision | C0803 | No verified occurrence in this exact row |
| 475 | 5 | C0804 | Commitment | C0804, C0926 | No verified occurrence in this exact row |
| 476 | 5 | C0807 | Exchange decision | C0807 | No verified occurrence in this exact row |
| 477 | 5 | C0808 | When to simplify | C0808 | No verified occurrence in this exact row |
| 478 | 5 | C0809 | When to complicate | C0809 | No verified occurrence in this exact row |
| 479 | 5 | C0810 | When to attack | C0810 | No verified occurrence in this exact row |
| 480 | 5 | C0811 | When to defend | C0811 | No verified occurrence in this exact row |
| 481 | 5 | C0812 | When to sacrifice | C0812 | No verified occurrence in this exact row |
| 482 | 5 | C0813 | When to change the structure | C0813 | No verified occurrence in this exact row |
| 483 | 5 | C0821 | Blunder checking | C0821 | No verified occurrence in this exact row |
| 484 | 5 | C0822 | Practical move | C0822 | No verified occurrence in this exact row |
| 485 | 5 | C0823 | Safe move | C0823 | No verified occurrence in this exact row |
| 486 | 5 | C0824 | Complicated move | C0824 | No verified occurrence in this exact row |
| 487 | 5 | C0826 | Playing for two results | C0826 | No verified occurrence in this exact row |
| 488 | 5 | C0827 | Playing for a draw | C0827 | No verified occurrence in this exact row |
| 489 | 5 | C0828 | Playing for a win | C0828 | No verified occurrence in this exact row |
| 490 | 5 | C0829 | Creating practical problems | C0829 | No verified occurrence in this exact row |
| 491 | 5 | C0830 | Complexity management | C0830 | No verified occurrence in this exact row |
| 492 | 5 | C0831 | Risk management | C0831 | No verified occurrence in this exact row |
| 493 | 5 | C0854 | Premature attack | C0854 | No verified occurrence in this exact row |
| 494 | 5 | C0855 | Premature pawn break | C0855 | No verified occurrence in this exact row |
| 495 | 5 | C0857 | Weakening king safety | C0857 | No verified occurrence in this exact row |
| 496 | 5 | C0860 | Neglecting development | C0860 | No verified occurrence in this exact row |
| 497 | 5 | C0861 | Greed | C0861 | No verified occurrence in this exact row |
| 498 | 5 | C0863 | Automatic recapture | C0863 | No verified occurrence in this exact row |
| 499 | 5 | C0864 | Automatic exchange | C0864 | No verified occurrence in this exact row |
| 500 | 5 | C0865 | Bad simplification | C0865 | No verified occurrence in this exact row |
| 501 | 5 | C0866 | Trading an active piece | C0866 | No verified occurrence in this exact row |
| 502 | 5 | C0867 | Creating unnecessary weaknesses | C0867 | No verified occurrence in this exact row |
| 503 | 5 | C0877 | Misjudging an endgame | C0877 | No verified occurrence in this exact row |
| 504 | 5 | C0879 | Ignoring counterplay | C0879 | No verified occurrence in this exact row |
| 505 | 5 | C0887 | Space imbalance | C0887 | No verified occurrence in this exact row |
| 506 | 5 | C0889 | King-safety imbalance | C0889 | No verified occurrence in this exact row |
| 507 | 5 | C0890 | Initiative imbalance | C0890 | No verified occurrence in this exact row |
| 508 | 5 | C0891 | Activity imbalance | C0891 | No verified occurrence in this exact row |
| 509 | 5 | C0892 | Weak-square imbalance | C0892 | No verified occurrence in this exact row |
| 510 | 5 | C0895 | Color-complex imbalance | C0895 | No verified occurrence in this exact row |
| 511 | 5 | C0896 | Good-piece/bad-piece imbalance | C0896 | No verified occurrence in this exact row |
| 512 | 5 | C0897 | Static versus dynamic advantage | C0897 | No verified occurrence in this exact row |
| 513 | 5 | C0898 | Principle of two weaknesses | C0898 | No verified occurrence in this exact row |
| 514 | 5 | C0904 | Maximal piece activity | C0904 | No verified occurrence in this exact row |
| 515 | 5 | C0905 | Transformation of advantages | C0905 | No verified occurrence in this exact row |
| 516 | 5 | C0906 | Accumulation of small advantages | C0906 | No verified occurrence in this exact row |
| 517 | 5 | C0907 | Strategic exchange sacrifice | C0907 | No verified occurrence in this exact row |
| 518 | 5 | C0908 | Positional pawn sacrifice | C0908 | No verified occurrence in this exact row |
| 519 | 5 | C0913 | Weakness creation | C0913 | No verified occurrence in this exact row |
| 520 | 5 | C0915 | Provocation | C0915 | No verified occurrence in this exact row |
| 521 | 5 | C0917 | Changing the character of the position | C0917 | No verified occurrence in this exact row |
| 522 | 5 | C0918 | Good version versus bad version of a structure | C0918 | No verified occurrence in this exact row |
| 523 | 5 | C0919 | Favorable minor-piece imbalance | C0919 | No verified occurrence in this exact row |
| 524 | 5 | C0920 | Improving before attacking | C0920 | No verified occurrence in this exact row |
| 525 | 5 | C0921 | Restricting before breaking through | C0921 | No verified occurrence in this exact row |
| 526 | 5 | C0922 | Creating multiple fronts | C0922 | No verified occurrence in this exact row |
| 527 | 5 | C0923 | Switching the point of attack | C0923 | No verified occurrence in this exact row |
| 528 | 5 | C0924 | Maximum tension | C0924 | No verified occurrence in this exact row |
| 529 | 5 | C0925 | Keeping flexibility | C0925 | No verified occurrence in this exact row |
| 530 | 5 | C0928 | Pawn structure determines plans | C0928 | No verified occurrence in this exact row |
| 531 | 5 | C0963 | Tactical position | C0963 | No verified occurrence in this exact row |
| 532 | 5 | C0964 | Positional position | C0964 | No verified occurrence in this exact row |
| 533 | 5 | C0966 | Dynamic position | C0966 | No verified occurrence in this exact row |
| 534 | 5 | C0967 | Static position | C0967 | No verified occurrence in this exact row |
| 535 | 5 | C0969 | Unbalanced position | C0969 | No verified occurrence in this exact row |
| 536 | 5 | C0972 | Cramped position | C0972 | No verified occurrence in this exact row |
| 537 | 5 | C0973 | Spacious position | C0973 | No verified occurrence in this exact row |
| 538 | 5 | C0979 | Lost position | C0979 | No verified occurrence in this exact row |
| 539 | 5 | C0984 | Critical position | C0984 | No verified occurrence in this exact row |
| 540 | 5 | C1059 | What does the opponent want? | C1059 | No verified occurrence in this exact row |
| 541 | 5 | C1060 | What changed after the last move? | C1060 | No verified occurrence in this exact row |
| 542 | 5 | C1061 | Are there checks, captures, or threats? | C1061 | No verified occurrence in this exact row |
| 543 | 5 | C1062 | Which pieces are undefended? | C1062 | No verified occurrence in this exact row |
| 544 | 5 | C1063 | Which pieces are badly placed? | C1063 | No verified occurrence in this exact row |
| 545 | 5 | C1064 | What is my worst piece? | C1064 | No verified occurrence in this exact row |
| 546 | 5 | C1065 | What is my opponent's best piece? | C1065 | No verified occurrence in this exact row |
| 547 | 5 | C1066 | Where are the weak squares? | C1066 | No verified occurrence in this exact row |
| 548 | 5 | C1067 | Where are the pawn breaks? | C1067 | No verified occurrence in this exact row |
| 549 | 5 | C1068 | Who benefits from exchanges? | C1068 | No verified occurrence in this exact row |
| 550 | 5 | C1069 | Who benefits from an open position? | C1069 | No verified occurrence in this exact row |
| 551 | 5 | C1070 | Who benefits from a closed position? | C1070 | No verified occurrence in this exact row |
| 552 | 5 | C1071 | Whose king is weaker? | C1071 | No verified occurrence in this exact row |
| 553 | 5 | C1072 | Who has more space? | C1072 | No verified occurrence in this exact row |
| 554 | 5 | C1073 | Who has the initiative? | C1073 | No verified occurrence in this exact row |
| 555 | 5 | C1074 | What are the long-term weaknesses? | C1074 | No verified occurrence in this exact row |
| 556 | 5 | C1075 | What are the temporary advantages? | C1075 | No verified occurrence in this exact row |
| 557 | 5 | C1076 | Can a temporary advantage be converted before it disappears? | C1076 | No verified occurrence in this exact row |
| 558 | 5 | C1077 | Can one advantage be transformed into another? | C1077 | No verified occurrence in this exact row |
| 559 | 5 | C1078 | Can counterplay be eliminated before trying to win? | C1078 | No verified occurrence in this exact row |
| 560 | 5 | C1079 | Can a second weakness be created? | C1079 | No verified occurrence in this exact row |
| 561 | 5 | C1080 | What is the correct moment to change the pawn structure? | C1080 | No verified occurrence in this exact row |
| 562 | 5 | C1081 | What is the correct moment to simplify? | C1081 | No verified occurrence in this exact row |
| 563 | 5 | C1082 | What is the correct moment to sacrifice? | C1082 | No verified occurrence in this exact row |
| 564 | 5 | C1083 | What is the opponent's strongest defensive resource? | C1083 | No verified occurrence in this exact row |
| 565 | 5 | C1084 | What would I play if it were the opponent's turn? | C1084 | No verified occurrence in this exact row |
| 566 | 5 | C1085 | What is the position asking for? | C1085 | No verified occurrence in this exact row |
| 567 | 6 | C0018 | Touch-move rule | C0018 | No verified occurrence in this exact row |
| 568 | 6 | C0019 | Checkmate versus resignation | C0019 | No verified occurrence in this exact row |
| 569 | 6 | C0119 | Visualization | C0119 | No verified occurrence in this exact row |
| 570 | 6 | C0120 | Board vision | C0120 | No verified occurrence in this exact row |
| 571 | 6 | C0121 | Tactical vision | C0121 | No verified occurrence in this exact row |
| 572 | 6 | C0122 | Pattern recognition | C0122 | No verified occurrence in this exact row |
| 573 | 6 | C0150 | Opening theory | C0150 | No verified occurrence in this exact row |
| 574 | 6 | C0151 | Main line | C0151 | No verified occurrence in this exact row |
| 575 | 6 | C0152 | Sideline | C0152 | No verified occurrence in this exact row |
| 576 | 6 | C0153 | Novelty | C0153 | No verified occurrence in this exact row |
| 577 | 6 | C0154 | Preparation | C0154 | No verified occurrence in this exact row |
| 578 | 6 | C0157 | Opening repertoire | C0157 | No verified occurrence in this exact row |
| 579 | 6 | C0158 | Repertoire depth | C0158 | No verified occurrence in this exact row |
| 580 | 6 | C0789 | Calculation | C0789 | No verified occurrence in this exact row |
| 581 | 6 | C0790 | Evaluation | C0790 | No verified occurrence in this exact row |
| 582 | 6 | C0791 | Comparison | C0791 | No verified occurrence in this exact row |
| 583 | 6 | C0792 | Planning | C0792 | No verified occurrence in this exact row |
| 584 | 6 | C0793 | Pattern recognition | C0793 | No verified occurrence in this exact row |
| 585 | 6 | C0794 | Intuition | C0794 | No verified occurrence in this exact row |
| 586 | 6 | C0795 | Positional judgment | C0795 | No verified occurrence in this exact row |
| 587 | 6 | C0796 | Tactical awareness | C0796 | No verified occurrence in this exact row |
| 588 | 6 | C0814 | Time management | C0814 | No verified occurrence in this exact row |
| 589 | 6 | C0815 | Clock awareness | C0815 | No verified occurrence in this exact row |
| 590 | 6 | C0816 | Time trouble | C0816 | No verified occurrence in this exact row |
| 591 | 6 | C0817 | Zeitnot | C0817 | No verified occurrence in this exact row |
| 592 | 6 | C0818 | Increment | C0818, C1039 | No verified occurrence in this exact row |
| 593 | 6 | C0819 | Delay | C0819, C1040 | No verified occurrence in this exact row |
| 594 | 6 | C0820 | Thinking on the opponent's time | C0820 | No verified occurrence in this exact row |
| 595 | 6 | C0832 | Psychological pressure | C0832 | No verified occurrence in this exact row |
| 596 | 6 | C0833 | Opening preparation | C0833 | No verified occurrence in this exact row |
| 597 | 6 | C0834 | Opponent preparation | C0834 | No verified occurrence in this exact row |
| 598 | 6 | C0835 | Post-game analysis | C0835 | No verified occurrence in this exact row |
| 599 | 6 | C0836 | Self-analysis | C0836 | No verified occurrence in this exact row |
| 600 | 6 | C0837 | Engine analysis | C0837 | No verified occurrence in this exact row |
| 601 | 6 | C0838 | Game annotation | C0838 | No verified occurrence in this exact row |
| 602 | 6 | C0839 | Error classification | C0839 | No verified occurrence in this exact row |
| 603 | 6 | C0840 | Pattern training | C0840 | No verified occurrence in this exact row |
| 604 | 6 | C0841 | Tactical training | C0841 | No verified occurrence in this exact row |
| 605 | 6 | C0842 | Calculation training | C0842 | No verified occurrence in this exact row |
| 606 | 6 | C0843 | Endgame training | C0843 | No verified occurrence in this exact row |
| 607 | 6 | C0844 | Opening study | C0844 | No verified occurrence in this exact row |
| 608 | 6 | C0845 | Model games | C0845 | No verified occurrence in this exact row |
| 609 | 6 | C0846 | Guess-the-move training | C0846 | No verified occurrence in this exact row |
| 610 | 6 | C0847 | Blunder | C0847 | No verified occurrence in this exact row |
| 611 | 6 | C0848 | Mistake | C0848 | No verified occurrence in this exact row |
| 612 | 6 | C0849 | Inaccuracy | C0849 | No verified occurrence in this exact row |
| 613 | 6 | C0870 | Overconfidence | C0870 | No verified occurrence in this exact row |
| 614 | 6 | C0871 | Playing too quickly | C0871 | No verified occurrence in this exact row |
| 615 | 6 | C0872 | Using too much time | C0872 | No verified occurrence in this exact row |
| 616 | 6 | C0873 | Tunnel vision | C0873 | No verified occurrence in this exact row |
| 617 | 6 | C0874 | Hope chess | C0874 | No verified occurrence in this exact row |
| 618 | 6 | C0875 | Stopping calculation too early | C0875 | No verified occurrence in this exact row |
| 619 | 6 | C0876 | Failing to calculate the opponent's best defense | C0876 | No verified occurrence in this exact row |
| 620 | 6 | C0985 | Algebraic notation | C0985 | No verified occurrence in this exact row |
| 621 | 6 | C0986 | Descriptive notation | C0986 | No verified occurrence in this exact row |
| 622 | 6 | C0987 | SAN | C0987 | No verified occurrence in this exact row |
| 623 | 6 | C0988 | PGN | C0988 | No verified occurrence in this exact row |
| 624 | 6 | C0989 | FEN | C0989 | No verified occurrence in this exact row |
| 625 | 6 | C0990 | Move number | C0990 | No verified occurrence in this exact row |
| 626 | 6 | C0991 | Variation | C0991 | No verified occurrence in this exact row |
| 627 | 6 | C0992 | Main line | C0992 | No verified occurrence in this exact row |
| 628 | 6 | C0993 | Side variation | C0993 | No verified occurrence in this exact row |
| 629 | 6 | C0994 | Annotation | C0994 | No verified occurrence in this exact row |
| 630 | 6 | C0995 | ! | C0995 | No verified occurrence in this exact row |
| 631 | 6 | C0996 | !! | C0996 | No verified occurrence in this exact row |
| 632 | 6 | C0997 | ? | C0997 | No verified occurrence in this exact row |
| 633 | 6 | C0998 | ?? | C0998 | No verified occurrence in this exact row |
| 634 | 6 | C0999 | !? | C0999 | No verified occurrence in this exact row |
| 635 | 6 | C1000 | ?! | C1000 | No verified occurrence in this exact row |
| 636 | 6 | C1001 | += | C1001 | No verified occurrence in this exact row |
| 637 | 6 | C1002 | =+ | C1002 | No verified occurrence in this exact row |
| 638 | 6 | C1003 | ± | C1003 | No verified occurrence in this exact row |
| 639 | 6 | C1004 | ∓ | C1004 | No verified occurrence in this exact row |
| 640 | 6 | C1005 | = | C1005 | No verified occurrence in this exact row |
| 641 | 6 | C1006 | ∞ | C1006 | No verified occurrence in this exact row |
| 642 | 6 | C1007 | Mating evaluation | C1007 | No verified occurrence in this exact row |
| 643 | 6 | C1008 | Centipawn evaluation | C1008 | No verified occurrence in this exact row |
| 644 | 6 | C1009 | Engine evaluation | C1009 | No verified occurrence in this exact row |
| 645 | 6 | C1010 | Depth | C1010 | No verified occurrence in this exact row |
| 646 | 6 | C1011 | Principal variation | C1011, C1018 | No verified occurrence in this exact row |
| 647 | 6 | C1012 | Chess engine | C1012 | No verified occurrence in this exact row |
| 648 | 6 | C1013 | Evaluation function | C1013 | No verified occurrence in this exact row |
| 649 | 6 | C1014 | Centipawn | C1014 | No verified occurrence in this exact row |
| 650 | 6 | C1015 | Search depth | C1015 | No verified occurrence in this exact row |
| 651 | 6 | C1016 | Nodes | C1016 | No verified occurrence in this exact row |
| 652 | 6 | C1017 | Nodes per second | C1017 | No verified occurrence in this exact row |
| 653 | 6 | C1019 | Engine line | C1019 | No verified occurrence in this exact row |
| 654 | 6 | C1020 | Multi-PV | C1020 | No verified occurrence in this exact row |
| 655 | 6 | C1021 | Opening book | C1021 | No verified occurrence in this exact row |
| 656 | 6 | C1022 | Endgame tablebase | C1022 | No verified occurrence in this exact row |
| 657 | 6 | C1023 | Syzygy tablebases | C1023 | No verified occurrence in this exact row |
| 658 | 6 | C1024 | Mate search | C1024 | No verified occurrence in this exact row |
| 659 | 6 | C1025 | Engine tactical analysis | C1025 | No verified occurrence in this exact row |
| 660 | 6 | C1026 | Engine positional evaluation | C1026 | No verified occurrence in this exact row |
| 661 | 6 | C1027 | Human versus engine move | C1027 | No verified occurrence in this exact row |
| 662 | 6 | C1028 | Top engine move | C1028 | No verified occurrence in this exact row |
| 663 | 6 | C1029 | Evaluation swing | C1029 | No verified occurrence in this exact row |
| 664 | 6 | C1030 | Blunder according to engine | C1030 | No verified occurrence in this exact row |
| 665 | 6 | C1031 | Accuracy | C1031 | No verified occurrence in this exact row |
| 666 | 6 | C1032 | Computer-assisted preparation | C1032 | No verified occurrence in this exact row |
| 667 | 6 | C1033 | Classical chess | C1033 | No verified occurrence in this exact row |
| 668 | 6 | C1034 | Rapid chess | C1034 | No verified occurrence in this exact row |
| 669 | 6 | C1035 | Blitz chess | C1035 | No verified occurrence in this exact row |
| 670 | 6 | C1036 | Bullet chess | C1036 | No verified occurrence in this exact row |
| 671 | 6 | C1037 | Armageddon | C1037 | No verified occurrence in this exact row |
| 672 | 6 | C1038 | Time control | C1038 | No verified occurrence in this exact row |
| 673 | 6 | C1041 | Rated game | C1041 | No verified occurrence in this exact row |
| 674 | 6 | C1042 | Unrated game | C1042 | No verified occurrence in this exact row |
| 675 | 6 | C1043 | Rating | C1043 | No verified occurrence in this exact row |
| 676 | 6 | C1044 | Elo rating | C1044 | No verified occurrence in this exact row |
| 677 | 6 | C1045 | Rating performance | C1045 | No verified occurrence in this exact row |
| 678 | 6 | C1046 | Performance rating | C1046 | No verified occurrence in this exact row |
| 679 | 6 | C1047 | Tournament | C1047 | No verified occurrence in this exact row |
| 680 | 6 | C1048 | Round robin | C1048 | No verified occurrence in this exact row |
| 681 | 6 | C1049 | Swiss system | C1049 | No verified occurrence in this exact row |
| 682 | 6 | C1050 | Knockout | C1050 | No verified occurrence in this exact row |
| 683 | 6 | C1051 | Match | C1051 | No verified occurrence in this exact row |
| 684 | 6 | C1052 | Tiebreak | C1052 | No verified occurrence in this exact row |
| 685 | 6 | C1053 | Tournament standings | C1053 | No verified occurrence in this exact row |
| 686 | 6 | C1054 | Title norms | C1054 | No verified occurrence in this exact row |
| 687 | 6 | C1055 | Candidate Master | C1055 | No verified occurrence in this exact row |
| 688 | 6 | C1056 | FIDE Master | C1056 | No verified occurrence in this exact row |
| 689 | 6 | C1057 | International Master | C1057 | No verified occurrence in this exact row |
| 690 | 6 | C1058 | Grandmaster | C1058 | No verified occurrence in this exact row |
