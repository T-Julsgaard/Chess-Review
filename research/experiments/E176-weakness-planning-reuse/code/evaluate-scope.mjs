import {explainMove as fixation} from '../../E116-center-restraint-entry/code/center.mjs';
import {explainMove as induction} from '../../E168-forced-pawn-weakness/code/weakness.mjs';
import {explainMove as secondTarget} from '../../E153-second-target-defense/code/weakness.mjs';
import {scopeFor} from './scopes.mjs';
import {inspectScope} from './inspect-scope.mjs';
// Explicit research API: enables the selected existing detector, no new events.
export function evaluateScope(id,input) {
  const s=scopeFor(id),routed={...input,[s.flag]:true};
  const result=({E116:fixation,E168:induction,E153:secondTarget})[s.origin](routed);
  return {result,decision:inspectScope(id,routed,result)};
}
