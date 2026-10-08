import {analyzeConcepts} from './analyze.js';
const provenance = fetch(new URL('./provenance.json', import.meta.url)).then(async response => {
  if (!response.ok) throw Error('Concept scope registry unavailable');
  return response.json();
});
self.onmessage = async ({data: {key, input}}) => {
  try {
    const {verified} = await provenance;
    const facts = analyzeConcepts(input, verified, false);
    self.postMessage({key, phase: 'facts', result: facts});
    const detailed = analyzeConcepts(input, verified, true);
    // A later failed proof attempt must not erase already validated observations.
    const findings = [...facts.findings];
    for (const f of detailed.findings) if (!findings.some(old => old.name === f.name && old.text === f.text)) findings.push(f);
    self.postMessage({key, phase: 'complete', result: {...detailed, findings, timeMs: facts.timeMs + detailed.timeMs}});
  } catch (error) {
    self.postMessage({key, phase: 'complete', result: {findings: [], issues: [], unavailable: [], errors: [error.message], timeMs: 0}});
  }
};
