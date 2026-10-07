# E073 arithmetic correction before decisive evaluation

2026-10-07. Initial focused development suite failed one count assertion:
`Hedgehog six targets, eight named control edges and all additional legal captures`;
actual7, expected8. Other fixtures and independent six-target replay passed.
Initial protocol's eight-edge total was arithmetic error: a3->b4 (one),
b3->a4/c4 (two), d3->c4/e4 (two), e3->d4/f4 (two) totals **seven**.
Color reversal gives the same total. No off-board a-pawn capture exists.

Prospectively correct the numerical total to seven in the named-edge count test;
the extra f3/g3 pawn probe has nine legal captures rather than ten. Keep the
original PLAN unchanged and retain this failed result. Every named geometric
source for each of the same six targets must still have its legal capture;
all other legal target captures must still be retained and independently replayed.
No target/source is removed, pin/legality test waived, node/storage budget changed
or tactical/strategic claim added. Truncated target/capture sets still fail.
This corrects a mistaken aggregate prediction, not the all-required-edge gate.
Full cumulative and frozen main/repeat/clean evaluation have not begun.
