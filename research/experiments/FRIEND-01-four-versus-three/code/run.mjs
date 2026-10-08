import {runStudy} from '../../FRIEND-shared/lib.mjs';
import {explainMove} from './fourthree.mjs';
import {explainMove as parent} from '../../E080-pawn-shield-defense/code/shield.mjs';
import {replay} from './replay.mjs';
import {fixtures} from './fixtures.mjs';

const dir = 'FRIEND-01-four-versus-three', code = f => `research/experiments/${dir}/code/${f}`;
await runStudy({id: 'FRIEND-01', dir, explain: explainMove, parent, replay, fixtures,
  flagKey: 'fourThreeTags', limitKey: 'maxFourThreeNodes', analysisKey: 'fourThreeAnalysis',
  eventId: 'four-versus-three',
  inputs: [code('fourthree.mjs'), code('replay.mjs'), code('fixtures.mjs'), code('run.mjs'), code('fourthree.test.mjs'),
    'research/experiments/FRIEND-shared/lib.mjs', 'research/experiments/E080-pawn-shield-defense/code/shield.mjs',
    'research/data-policy.mjs', 'research/experiments/FRIEND-01-four-versus-three/plan.md']});
