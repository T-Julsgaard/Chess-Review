# E086 development exposure

First focused invocation fails at fixture construction (0.4s). Original king-walk
fixture had black pawn on d1, an invalid FEN edge-row pawn. Detailed direct test
confirms Chess constructor rejection. Replace victim with black knight d1;
retain this input-generation error here, no detector/gate changes.

Second14 focused checks fails1 (4.8s): original transposition routes have the
same placement but different halfmove clocks (actual last pawn move vs comparison
last knight move). Keep original as different-counter negative. Positive routes
now both end in d2d4/d7d5 after reordering c-pawn and knight development; full-FEN
matching gate retained, no relaxation to placement-only equality.

Corrected17 E086 plus24 E085 affected checks pass8.1s. Bound displayed route to
last4squares (full path retained); final17 focused checks pass7.7s after text
change. Independent checker reconstructs identities, captures/castling/promotion,
complete legal route/evasion and both transposition histories/full rule counters;
omitted/forged states/identities/endpoints fail. No broader acceptance inference.
