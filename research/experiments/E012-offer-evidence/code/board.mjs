import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
export function extract(source){
  source=source.replaceAll('\r\n','\n'); // Canonical checkout/archive line endings only.
  const first=source.indexOf('const SAC_VAL ='),last=source.indexOf('const BRILLIANT_POLICY =');
  if(first<0||last<=first)throw Error('Missing frozen board block');return source.slice(first,last);
}
export async function loadBoard(){
  const block=extract(await readFile(new URL('../../../../analysis.js',import.meta.url),'utf8')),
    context=vm.createContext({Chess}),functions=new vm.Script(block+'\n({isSacrifice,exchangeGain})').runInContext(context);
  return{...functions,blockSha256:sha256(block)};
}
