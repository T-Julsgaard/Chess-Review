// The numerical model's observations are separate from panel/Explore searches.
export async function analyseCalibratedPosition(engine, {fen, history, played, settings, calibration, needMovesOnly, onProgress}) {
  const build = engine.buildKey || settings.enginePath, sf19 = build === 'sf19lite';
  const major = sf19 ? 19 : 18;
  if (engine.identity && !new RegExp(`^Stockfish ${major}\\b`).test(engine.identity)) throw Error('Scoring engine identity differs');
  const common = {'UCI_ShowWDL': true, UCI_LimitStrength: false, UCI_Chess960: false};
  const primaryOptions = {...common, Hash: sf19 ? 32 : settings.engineHash, 'Skill Level': sf19 ? 20 : settings.engineSkill};
  await engine.setOptions(primaryOptions);
  const budget = sf19 ? {kind: 'nodes', value: 20000} : {kind: 'depth', value: settings.engineDepth};
  const lines = sf19 ? 1 : Math.max(1, settings.classifyLines || 1);
  const options = {cold: true, requireExact: true, budget};
  const root = await engine.analyse(fen, settings.engineDepth, lines, history, onProgress, options);
  if (!played) return root;
  const actual = root.bestmove === played ? root : await engine.analyse(fen, settings.engineDepth, 1, history, null, {...options, searchMove: played});
  const standardStart = history?.initialFen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const compatible = !sf19 && standardStart && settings.engineDepth === 16 && settings.engineHash === 16 && settings.engineSkill === 20 && lines === 1;
  root.playedScore = actual.score;
  root.calibration = {version: calibration.version, build, nodes: sf19 ? 20000 : null,
    qualityVersion: compatible ? calibration.quality.candidateVersion : null};
  if (sf19) root.ratingEvidence = {candidateVersion: calibration.movesOnly.sf19.candidateVersion,
    best: root.score, played: actual.score, bestmove: root.bestmove};
  else if (needMovesOnly) {
    await engine.setOptions({...common, Hash: 32, 'Skill Level': 20});
    const ratingOptions = {cold: true, requireExact: true, budget: {kind: 'nodes', value: 20000}};
    const best = await engine.analyse(fen, 16, 1, history, null, ratingOptions);
    const move = best.bestmove === played ? best : await engine.analyse(fen, 16, 1, history, null, {...ratingOptions, searchMove: played});
    root.ratingEvidence = {candidateVersion: calibration.movesOnly.sf18.candidateVersion,
      best: best.score, played: move.score, bestmove: best.bestmove};
    await engine.setOptions(primaryOptions);
  }
  return root;
}
