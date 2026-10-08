import {runStudy} from '../../FRIEND-shared/lib.mjs';
import {explainMove} from './symmetry.mjs';
import {explainMove as parent} from '../../E080-pawn-shield-defense/code/shield.mjs';
import {replay} from './replay.mjs';
import {fixtures} from './fixtures.mjs';

const dir = 'FRIEND-02-symmetrical-position', code = f => `research/experiments/${dir}/code/${f}`;
await runStudy({id: 'FRIEND-02', dir, explain: explainMove, parent, replay, fixtures,
  flagKey: 'symmetryTags', limitKey: 'maxSymmetryNodes', analysisKey: 'symmetryAnalysis',
  eventId: 'symmetrical-pawns',
  inputs: [code('symmetry.mjs'), code('replay.mjs'), code('fixtures.mjs'), code('run.mjs'), code('symmetry.test.mjs'),
    'research/experiments/FRIEND-shared/lib.mjs', 'research/experiments/E080-pawn-shield-defense/code/shield.mjs',
    'research/data-policy.mjs', 'research/experiments/FRIEND-02-symmetrical-position/plan.md']});
