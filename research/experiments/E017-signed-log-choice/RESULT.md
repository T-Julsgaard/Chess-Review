# E017: signed-log choice — working record

State: planned. Development evidence; no fits or performance assessment yet.

Test whether fixed signed-log CP scaling predicts human legal choices better
than the sigmoid comparator. Both have one train-only temperature, complete
paired alternatives and identical sign-only mate handling. The new mate-position
harm guard and all other rules are frozen in [the plan](plan.md).

Next: implement/smoke-test the comparison, bind cached inputs and source bytes,
then commit the freeze before fitting. Reuse600choices/45budget pairs; no new
engine searches, human labels or consumed test targets. Current scoring is B000.
