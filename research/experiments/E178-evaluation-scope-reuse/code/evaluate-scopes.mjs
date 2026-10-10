import {explainMove as initiative} from '../../E143-forcing-tempo-initiative/code/tempo.mjs';
import {explainMove as outpost} from '../../E174-comparative-piece-improvement/code/improvement.mjs';
import {explainMove as minor} from '../../E156-piece-objective-effectiveness/code/effectiveness.mjs';
import {groupFor} from './scopes.mjs';import {inspectScopes} from './inspect-scopes.mjs';
export function evaluateScopes(ids,input){const s=groupFor(ids),routed={...input,[s.flag]:true},result=({E143:initiative,E174:outpost,E156:minor})[s.origin](routed);return{result,decisions:inspectScopes(ids,routed,result)};}
export function evaluateScope(id,input){const {result,decisions}=evaluateScopes([id],input);return{result,decision:decisions[0]};}
