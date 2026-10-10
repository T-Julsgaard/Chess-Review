import {collectPanel as frozen} from '../../E156-piece-objective-effectiveness/code/panel.mjs';
export function collectPanel(input,limit){const p=frozen(input,limit);return{...p,schema:'E161-queen-capture-panel-v1',collectionSource:'E156-single-queen-projection'};}
