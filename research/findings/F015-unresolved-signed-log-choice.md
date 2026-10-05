# F015: signed-log CP utility has no resolved choice benefit

2026-10-05. Outcome: **inconclusive benefit; acceptance gates fail**.
Source: [E017](../experiments/E017-signed-log-choice/RESULT.md).
Development evidence only; no confirmation or promotion.

The candidate clips CP to +/-10000, converts to pawn values x and maps them to
`.5+sign(x)*log1p(abs(x))/(2*log(101))`. It compresses gaps as absolute position
advantage/disadvantage grows, retaining a different tail shape from the comparator
sigmoid(.368208*cp/100). Both use the same SF19 20k alternatives, one training-only
scalar temperature, sign-only mate utility and game weights. Rating is a
subgroup label, not a predictor. This is not the paper's full rating method,
an outcome calibration or a claim about displayed accuracy.

Plan `7c56836`, code/cohort freeze `ffa1396`, models `e1a2d56` and assessment
`13c4d9f` preserve the registered sequence. All twelve scalar fits converge with
independent objective/derivative checks; no upper cap. Final comparator beta
15.464491662877617; candidate 23.816457262191143.

| Fixed comparison | Games | Mean paired gain, nats | 97.5% game interval |
| --- | ---: | ---: | --- |
| Development comparator minus candidate NLL | 150 | .012107 | [-.049058,.077830] |
| Training cross-fit comparator minus candidate NLL | 450 | -.044678 | [-.109923,.013941] |
| Development uniform minus candidate NLL | 150 | 1.046681 | [.833912,1.260743] |

The development point gain misses .02 and its interval includes zero; both
primary gates fail. The cross-fit nonnegative-mean guard also fails. Complete
coverage and numerical guards pass. Five sufficiently large cross-fit groups
fail the -.05 harm guard. Eligible development groups pass but five are sparse.
These within-study intervals condition on the fitted models; prior development
looks are exposed, and no series-wide error-controlled confirmation is claimed.

The predeclared mate-position group has cross-fit gain -.380341 over 43 games
but development gain +.248287 over only 20 games, below the 30-case guard minimum.
Non-mate gains are -.009215 over 407 cross-fit games / -.024228 over 130
development games. The positive aggregate point does not establish ordinary-CP
improvement or resolved mate benefit. The contrasting signs do not attribute
effects causally or authorize a fitted subgroup rescue. No CP clips occur among
19,359 low / 1,555 high alternatives; mate counts 443/74 retain ignored distance.

Descriptive development Brier worsens .797054→.802422 and fixed five-bin
top-choice calibration error .116826→.151813. Cross-fit Brier worsens, while its
calibration error changes little (.133113→.132935). Mean budget TV is
.083789 comparator / .083407 candidate; paired reduction .000382 has interval
[-.011407,.011655]. TV<=.1 counts 28/45 / 32/45, candidate Wilson lower .566315.
No resolved stability or calibration gain follows. This budget subset includes
30 training cases; higher search budget is not human truth.

Twelve exact model refits, 600 vectors, 45 budget pairs, raw-score equations,
derivatives, fold/mate classification, every metric/guard and 40,000 bootstrap
replicates verify independently and in an external Git archive. Prefit source
representations reconstruct exact checkout bytes across newline differences.
No new searches, network, dependencies or ignored inputs enter replay.
[The archive recipe](../experiments/E017-signed-log-choice/evidence/clean-archive.json)
binds revision 13c4d9f978df24bfca1adcd93befa90e8869ac63 and SHA
2d2eb25745eae4466e684f144653f474e65e48831bb4a3307eb06b28f76546ec.

Stop this exact signed-log recipe. A different finite mixture of regular,
sharper and uniform choice probabilities would test dispersion rather than
another utility curve; it needs its own prefit protocol and no mental-state
claim. D002 remains an exposed archive-prefix Lichess blitz convenience cohort
with absent provisional status and one focal choice per game. Fresh registered
D003 is required for confirmation. No improved Elo, final rating adjustment,
displayed accuracy, human category validity or deployable latency follows.
Production scoring B000 and both pending blinded packs remain fixed.
