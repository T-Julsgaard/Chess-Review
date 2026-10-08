import {runStudy} from '../../FRIEND-shared/lib.mjs';
import {explainMove} from './wedge.mjs';
import {explainMove as parent} from '../../E080-pawn-shield-defense/code/shield.mjs';
import {replay} from './replay.mjs';
import {fixtures} from './fixtures.mjs';

const dir = 'FRIEND-03-pawn-wedge', code = f => `research/experiments/${dir}/code/${f}`;
await runStudy({id: 'FRIEND-03', dir, explain: explainMove, parent, replay, fixtures,
  flagKey: 'wedgeTags', limitKey: 'maxWedgeNodes', analysisKey: 'wedgeAnalysis',
  eventId: 'pawn-wedge',
  inputs: [code('wedge.mjs'), code('replay.mjs'), code('fixtures.mjs'), code('run.mjs'), code('wedge.test.mjs'),
    'research/experiments/FRIEND-shared/lib.mjs', 'research/experiments/E080-pawn-shield-defense/code/shield.mjs',
    'research/data-policy.mjs', 'research/experiments/FRIEND-03-pawn-wedge/plan.md']});
