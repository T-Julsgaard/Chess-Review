import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,cp,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {privatePackagePath} from '../scripts/package-inputs.mjs';

test('recursive archive copies exclude local credentials inside allowlisted directories',async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'chess-review-package-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const source=path.join(root,'source'),target=path.join(root,'archive');
  await mkdir(path.join(source,'lib','.wrangler'),{recursive:true});
  for(const name of ['client.js','.env','.env.production','.dev.vars','.dev.vars.staging','.npmrc','private.pem','private.KEY'])await writeFile(path.join(source,'lib',name),'test-only sentinel');
  await writeFile(path.join(source,'lib','.wrangler','state.json'),'test-only sentinel');
  await cp(source,target,{recursive:true,filter:input=>!privatePackagePath(path.relative(source,input))});
  assert.deepEqual(await readdir(path.join(target,'lib')),['client.js']);
  assert.equal(privatePackagePath('lib\\.env.production'),true);
  assert.equal(privatePackagePath('services/leaderboard/wrangler.toml'),false);
});
