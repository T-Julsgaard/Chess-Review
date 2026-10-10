import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {sha256} from '../../../data-policy.mjs';
import {normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export async function verifySourceAudit(audit,observations){assert.equal(audit.schema,'E147-supplementary-source-audit-v1');assert.equal(audit.path,'tools/calibration/engine-host.cjs');assert.match(audit.revision,/^[a-f0-9]{40}$/);assert.equal(audit.observationsSha256,sha256(observations));assert.equal(sha256(normalized(audit.path,await readFile(audit.path))),audit.sourceSha256);assert.equal(sha256(normalized(audit.path,execFileSync('git',['show',audit.revision+':'+audit.path]))),audit.sourceSha256);assert.equal(audit.method,'unchanged committed host bytes at collection revision; supplementary audit, not contemporaneous snapshot');}
